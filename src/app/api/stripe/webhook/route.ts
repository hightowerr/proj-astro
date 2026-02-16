import { and, eq, inArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendBookingConfirmationSMS } from "@/lib/messages";
import {
  appointments,
  payments,
  processedStripeEvents,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
import {
  getStripeClient,
  getStripeWebhookSecret,
  normalizeStripePaymentStatus,
} from "@/lib/stripe";

export const runtime = "nodejs";

type DbLike = Pick<typeof db, "query" | "update">;

const handlePaymentIntent = async (
  tx: DbLike,
  intent: Stripe.PaymentIntent,
  appointmentUpdates: {
    paymentStatus: "paid" | "failed";
    status: "booked" | "pending" | "cancelled";
  },
  paymentStatusOverride?: "succeeded" | "failed" | "canceled",
  options?: {
    incrementAttempts?: boolean;
  }
) => {
  const payment = await tx.query.payments.findFirst({
    where: (table, { eq }) => eq(table.stripePaymentIntentId, intent.id),
  });

  if (!payment) {
    return null;
  }

  if (payment.status === "succeeded") {
    return null;
  }

  const paymentUpdate: {
    status: typeof payments.$inferInsert.status;
    updatedAt: Date;
    attempts?: ReturnType<typeof sql<number>>;
  } = {
    status: paymentStatusOverride ?? normalizeStripePaymentStatus(intent.status),
    updatedAt: new Date(),
  };

  if (options?.incrementAttempts) {
    paymentUpdate.attempts = sql`${payments.attempts} + 1`;
  }

  await tx
    .update(payments)
    .set(paymentUpdate)
    .where(eq(payments.id, payment.id));

  await tx
    .update(appointments)
    .set({
      paymentStatus: appointmentUpdates.paymentStatus,
      status: appointmentUpdates.status,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, payment.appointmentId));

  return payment.appointmentId;
};

const recoverSlotAfterPaymentFailure = async (
  tx: DbLike,
  intent: Stripe.PaymentIntent
): Promise<string | null> => {
  const payment = await tx.query.payments.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.stripePaymentIntentId, intent.id),
  });

  if (!payment || payment.status === "succeeded") {
    return null;
  }

  const appointment = await tx.query.appointments.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.id, payment.appointmentId),
  });

  if (!appointment?.sourceSlotOpeningId) {
    return null;
  }

  const [reopenedSlot] = await tx
    .update(slotOpenings)
    .set({
      status: "open",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(slotOpenings.id, appointment.sourceSlotOpeningId),
        eq(slotOpenings.status, "filled")
      )
    )
    .returning({ id: slotOpenings.id });

  if (!reopenedSlot) {
    return null;
  }

  await tx
    .update(slotOffers)
    .set({
      status: "declined",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(slotOffers.slotOpeningId, appointment.sourceSlotOpeningId),
        eq(slotOffers.customerId, appointment.customerId),
        inArray(slotOffers.status, ["sent", "accepted"])
      )
    );

  return reopenedSlot.id;
};

const triggerOfferLoop = async (slotOpeningId: string): Promise<void> => {
  const appUrl = process.env.APP_URL;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!appUrl || !internalSecret) {
    console.warn(
      "Skipped offer-loop trigger after payment failure because APP_URL or INTERNAL_SECRET is missing",
      { slotOpeningId }
    );
    return;
  }

  try {
    const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ slotOpeningId }),
    });

    if (!response.ok) {
      console.error("Offer-loop trigger failed after payment failure", {
        slotOpeningId,
        status: response.status,
      });
    }
  } catch (error) {
    console.error("Offer-loop trigger errored after payment failure", {
      slotOpeningId,
      error,
    });
  }
};

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let appointmentToNotify: string | null = null;
  let slotOpeningToRetry: string | null = null;

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

      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object as Stripe.PaymentIntent;
        appointmentToNotify = await handlePaymentIntent(
          tx,
          intent,
          {
            paymentStatus: "paid",
            status: "booked",
          },
          "succeeded",
          { incrementAttempts: true }
        );
        return;
      }

      if (event.type === "payment_intent.payment_failed") {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(
          tx,
          intent,
          {
            paymentStatus: "failed",
            status: "pending",
          },
          "failed",
          { incrementAttempts: true }
        );
        slotOpeningToRetry = await recoverSlotAfterPaymentFailure(tx, intent);
        return;
      }

      if (event.type === "payment_intent.canceled") {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(
          tx,
          intent,
          {
            paymentStatus: "failed",
            status: "pending",
          },
          "canceled",
          { incrementAttempts: true }
        );
      }
    });
  } catch (error) {
    console.error("Stripe webhook DB transaction failed", {
      eventId: event.id,
      type: event.type,
      error,
    });
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  if (appointmentToNotify) {
    try {
      await sendBookingConfirmationSMS(appointmentToNotify);
    } catch (error) {
      console.error("Failed to send booking confirmation SMS", {
        appointmentId: appointmentToNotify,
        error,
      });
    }
  }

  if (slotOpeningToRetry) {
    await triggerOfferLoop(slotOpeningToRetry);
  }

  return Response.json({ received: true });
}
