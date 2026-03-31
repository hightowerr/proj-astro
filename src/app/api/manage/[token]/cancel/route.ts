import { and, eq, inArray } from "drizzle-orm";
import { formatDateInTimeZone } from "@/lib/booking";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import { db } from "@/lib/db";
import {
  autoResolveAlert,
  deleteCalendarEvent,
} from "@/lib/google-calendar";
import { invalidateCalendarCache } from "@/lib/google-calendar-cache";
import { validateToken } from "@/lib/manage-tokens";
import {
  appointments,
  appointmentEvents,
  bookingSettings,
  payments,
  policyVersions,
  shops,
} from "@/lib/schema";
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";
import {
  getStripeClient,
  normalizeStripePaymentStatus,
  stripeIsMocked,
} from "@/lib/stripe";
import { processRefund } from "@/lib/stripe-refund";

export const runtime = "nodejs";

interface CancelParams {
  params: Promise<{
    token: string;
  }>;
}

export async function POST(_request: Request, { params }: CancelParams) {
  const { token } = await params;

  try {
    const appointmentId = await validateToken(token);

    if (!appointmentId) {
      return Response.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    const [row] = await db
      .select({
        appointment: appointments,
        policy: policyVersions,
        timezone: bookingSettings.timezone,
        payment: payments,
      })
      .from(appointments)
      .innerJoin(shops, eq(shops.id, appointments.shopId))
      .leftJoin(bookingSettings, eq(bookingSettings.shopId, shops.id))
      .leftJoin(policyVersions, eq(policyVersions.id, appointments.policyVersionId))
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!row || !row.policy) {
      return Response.json({ error: "Appointment not found" }, { status: 404 });
    }

    const timezone = row.timezone ?? "UTC";

    if (!["booked", "pending"].includes(row.appointment.status)) {
      return Response.json(
        {
          error: "Cannot cancel appointment",
          reason: `Appointment is already ${row.appointment.status}`,
        },
        { status: 400 }
      );
    }

    const eligibility = calculateCancellationEligibility(
      row.appointment.startsAt,
      row.policy.cancelCutoffMinutes,
      timezone,
      row.payment?.status ?? null,
      row.appointment.status,
      row.policy.refundBeforeCutoff
    );

    const deleteCalendarEventIfExists = async () => {
      const calendarEventId = row.appointment.calendarEventId;
      if (!calendarEventId) {
        console.warn("[cancel] No calendar event id; skipping calendar cleanup", {
          appointmentId: row.appointment.id,
          shopId: row.appointment.shopId,
        });
        return;
      }

      const deleted = await deleteCalendarEvent({
        shopId: row.appointment.shopId,
        calendarEventId,
      });

      if (!deleted) {
        console.error("[cancel] Calendar event deletion did not succeed", {
          appointmentId: row.appointment.id,
          shopId: row.appointment.shopId,
          calendarEventId,
        });
        return;
      }

      console.warn("[cancel] Calendar event deleted", {
        appointmentId: row.appointment.id,
        shopId: row.appointment.shopId,
        calendarEventId,
      });

      try {
        await autoResolveAlert(row.appointment.shopId, calendarEventId);
      } catch (error) {
        console.error("[cancel] Auto-resolve alert stub failed", {
          appointmentId: row.appointment.id,
          shopId: row.appointment.shopId,
          calendarEventId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      try {
        const dateStr = formatDateInTimeZone(row.appointment.startsAt, timezone);
        await invalidateCalendarCache(row.appointment.shopId, dateStr);
      } catch (error) {
        console.error("[cancel] Calendar cache invalidation failed", {
          appointmentId: row.appointment.id,
          shopId: row.appointment.shopId,
          calendarEventId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    const persistPaymentStatus = async (
      paymentId: string,
      nextStatus: typeof payments.$inferSelect.status
    ) => {
      await db
        .update(payments)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));
    };

    const refreshPaymentStatusFromStripe = async (
      payment: typeof payments.$inferSelect
    ) => {
      if (!payment.stripePaymentIntentId || stripeIsMocked()) {
        return payment;
      }

      try {
        const stripe = getStripeClient();
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );
        const normalizedStatus = normalizeStripePaymentStatus(paymentIntent.status);

        if (normalizedStatus !== payment.status) {
          await persistPaymentStatus(payment.id, normalizedStatus);
          return {
            ...payment,
            status: normalizedStatus,
          };
        }
      } catch (error) {
        console.error("[cancel] Failed to refresh payment intent status", {
          appointmentId: row.appointment.id,
          paymentIntentId: payment.stripePaymentIntentId,
          error,
        });
      }

      return payment;
    };

    const cancelPaymentIntentIfNeeded = async (
      payment: typeof payments.$inferSelect | null
    ): Promise<typeof payments.$inferSelect | null> => {
      const paymentIntentId = payment?.stripePaymentIntentId;
      if (!paymentIntentId) {
        return payment;
      }

      if (payment?.status === "succeeded" || payment?.status === "canceled") {
        return payment;
      }

      if (stripeIsMocked()) {
        return payment;
      }

      try {
        const stripe = getStripeClient();
        const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        const normalizedStatus = normalizeStripePaymentStatus(cancelledIntent.status);

        if (payment && normalizedStatus !== payment.status) {
          await persistPaymentStatus(payment.id, normalizedStatus);
          return {
            ...payment,
            status: normalizedStatus,
          };
        }
      } catch (error) {
        try {
          const stripe = getStripeClient();
          const latestIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const normalizedStatus = normalizeStripePaymentStatus(latestIntent.status);

          if (payment && normalizedStatus !== payment.status) {
            await persistPaymentStatus(payment.id, normalizedStatus);
            return {
              ...payment,
              status: normalizedStatus,
            };
          }
        } catch (syncError) {
          console.error("[cancel] Failed to refresh payment intent after cancel error", {
            appointmentId: row.appointment.id,
            paymentIntentId,
            error: syncError,
          });
        }

        console.error("[cancel] Failed to cancel payment intent", {
          appointmentId: row.appointment.id,
          paymentIntentId,
          error,
        });
      }

      return payment;
    };

    if (row.appointment.status === "pending") {
      let payment = row.payment;

      if (payment) {
        payment = await refreshPaymentStatusFromStripe(payment);
      }

      // Payment was captured during the booking session before the appointment
      // was confirmed. Issue a full refund — customer is always eligible since
      // the appointment was never booked.
      if (payment?.status === "succeeded") {
        const refundResult = await processRefund({
          appointment: row.appointment,
          payment,
          cutoffTime: new Date(),
        });
        await deleteCalendarEventIfExists();
        await createSlotOpeningFromCancellation(row.appointment, payment);
        return Response.json({
          success: true,
          refunded: true,
          amount: payment.amountCents / 100,
          message: `Refunded $${(payment.amountCents / 100).toFixed(2)} to your card`,
          refundId: refundResult.refundId,
        });
      }

      payment = await cancelPaymentIntentIfNeeded(payment);

      if (payment?.status === "succeeded") {
        const refundResult = await processRefund({
          appointment: row.appointment,
          payment,
          cutoffTime: new Date(),
        });
        await deleteCalendarEventIfExists();
        await createSlotOpeningFromCancellation(row.appointment, payment);
        return Response.json({
          success: true,
          refunded: true,
          amount: payment.amountCents / 100,
          message: `Refunded $${(payment.amountCents / 100).toFixed(2)} to your card`,
          refundId: refundResult.refundId,
        });
      }

      const now = new Date();

      const updateResult = await db.transaction(async (tx) => {
        const [updatedAppointment] = await tx
          .update(appointments)
          .set({
            status: "cancelled",
            cancelledAt: now,
            cancellationSource: "customer",
            paymentStatus: "failed",
            financialOutcome: "voided",
            resolutionReason: "cancelled_no_payment_captured",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(appointments.id, appointmentId),
              eq(appointments.status, "pending")
            )
          )
          .returning({ id: appointments.id });

        if (!updatedAppointment) {
          return { updated: false } as const;
        }

        if (payment?.id) {
          await tx
            .update(payments)
            .set({
              status: "canceled",
              updatedAt: now,
            })
            .where(
              and(
                eq(payments.id, payment.id),
                inArray(payments.status, [
                  "requires_payment_method",
                  "requires_action",
                  "processing",
                  "failed",
                ])
              )
            );
        }

        const [event] = await tx
          .insert(appointmentEvents)
          .values({
            shopId: row.appointment.shopId,
            appointmentId,
            type: "cancelled",
            occurredAt: now,
            meta: {
              reason: "cancelled_no_payment_captured",
              cancelledAt: now.toISOString(),
            },
          })
          .returning({ id: appointmentEvents.id });

        if (event?.id) {
          await tx
            .update(appointments)
            .set({ lastEventId: event.id, updatedAt: now })
            .where(eq(appointments.id, appointmentId));
        }

        return { updated: true } as const;
      });

      if (!updateResult.updated) {
        return Response.json({
          success: true,
          refunded: false,
          amount: 0,
          message: "Booking was already cancelled.",
        });
      }

      await deleteCalendarEventIfExists();

      return Response.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Booking cancelled. No payment was taken.",
      });
    }

    if (eligibility.isEligibleForRefund) {
      if (!row.payment) {
        return Response.json(
          { error: "Payment information missing for refund" },
          { status: 409 }
        );
      }

      const refundResult = await processRefund({
        appointment: row.appointment,
        payment: row.payment,
        cutoffTime: eligibility.cutoffTime,
      });

      await deleteCalendarEventIfExists();

      await createSlotOpeningFromCancellation(row.appointment, row.payment);

      return Response.json({
        success: true,
        refunded: true,
        amount: row.payment.amountCents / 100,
        message: `Refunded $${(row.payment.amountCents / 100).toFixed(2)} to your card`,
        refundId: refundResult.refundId,
      });
    }

    const now = new Date();
    const updateResult = await db.transaction(async (tx) => {
      const [updatedAppointment] = await tx
        .update(appointments)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationSource: "customer",
          financialOutcome: "settled",
          resolutionReason: "cancelled_no_refund_after_cutoff",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.status, "booked")
          )
        )
        .returning({ id: appointments.id });

      if (!updatedAppointment) {
        return { updated: false } as const;
      }

      const [event] = await tx
        .insert(appointmentEvents)
        .values({
          shopId: row.appointment.shopId,
          appointmentId,
          type: "cancelled",
          occurredAt: now,
          meta: {
            reason: "cancelled_no_refund_after_cutoff",
            cutoffTime: eligibility.cutoffTime.toISOString(),
            cancelledAt: now.toISOString(),
          },
        })
        .returning({ id: appointmentEvents.id });

      if (event?.id) {
        await tx
          .update(appointments)
          .set({ lastEventId: event.id, updatedAt: now })
          .where(eq(appointments.id, appointmentId));
      }

      return { updated: true } as const;
    });

    if (!updateResult.updated) {
      return Response.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Appointment cancelled. Deposit retained per cancellation policy.",
      });
    }

    await deleteCalendarEventIfExists();

    await createSlotOpeningFromCancellation(row.appointment, row.payment);

    return Response.json({
      success: true,
      refunded: false,
      amount: 0,
      message: "Appointment cancelled. Deposit retained per cancellation policy.",
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    return Response.json(
      {
        error: "Failed to cancel appointment",
      },
      { status: 500 }
    );
  }
}
