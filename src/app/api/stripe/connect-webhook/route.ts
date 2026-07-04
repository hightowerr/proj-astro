import { and, eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { appointments, processedStripeEvents, shops } from "@/lib/schema";
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

  return Response.json({ received: true });
}
