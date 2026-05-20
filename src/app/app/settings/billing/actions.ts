"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { processRefund } from "@/lib/stripe-refund";

export async function issueRefundAction(paymentId: string): Promise<void> {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) throw new Error("Unauthorized");

  const payment = await db.query.payments.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, paymentId), eq(t.shopId, shop.id)),
  });
  if (!payment) throw new Error("Payment not found");

  const appointment = await db.query.appointments.findFirst({
    where: (t, { eq }) => eq(t.id, payment.appointmentId),
  });
  if (!appointment) throw new Error("Appointment not found");

  if (payment.stripeRefundId) throw new Error("Already refunded");

  if (appointment.financialOutcome === "disputed") {
    throw new Error("Payment is under dispute — refund unavailable");
  }

  await processRefund({ appointment, payment, cutoffTime: new Date() });

  revalidatePath("/app/settings/billing");
  revalidatePath(`/app/appointments/${appointment.id}`);
}
