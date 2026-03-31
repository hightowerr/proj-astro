import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { syncAppointmentCalendarEvent } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments, payments } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { getStripeClient, normalizeStripePaymentStatus, stripeIsMocked } from "@/lib/stripe";
import { processRefund } from "@/lib/stripe-refund";

const RECONCILE_STATUSES = [
  "requires_payment_method",
  "requires_action",
  "processing",
  "failed",
  "canceled",
] as const;

const mapAppointmentUpdate = (
  status: (typeof RECONCILE_STATUSES)[number] | "succeeded"
) => {
  if (status === "succeeded") {
    return { paymentStatus: "paid" as const, status: "booked" as const };
  }

  if (status === "failed" || status === "canceled") {
    return { paymentStatus: "failed" as const, status: "pending" as const };
  }

  return { paymentStatus: "pending" as const, status: "pending" as const };
};

export async function POST() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  if (stripeIsMocked()) {
    return Response.json({
      skipped: true,
      reason: "Stripe is disabled in test mode",
    });
  }

  const pendingPayments = await db.query.payments.findMany({
    where: (table, { and, eq, inArray, isNotNull }) =>
      and(
        eq(table.shopId, shop.id),
        isNotNull(table.stripePaymentIntentId),
        inArray(table.status, RECONCILE_STATUSES)
      ),
  });

  const stripe = getStripeClient();
  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (const payment of pendingPayments) {
    if (!payment.stripePaymentIntentId) {
      continue;
    }

    try {
      const intent = await stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId
      );
      const normalized = normalizeStripePaymentStatus(intent.status);

      if (normalized === payment.status) {
        unchanged += 1;
        continue;
      }

      const appointmentUpdate = mapAppointmentUpdate(normalized);

      const {
        appointmentUpdated,
        shouldIssueCompensatingRefund,
      } = await db.transaction(async (tx) => {
        await tx
          .update(payments)
          .set({
            status: normalized,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        const appointment = await tx.query.appointments.findFirst({
          where: (table, { eq: whereEq }) => whereEq(table.id, payment.appointmentId),
          columns: {
            id: true,
            status: true,
            resolutionReason: true,
          },
        });

        if (!appointment) {
          return {
            appointmentUpdated: false,
            shouldIssueCompensatingRefund: false,
          } as const;
        }

        if (
          normalized === "succeeded" &&
          appointment.status === "cancelled" &&
          appointment.resolutionReason === "cancelled_no_payment_captured"
        ) {
          const [updatedAppointment] = await tx
            .update(appointments)
            .set({
              paymentStatus: "paid",
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, payment.appointmentId))
            .returning({ id: appointments.id });

          return {
            appointmentUpdated: Boolean(updatedAppointment),
            shouldIssueCompensatingRefund: Boolean(updatedAppointment),
          } as const;
        }

        const [updatedAppointment] = await tx
          .update(appointments)
          .set({
            paymentStatus: appointmentUpdate.paymentStatus,
            status: appointmentUpdate.status,
            updatedAt: new Date(),
          })
          .where(
            and(eq(appointments.id, payment.appointmentId), eq(appointments.status, "pending"))
          )
          .returning({ id: appointments.id });

        return {
          appointmentUpdated: Boolean(updatedAppointment),
          shouldIssueCompensatingRefund: false,
        } as const;
      });

      if (
        appointmentUpdated &&
        appointmentUpdate.status === "booked" &&
        !shouldIssueCompensatingRefund
      ) {
        await syncAppointmentCalendarEvent(payment.appointmentId);
      }

      if (shouldIssueCompensatingRefund) {
        const [appointment, latestPayment] = await Promise.all([
          db.query.appointments.findFirst({
            where: (table, { eq: whereEq }) => whereEq(table.id, payment.appointmentId),
          }),
          db.query.payments.findFirst({
            where: (table, { eq: whereEq }) => whereEq(table.id, payment.id),
          }),
        ]);

        if (
          appointment &&
          latestPayment &&
          latestPayment.status === "succeeded" &&
          appointment.status === "cancelled" &&
          appointment.resolutionReason === "cancelled_no_payment_captured"
        ) {
          try {
            await processRefund({
              appointment,
              payment: latestPayment,
              cutoffTime: new Date(),
            });
          } catch (error) {
            errors.push(
              `Failed to issue compensating refund for ${payment.id}: ${(error as Error).message ?? "Unknown error"}`
            );
          }
        }
      }

      updated += 1;
    } catch (error) {
      errors.push(
        `Failed to reconcile ${payment.id}: ${(error as Error).message ?? "Unknown error"}`
      );
    }
  }

  return Response.json({
    total: pendingPayments.length,
    updated,
    unchanged,
    errors,
  });
}
