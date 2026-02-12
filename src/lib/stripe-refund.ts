import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointmentEvents, appointments, payments } from "@/lib/schema";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
}

interface ProcessRefundInput {
  appointment: typeof appointments.$inferSelect;
  payment: typeof payments.$inferSelect;
  cutoffTime: Date;
}

const isAlreadyRefundedError = (error: unknown) => {
  const errorType = getStripeErrorType(error);
  const errorMessage = getStripeErrorMessage(error);

  return (
    errorType === "StripeInvalidRequestError" &&
    /already been refunded/i.test(errorMessage ?? "")
  );
};

const isTestPaymentIntent = (paymentIntentId: string | null) =>
  Boolean(paymentIntentId && paymentIntentId.startsWith("pi_test_"));

const getStripeErrorType = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof (error as { type?: unknown }).type === "string"
  ) {
    return (error as { type: string }).type;
  }

  return null;
};

const getStripeErrorMessage = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return null;
};

const getExistingRefundIdFromPaymentIntent = async (
  paymentIntentId: string
): Promise<string | null> => {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.refunds"],
  });

  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const refunds = charge?.refunds?.data;

  if (!refunds || refunds.length === 0 || !refunds[0]) {
    return null;
  }

  return refunds[0].id;
};

const persistRefundCancellation = async (
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect,
  refundId: string,
  cutoffTime: Date
) => {
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [updatedAppointment] = await tx
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancellationSource: "customer",
        financialOutcome: "refunded",
        resolutionReason: "cancelled_refunded_before_cutoff",
        resolvedAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(appointments.id, appointment.id), eq(appointments.status, "booked"))
      )
      .returning({ id: appointments.id });

    await tx
      .update(payments)
      .set({
        refundedAmountCents: payment.amountCents,
        stripeRefundId: refundId,
        refundedAt: now,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));

    if (!updatedAppointment) {
      return { updated: false } as const;
    }

    const [event] = await tx
      .insert(appointmentEvents)
      .values({
        shopId: appointment.shopId,
        appointmentId: appointment.id,
        type: "cancelled",
        occurredAt: now,
        meta: {
          reason: "cancelled_refunded_before_cutoff",
          refundId,
          refundAmountCents: payment.amountCents,
          cutoffTime: cutoffTime.toISOString(),
          cancelledAt: now.toISOString(),
        },
      })
      .returning({ id: appointmentEvents.id });

    if (event?.id) {
      await tx
        .update(appointments)
        .set({ lastEventId: event.id, updatedAt: now })
        .where(eq(appointments.id, appointment.id));
    }

    return { updated: true } as const;
  });

  return result.updated;
};

/**
 * Process a cancellation refund with idempotency safeguards.
 */
export async function processRefund({
  appointment,
  payment,
  cutoffTime,
}: ProcessRefundInput): Promise<RefundResult> {
  if (payment.stripeRefundId) {
    return {
      success: true,
      refundId: payment.stripeRefundId,
      amount: payment.refundedAmountCents,
    };
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("Payment intent missing for refund");
  }

  let refundId: string;

  if (stripeIsMocked() || isTestPaymentIntent(payment.stripePaymentIntentId)) {
    refundId = `re_test_${appointment.id.replace(/-/g, "").slice(0, 24)}`;
  } else {
    const stripe = getStripeClient();

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: payment.stripePaymentIntentId,
          amount: payment.amountCents,
          metadata: {
            appointmentId: appointment.id,
            reason: "customer_cancellation",
          },
        },
        {
          idempotencyKey: `refund-${appointment.id}`,
        }
      );

      refundId = refund.id;
    } catch (error) {
      const errorType = getStripeErrorType(error);
      const errorMessage = getStripeErrorMessage(error);

      if (isAlreadyRefundedError(error)) {
        const existingRefundId = await getExistingRefundIdFromPaymentIntent(
          payment.stripePaymentIntentId
        );

        if (existingRefundId) {
          refundId = existingRefundId;
        } else {
          throw new Error("Refund exists on Stripe but could not be resolved");
        }
      } else if (errorType === "StripeRateLimitError") {
        throw new Error("Too many requests. Please try again in a moment.");
      } else if (errorType === "StripeCardError") {
        throw new Error("Card refund failed. Please contact support.");
      } else if (errorType === "StripeInvalidRequestError") {
        throw new Error(
          `Invalid refund request: ${errorMessage ?? "Unknown Stripe error"}`
        );
      } else if (error instanceof Error) {
        throw new Error(`Refund failed: ${error.message}`);
      } else {
        throw new Error("Refund failed. Please try again or contact support.");
      }
    }
  }

  await persistRefundCancellation(appointment, payment, refundId, cutoffTime);

  return {
    success: true,
    refundId,
    amount: payment.amountCents,
  };
}
