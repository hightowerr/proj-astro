import { and, eq } from "drizzle-orm";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import { db } from "@/lib/db";
import { validateToken } from "@/lib/manage-tokens";
import {
  appointments,
  appointmentEvents,
  bookingSettings,
  payments,
  policyVersions,
  shops,
} from "@/lib/schema";
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

    if (row.appointment.status !== "booked") {
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
