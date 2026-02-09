import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appointments, payments } from "@/lib/schema";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";

const paramsSchema = z.object({
  bookingId: z.string().uuid(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);
  if (!parsed.success) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const rows = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentRequired: appointments.paymentRequired,
      bookingUrl: appointments.bookingUrl,
      paymentId: payments.id,
      paymentProviderStatus: payments.status,
      paymentIntentId: payments.stripePaymentIntentId,
      amountCents: payments.amountCents,
      currency: payments.currency,
    })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(eq(appointments.id, parsed.data.bookingId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  if (row.paymentRequired && !row.paymentId) {
    return Response.json({ error: "Payment record missing" }, { status: 404 });
  }

  let clientSecret: string | null = null;
  if (
    row.paymentRequired &&
    row.paymentIntentId &&
    row.paymentProviderStatus !== "succeeded"
  ) {
    if (stripeIsMocked()) {
      clientSecret = `pi_test_secret_${row.paymentId}`;
    } else {
      try {
        const stripe = getStripeClient();
        const intent = await stripe.paymentIntents.retrieve(row.paymentIntentId);
        clientSecret = intent.client_secret ?? null;
      } catch {
        return Response.json(
          { error: "Failed to load payment intent" },
          { status: 502 }
        );
      }
    }
  }

  return Response.json({
    appointment: {
      id: row.appointmentId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentRequired: row.paymentRequired,
      bookingUrl: row.bookingUrl,
    },
    payment: row.paymentId
      ? {
          id: row.paymentId,
          status: row.paymentProviderStatus,
          amountCents: row.amountCents,
          currency: row.currency,
        }
      : null,
    amountCents: row.amountCents ?? 0,
    currency: row.currency ?? "USD",
    paymentRequired: row.paymentRequired,
    clientSecret,
    bookingUrl: row.bookingUrl,
  });
}
