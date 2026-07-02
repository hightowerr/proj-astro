import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { appointments, payments, shops } from "@/lib/schema";
import { getStripeClient } from "@/lib/stripe";

export type TransferContext = {
  appointmentId: string;
  shopId: string;
  shopName: string;
  paymentId: string;
  connectedAccountId: string;
  amountCents: number;
};

/**
 * Resolves a Stripe Transfer to local appointment/shop context.
 * Returns null (with console.warn) for every failure path — never throws.
 */
export async function resolveTransferContext(
  transfer: Stripe.Transfer
): Promise<TransferContext | null> {
  // 1. source_transaction must exist
  if (!transfer.source_transaction) {
    console.warn("[resolveTransferContext] Transfer missing source_transaction", {
      transferId: transfer.id,
    });
    return null;
  }

  // 2. Retrieve the charge from the source_transaction
  let charge: Stripe.Charge;
  try {
    const stripe = getStripeClient();
    charge = await stripe.charges.retrieve(
      typeof transfer.source_transaction === "string"
        ? transfer.source_transaction
        : transfer.source_transaction.id
    );
  } catch (error) {
    console.warn("[resolveTransferContext] Failed to retrieve charge", {
      transferId: transfer.id,
      sourceTransaction: transfer.source_transaction,
      error,
    });
    return null;
  }

  // 3. charge.payment_intent must exist
  if (!charge.payment_intent) {
    console.warn("[resolveTransferContext] Charge has no payment_intent", {
      transferId: transfer.id,
      chargeId: charge.id,
    });
    return null;
  }

  // 4. Extract payment intent ID
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent.id;

  // 5. Look up local payment → appointment → shop
  let row: {
    payment: typeof payments.$inferSelect;
    appointment: typeof appointments.$inferSelect;
    shop: typeof shops.$inferSelect;
  } | null;

  try {
    const rows = await db
      .select({
        payment: payments,
        appointment: appointments,
        shop: shops,
      })
      .from(payments)
      .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
      .innerJoin(shops, eq(shops.id, payments.shopId))
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    row = rows[0] ?? null;
  } catch (error) {
    console.warn("[resolveTransferContext] DB query failed", {
      transferId: transfer.id,
      paymentIntentId,
      error,
    });
    return null;
  }

  // 6. No matching row
  if (!row) {
    console.warn("[resolveTransferContext] No payment found for PaymentIntent", {
      transferId: transfer.id,
      paymentIntentId,
    });
    return null;
  }

  // 7. Return populated context
  return {
    appointmentId: row.appointment.id,
    shopId: row.shop.id,
    shopName: row.shop.name,
    paymentId: row.payment.id,
    connectedAccountId: transfer.destination as string,
    amountCents: transfer.amount,
  };
}
