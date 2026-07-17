import { and, eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getServerEnv } from "@/lib/env";
import { appointmentEvents, appointments, customers, processedStripeEvents, shops, user } from "@/lib/schema";
import { getStripeClient } from "@/lib/stripe";
import { resolveTransferContext } from "@/lib/stripe-utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = getServerEnv().STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Stripe PI IDs to cancel after the transaction commits, so we don't hold
  // DB connections open during external network calls.
  let pendingCancellations: { stripePaymentIntentId: string; shopId: string; paymentId: string }[] = [];
  let pendingDisputeEmail: {
    ownerEmail: string;
    shopName: string;
    disputeId: string;
    amount: number;
    currency: string;
    customerName: string | null;
    appointmentDate: string | null;
    stripeAccountId: string;
  } | null = null;

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(processedStripeEvents)
        .values({ id: event.id })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        return;
      }

      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;

        const shop = await tx.query.shops.findFirst({
          where: (table, { eq: whereEq }) =>
            whereEq(table.stripeAccountId, account.id),
        });

        if (!shop) {
          console.warn(
            "Received account.updated for unknown stripeAccountId",
            { stripeAccountId: account.id }
          );
          return;
        }

        if (account.charges_enabled && account.details_submitted) {
          await tx
            .update(shops)
            .set({
              stripeOnboardingStatus: "complete",
              updatedAt: new Date(),
            })
            .where(eq(shops.id, shop.id));
        } else if (!account.charges_enabled) {
          // A previously-complete account losing charges_enabled is a Stripe-side
          // suspension (compliance review, chargeback investigation, etc.) — not a
          // setup regression. Use "suspended" so the UI can show an appropriate
          // message instead of "Continue setup".
          const newStatus =
            shop.stripeOnboardingStatus === "complete" ? "suspended" : "pending";
          await tx
            .update(shops)
            .set({
              stripeOnboardingStatus: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(shops.id, shop.id));

          // Sweep: collect in-flight PaymentIntents to cancel after commit.
          // Prevents customers from completing payment with a stale clientSecret
          // that would result in a charge-without-transfer.
          if (newStatus === "suspended") {
            const pendingPayments = await tx.query.payments.findMany({
              where: (table, { and, eq: whereEq, isNotNull, inArray }) =>
                and(
                  whereEq(table.shopId, shop.id),
                  isNotNull(table.stripePaymentIntentId),
                  inArray(table.status, [
                    "requires_payment_method",
                    "requires_action",
                    "processing",
                  ]),
                ),
            });

            pendingCancellations = pendingPayments
              .filter((p): p is typeof p & { stripePaymentIntentId: string } =>
                Boolean(p.stripePaymentIntentId)
              )
              .map((p) => ({
                stripePaymentIntentId: p.stripePaymentIntentId,
                shopId: shop.id,
                paymentId: p.id,
              }));

            // Sweep: flag recently-succeeded payments with transferHeld.
            // Payments that completed in the race window between Stripe
            // suspending the account and this webhook arriving should not
            // have their transfer auto-created until the suspension is
            // reviewed and resolved.
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const recentPaid = await tx.query.appointments.findMany({
              columns: { id: true },
              where: (table, { and: whereAnd, eq: whereEq, gt: whereGt }) =>
                whereAnd(
                  whereEq(table.shopId, shop.id),
                  whereEq(table.paymentStatus, "paid"),
                  whereEq(table.transferHeld, false),
                  whereGt(table.updatedAt, oneHourAgo),
                ),
            });

            if (recentPaid.length > 0) {
              const recentPaidIds = recentPaid.map((a) => a.id);
              await tx
                .update(appointments)
                .set({ transferHeld: true, updatedAt: new Date() })
                .where(
                  and(
                    eq(appointments.shopId, shop.id),
                    inArray(appointments.id, recentPaidIds),
                  ),
                );
            }

            console.warn(
              "Flagged recent payments as transferHeld for suspended shop",
              {
                shopId: shop.id,
                flaggedCount: recentPaid.length,
              },
            );
          }
        }
      } else if (event.type === "transfer.created") {
        const transfer = event.data.object as Stripe.Transfer;
        const context = await resolveTransferContext(transfer);

        if (context) {
          // console.info not allowed by lint — use console.warn with level field
          console.warn("Transfer succeeded", {
            transferId: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destinationAccountId: transfer.destination,
            appointmentId: context.appointmentId,
            shopId: context.shopId,
            shopName: context.shopName,
            status: "succeeded",
          });
        } else {
          console.warn(
            "Transfer created but could not resolve appointment context",
            {
              transferId: transfer.id,
              amount: transfer.amount,
              destinationAccountId: transfer.destination,
            }
          );
        }
      } else if (event.type === "transfer.reversed") {
        const transfer = event.data.object as Stripe.Transfer;
        const context = await resolveTransferContext(transfer);

        if (context) {
          console.error("Transfer reversed — MANUAL_REVIEW_REQUIRED", {
            transferId: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destinationAccountId: transfer.destination,
            appointmentId: context.appointmentId,
            shopId: context.shopId,
            shopName: context.shopName,
            eventId: event.id,
            action: "MANUAL_REVIEW_REQUIRED",
          });
        } else {
          console.error(
            "Transfer reversed but could not resolve appointment context",
            {
              transferId: transfer.id,
              amount: transfer.amount,
              destinationAccountId: transfer.destination,
              eventId: event.id,
              action: "MANUAL_REVIEW_REQUIRED",
            }
          );
        }
      } else if (event.type === "transfer.updated") {
        const transfer = event.data.object as Stripe.Transfer;
        const context = await resolveTransferContext(transfer);

        console.warn("Transfer updated", {
          transferId: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          destinationAccountId: transfer.destination,
          appointmentId: context?.appointmentId ?? "unknown",
          shopId: context?.shopId ?? "unknown",
          eventId: event.id,
        });
      } else if (event.type === "charge.dispute.created") {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string"
          ? dispute.charge
          : dispute.charge?.id;
        const paymentIntentId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

        // Look up payment → appointment via stripePaymentIntentId
        let payment = null;
        if (paymentIntentId) {
          payment = await tx.query.payments.findFirst({
            where: (table, { eq: whereEq }) =>
              whereEq(table.stripePaymentIntentId, paymentIntentId),
          });
        }

        if (payment) {
          // Set financialOutcome to "disputed"
          await tx
            .update(appointments)
            .set({
              financialOutcome: "disputed",
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, payment.appointmentId));

          // Insert dispute_opened event
          await tx
            .insert(appointmentEvents)
            .values({
              shopId: payment.shopId,
              appointmentId: payment.appointmentId,
              type: "dispute_opened",
              occurredAt: new Date(),
              meta: {
                disputeId: dispute.id,
                chargeId,
                paymentIntentId,
                amount: dispute.amount,
                currency: dispute.currency,
                reason: dispute.reason,
                status: dispute.status,
              },
            });

          console.error("Dispute opened — financialOutcome set to disputed", {
            disputeId: dispute.id,
            chargeId,
            paymentIntentId,
            amount: dispute.amount,
            reason: dispute.reason,
            appointmentId: payment.appointmentId,
            shopId: payment.shopId,
          });

          // Prepare dispute notification email (sent after transaction commit)
          const shop = await tx.query.shops.findFirst({
            where: (table, { eq: whereEq }) => whereEq(table.id, payment.shopId),
          });

          if (shop?.stripeAccountId) {
            const ownerRow = await tx
              .select({ email: user.email, name: user.name })
              .from(user)
              .where(eq(user.id, shop.ownerUserId))
              .limit(1);

            const appointment = await tx.query.appointments.findFirst({
              where: (table, { eq: whereEq }) => whereEq(table.id, payment.appointmentId),
            });

            let customerName: string | null = null;
            if (appointment?.customerId) {
              const customerRow = await tx
                .select({ fullName: customers.fullName })
                .from(customers)
                .where(eq(customers.id, appointment.customerId))
                .limit(1);
              customerName = customerRow[0]?.fullName ?? null;
            }

            if (ownerRow[0]?.email) {
              pendingDisputeEmail = {
                ownerEmail: ownerRow[0].email,
                shopName: shop.name ?? "your shop",
                disputeId: dispute.id,
                amount: dispute.amount,
                currency: dispute.currency,
                customerName,
                appointmentDate: appointment?.startsAt?.toISOString() ?? null,
                stripeAccountId: shop.stripeAccountId,
              };
            }
          }
        } else {
          console.error("Dispute opened but could not resolve payment context", {
            disputeId: dispute.id,
            chargeId,
            paymentIntentId,
            amount: dispute.amount,
            reason: dispute.reason,
          });
        }
      } else if (event.type === "charge.dispute.updated") {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

        console.warn("Dispute updated", {
          disputeId: dispute.id,
          status: dispute.status,
          reason: dispute.reason,
          amount: dispute.amount,
          paymentIntentId,
          eventId: event.id,
        });

      } else if (event.type === "charge.dispute.closed") {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

        // Resolve the financial outcome based on dispute result
        let payment = null;
        if (paymentIntentId) {
          payment = await tx.query.payments.findFirst({
            where: (table, { eq: whereEq }) =>
              whereEq(table.stripePaymentIntentId, paymentIntentId),
          });
        }

        if (payment) {
          // Won = merchant keeps deposit → revert to settled
          // Lost = funds deducted → stay disputed
          const newOutcome = dispute.status === "won" ? "settled" : "disputed";

          await tx
            .update(appointments)
            .set({
              financialOutcome: newOutcome as "settled" | "disputed",
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, payment.appointmentId));

          console.warn("Dispute closed", {
            disputeId: dispute.id,
            status: dispute.status,
            outcome: newOutcome,
            amount: dispute.amount,
            appointmentId: payment.appointmentId,
            shopId: payment.shopId,
            eventId: event.id,
          });
        } else {
          console.warn("Dispute closed but could not resolve payment context", {
            disputeId: dispute.id,
            status: dispute.status,
            amount: dispute.amount,
            paymentIntentId,
            eventId: event.id,
          });
        }
      } else {
        console.warn("Unexpected event type at Connect webhook — check Stripe webhook configuration", {
          eventType: event.type,
          eventId: event.id,
          endpoint: "/api/stripe/connect-webhook",
        });
      }
    });
  } catch (error) {
    console.error("Stripe Connect webhook DB transaction failed", {
      eventId: event.id,
      type: event.type,
      error,
    });
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  // Cancel in-flight PaymentIntents AFTER commit so we don't hold DB
  // connections open during Stripe network calls, and so a Stripe failure
  // can't roll back the already-committed DB state.
  if (pendingCancellations.length > 0) {
    const stripe = getStripeClient();
    let cancelledCount = 0;

    for (const { stripePaymentIntentId, shopId, paymentId } of pendingCancellations) {
      try {
        await stripe.paymentIntents.cancel(stripePaymentIntentId);
        cancelledCount++;
        console.warn(
          "Cancelled in-flight PaymentIntent for suspended shop",
          { stripePaymentIntentId, shopId, paymentId }
        );
      } catch (err) {
        // PI may have already succeeded or been cancelled in a race window
        console.warn(
          "Failed to cancel PaymentIntent during suspension sweep",
          {
            stripePaymentIntentId,
            shopId,
            paymentId,
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }
    }

    console.warn("Suspension sweep complete", {
      shopId: pendingCancellations[0]?.shopId,
      pendingPaymentsFound: pendingCancellations.length,
      paymentIntentsCancelled: cancelledCount,
    });
  }

  // Send dispute notification email AFTER commit (external call pattern)
  // TypeScript cannot track mutations through async closures — cast to restore declared type
  const disputeEmail = pendingDisputeEmail as {
    ownerEmail: string;
    shopName: string;
    disputeId: string;
    amount: number;
    currency: string;
    customerName: string | null;
    appointmentDate: string | null;
    stripeAccountId: string;
  } | null;
  if (disputeEmail) {
    const { ownerEmail, shopName, disputeId, amount, currency, customerName, appointmentDate, stripeAccountId } = disputeEmail;

    const formattedAmount = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);

    const firstName = (shopName ?? "").split(" ")[0] || "there";
    const customerLine = customerName ? `${customerName} has` : "A customer has";
    const dateLine = appointmentDate
      ? ` for ${new Date(appointmentDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
      : "";

    // Generate Express Dashboard login link
    let dashboardUrl = "";
    try {
      const stripe = getStripeClient();
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
      dashboardUrl = loginLink.url;
    } catch {
      dashboardUrl = "https://dashboard.stripe.com";
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .em-body  { background-color: #0f1117 !important; }
      .em-wrap  { background-color: #0f1117 !important; }
      .em-logo  { color: #e8eaf0 !important; }
      .em-text  { color: #e8eaf0 !important; }
      .em-muted { color: #9ca3af !important; }
      .em-foot  { color: #6b7280 !important; }
      .em-hr    { border-top-color: #2d3748 !important; }
    }
    [data-ogsc] .em-body  { background-color: #0f1117 !important; }
    [data-ogsc] .em-wrap  { background-color: #0f1117 !important; }
    [data-ogsc] .em-logo  { color: #e8eaf0 !important; }
    [data-ogsc] .em-text  { color: #e8eaf0 !important; }
    [data-ogsc] .em-muted { color: #9ca3af !important; }
    [data-ogsc] .em-foot  { color: #6b7280 !important; }
    [data-ogsc] .em-hr    { border-top-color: #2d3748 !important; }
    @media (max-width: 600px) {
      .em-wrap { padding: 28px 24px !important; }
      .em-cta  { display: block !important; text-align: center !important; box-sizing: border-box !important; width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body class="em-body" style="margin:0;padding:16px 0;background-color:#ffffff">
  <div class="em-wrap" style="max-width:600px;margin:0 auto;padding:44px 56px;font-family:system-ui,sans-serif;background-color:#ffffff">
    <div style="margin-bottom:36px">
      <span class="em-logo" style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#001e40">ShowUp</span>
    </div>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">Hi ${firstName},</p>
    <p class="em-text" style="font-size:21px;font-weight:800;line-height:1.3;letter-spacing:-0.015em;color:#111827">A deposit has been disputed.</p>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827;max-width:46ch">${customerLine} disputed their ${formattedAmount} deposit${dateLine}. Respond through your Stripe Dashboard within the deadline shown there.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${dashboardUrl}" class="em-cta" style="display:inline-block;padding:14px 36px;background:#001e40;color:#fff;text-decoration:none;border-radius:12px;font-size:15.5px;font-weight:700;min-height:50px">Open Stripe Dashboard →</a>
    </div>
    <p class="em-muted" style="font-size:13px;color:#6b7280">Stripe sets the response deadline — check your dashboard for the exact date.</p>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">— ShowUp</p>
    <hr class="em-hr" style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p class="em-foot" style="font-size:11.5px;color:#737780;line-height:1.6">You're receiving this because a deposit on your account has been disputed by a customer. This is a transactional account notification.</p>
    <p style="font-size:11.5px;color:#737780;margin:0;padding:16px 0 0"><span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">SHOWUP</span><span style="padding:0 7px">·</span>Stop losing money to no-shows.</p>
  </div>
</body>
</html>`;

    const text = `Hi ${firstName},\n\nA deposit has been disputed.\n\n${customerLine} disputed their ${formattedAmount} deposit${dateLine}. Respond through your Stripe Dashboard within the deadline shown there.\n\nOpen Stripe Dashboard: ${dashboardUrl}\n\nStripe sets the response deadline — check your dashboard for the exact date.\n\n— ShowUp\n\n---\nYou're receiving this because a deposit on your account has been disputed by a customer. This is a transactional account notification.\n\nSHOWUP · Stop losing money to no-shows.`;

    try {
      await sendEmail({
        to: ownerEmail,
        subject: "A customer has disputed a deposit",
        html,
        text,
      });
    } catch (emailError) {
      console.error("Failed to send dispute notification email", {
        disputeId,
        ownerEmail,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }

  return Response.json({ received: true });
}
