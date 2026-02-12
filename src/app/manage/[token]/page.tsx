import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ManageBookingView } from "@/components/manage/manage-booking-view";
import { db } from "@/lib/db";
import { validateToken } from "@/lib/manage-tokens";
import {
  appointments,
  bookingSettings,
  customers,
  payments,
  policyVersions,
  shops,
} from "@/lib/schema";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const appointmentId = await validateToken(token);

  if (!appointmentId) {
    notFound();
  }

  const [row] = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentRequired: appointments.paymentRequired,
      financialOutcome: appointments.financialOutcome,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      shopId: shops.id,
      shopName: shops.name,
      timezone: bookingSettings.timezone,
      policyId: policyVersions.id,
      cancelCutoffMinutes: policyVersions.cancelCutoffMinutes,
      refundBeforeCutoff: policyVersions.refundBeforeCutoff,
      policyCurrency: policyVersions.currency,
      paymentId: payments.id,
      paymentStatusRaw: payments.status,
      paymentAmountCents: payments.amountCents,
      paymentCurrency: payments.currency,
      paymentRefundedAmountCents: payments.refundedAmountCents,
      paymentStripeRefundId: payments.stripeRefundId,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(shops, eq(shops.id, appointments.shopId))
    .leftJoin(bookingSettings, eq(bookingSettings.shopId, shops.id))
    .leftJoin(policyVersions, eq(policyVersions.id, appointments.policyVersionId))
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (
    !row ||
    !row.shopId ||
    !row.policyId ||
    row.cancelCutoffMinutes == null
  ) {
    notFound();
  }

  const durationMinutes = Math.max(
    0,
    Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60000)
  );

  const timezone = row.timezone ?? "UTC";

  return (
    <ManageBookingView
      appointment={{
        id: row.appointmentId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        durationMinutes,
        status: row.status,
        paymentStatus: row.paymentStatus,
        paymentRequired: row.paymentRequired,
        financialOutcome: row.financialOutcome,
      }}
      customer={{
        fullName: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
      }}
      shop={{
        id: row.shopId,
        name: row.shopName,
        timezone,
      }}
      policy={{
        id: row.policyId,
        cancelCutoffMinutes: row.cancelCutoffMinutes,
        refundBeforeCutoff: row.refundBeforeCutoff ?? true,
        currency: row.policyCurrency ?? row.paymentCurrency ?? "USD",
      }}
      payment={
        row.paymentId
          ? {
              id: row.paymentId,
              status: row.paymentStatusRaw ?? "processing",
              amountCents: row.paymentAmountCents ?? 0,
              currency: row.paymentCurrency ?? row.policyCurrency ?? "USD",
              refundedAmountCents: row.paymentRefundedAmountCents ?? 0,
              stripeRefundId: row.paymentStripeRefundId,
            }
          : null
      }
      token={token}
    />
  );
}
