import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { createManageToken } from "@/lib/manage-tokens";
import { appointments, payments } from "@/lib/schema";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";

const paramsSchema = z.object({
  bookingId: z.string().uuid(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const startedAt = Date.now();
  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);
  if (!parsed.success) {
    console.warn("[booking-resume] invalid booking id", {
      params: resolvedParams,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }

  console.warn("[booking-resume] request", {
    bookingId: parsed.data.bookingId,
  });

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
    console.warn("[booking-resume] booking not found", {
      bookingId: parsed.data.bookingId,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  if (row.paymentRequired && !row.paymentId) {
    console.warn("[booking-resume] payment record missing", {
      bookingId: parsed.data.bookingId,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Payment record missing" }, { status: 404 });
  }

  let manageToken: string | null = null;
  try {
    // Check if a manage token already exists
    const existingToken = await db.query.bookingManageTokens.findFirst({
      where: (table, { eq }) => eq(table.appointmentId, row.appointmentId),
    });

    if (!existingToken) {
      manageToken = await createManageToken(row.appointmentId);
    }
  } catch (error) {
    console.error("Failed to handle manage token for booking resume", {
      bookingId: row.appointmentId,
      error,
    });
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
      } catch (error) {
        console.error("[booking-resume] failed to load payment intent", {
          bookingId: parsed.data.bookingId,
          paymentIntentId: row.paymentIntentId,
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return Response.json(
          { error: "Failed to load payment intent" },
          { status: 502 }
        );
      }
    }
  }

  console.warn("[booking-resume] success", {
    bookingId: parsed.data.bookingId,
    paymentRequired: row.paymentRequired,
    appointmentPaymentStatus: row.paymentStatus,
    paymentRowStatus: row.paymentProviderStatus ?? null,
    hasClientSecret: Boolean(clientSecret),
    hasManageToken: Boolean(manageToken),
    durationMs: Date.now() - startedAt,
  });

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
    usePaymentSimulator: Boolean(clientSecret && stripeIsMocked()),
    bookingUrl: row.bookingUrl,
    manageToken,
  });
}
