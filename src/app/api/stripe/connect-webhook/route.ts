import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { processedStripeEvents, shops } from "@/lib/schema";
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
      } else if ((event.type as string) === "transfer.failed") {
        // Stripe sends transfer.failed at runtime but their TS types omit it.
        const transfer = (event as Stripe.Event).data.object as Stripe.Transfer;
        const context = await resolveTransferContext(transfer);

        console.error("Transfer failed — MANUAL_REVIEW_REQUIRED", {
          transferId: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          destinationAccountId: transfer.destination,
          failureMessage: (transfer as any).failure_message ?? "unknown",
          failureCode: (transfer as any).failure_code ?? "unknown",
          appointmentId: context?.appointmentId ?? "unknown",
          shopId: context?.shopId ?? "unknown",
          shopName: context?.shopName ?? "unknown",
          eventId: event.id,
          action: "MANUAL_REVIEW_REQUIRED",
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

  return Response.json({ received: true });
}
