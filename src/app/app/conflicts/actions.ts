"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { formatDateInTimeZone } from "@/lib/booking";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import { db } from "@/lib/db";
import { autoResolveAlert, deleteCalendarEvent } from "@/lib/google-calendar";
import { invalidateCalendarCache } from "@/lib/google-calendar-cache";
import {
  dismissAlert,
  resolveAlertsForCancelledAppointment,
} from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import {
  appointmentEvents,
  appointments,
  bookingSettings,
  payments,
  policyVersions,
} from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";
import { processRefund } from "@/lib/stripe-refund";

export async function dismissConflictAction(alertId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    const dismissed = await dismissAlert(alertId, shop.id);
    if (!dismissed) {
      return { success: false, error: "Conflict alert not found" };
    }

    revalidatePath("/app/conflicts");
    revalidatePath("/app/appointments");

    return { success: true };
  } catch (error) {
    console.error("Failed to dismiss conflict", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "Failed to dismiss conflict" };
  }
}

export async function cancelAppointmentFromConflict(
  appointmentId: string
): Promise<{
  success: boolean;
  refunded?: boolean;
  amount?: number;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    const [row] = await db
      .select({
        appointment: appointments,
        policy: policyVersions,
        timezone: bookingSettings.timezone,
        payment: payments,
      })
      .from(appointments)
      .leftJoin(bookingSettings, eq(bookingSettings.shopId, appointments.shopId))
      .leftJoin(policyVersions, eq(policyVersions.id, appointments.policyVersionId))
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(and(eq(appointments.id, appointmentId), eq(appointments.shopId, shop.id)))
      .limit(1);

    if (!row || !row.policy) {
      return { success: false, error: "Appointment not found" };
    }

    if (row.appointment.status !== "booked") {
      return { success: false, error: `Appointment is already ${row.appointment.status}` };
    }

    const timezone = row.timezone ?? "UTC";
    const eligibility = calculateCancellationEligibility(
      row.appointment.startsAt,
      row.policy.cancelCutoffMinutes,
      timezone,
      row.payment?.status ?? null,
      row.appointment.status,
      row.policy.refundBeforeCutoff
    );

    const finalizeCalendarCleanup = async () => {
      const calendarEventId = row.appointment.calendarEventId;
      if (!calendarEventId) {
        return;
      }

      const deleted = await deleteCalendarEvent({
        shopId: row.appointment.shopId,
        calendarEventId,
      });

      if (!deleted) {
        return;
      }

      try {
        await autoResolveAlert(row.appointment.shopId, calendarEventId);
      } catch (error) {
        console.error("Failed to auto-resolve alert by calendar event id", {
          appointmentId,
          shopId: row.appointment.shopId,
          calendarEventId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      try {
        const dateStr = formatDateInTimeZone(row.appointment.startsAt, timezone);
        await invalidateCalendarCache(row.appointment.shopId, dateStr);
      } catch (error) {
        console.error("Failed to invalidate calendar cache after cancellation", {
          appointmentId,
          shopId: row.appointment.shopId,
          calendarEventId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    let refunded = false;
    let amount = 0;

    if (eligibility.isEligibleForRefund) {
      if (!row.payment) {
        return { success: false, error: "Payment information missing for refund" };
      }

      await processRefund({
        appointment: row.appointment,
        payment: row.payment,
        cutoffTime: eligibility.cutoffTime,
      });

      refunded = true;
      amount = row.payment.amountCents / 100;
    } else {
      const now = new Date();

      const result = await db.transaction(async (tx) => {
        const [updatedAppointment] = await tx
          .update(appointments)
          .set({
            status: "cancelled",
            cancelledAt: now,
            cancellationSource: "admin",
            financialOutcome: "settled",
            resolutionReason: "cancelled_no_refund_after_cutoff",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(and(eq(appointments.id, appointmentId), eq(appointments.status, "booked")))
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
              source: "conflicts_dashboard",
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

      if (!result.updated) {
        return { success: false, error: "Appointment is no longer booked" };
      }
    }

    await finalizeCalendarCleanup();
    await resolveAlertsForCancelledAppointment(appointmentId, shop.id);
    await createSlotOpeningFromCancellation(row.appointment, row.payment);

    revalidatePath("/app/conflicts");
    revalidatePath("/app/appointments");

    return { success: true, refunded, amount };
  } catch (error) {
    console.error("Failed to cancel appointment from conflicts dashboard", {
      appointmentId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, error: "Failed to cancel appointment" };
  }
}
