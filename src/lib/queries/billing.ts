import { cache } from "react";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, payments } from "@/lib/schema";

export interface BillingStats {
  collectedCents: number;
  pendingCents: number;
  refundedCents: number;
  failedCount: number;
}

export interface BillingPaymentRow {
  id: string;
  appointmentId: string;
  createdAt: Date;
  amountCents: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_action"
    | "processing"
    | "succeeded"
    | "failed"
    | "canceled";
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  refundedAmountCents: number;
  refundedAt: Date | null;
  attempts: number;
  customerName: string;
  customerEmail: string;
  appointmentStartsAt: Date;
  financialOutcome:
    | "unresolved"
    | "settled"
    | "voided"
    | "refunded"
    | "disputed";
}

export interface BillingData {
  stats: BillingStats;
  payments: BillingPaymentRow[];
}

async function getBillingStats(shopId: string): Promise<BillingStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [collected, pending, refunded, failed] = await Promise.all([
    db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.shopId, shopId),
          eq(payments.status, "succeeded"),
          gte(payments.createdAt, monthStart)
        )
      ),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.shopId, shopId),
          inArray(payments.status, [
            "requires_payment_method",
            "requires_action",
            "processing",
          ])
        )
      ),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.refundedAmountCents}), 0)`,
      })
      .from(payments)
      .where(
        and(eq(payments.shopId, shopId), gte(payments.refundedAt, monthStart))
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.shopId, shopId),
          eq(payments.status, "failed"),
          gte(payments.createdAt, monthStart)
        )
      ),
  ]);

  return {
    collectedCents: Number(collected[0]?.total ?? 0),
    pendingCents: Number(pending[0]?.total ?? 0),
    refundedCents: Number(refunded[0]?.total ?? 0),
    failedCount: Number(failed[0]?.count ?? 0),
  };
}

async function getBillingPayments(
  shopId: string
): Promise<BillingPaymentRow[]> {
  const rows = await db
    .select({
      id: payments.id,
      appointmentId: payments.appointmentId,
      createdAt: payments.createdAt,
      amountCents: payments.amountCents,
      currency: payments.currency,
      status: payments.status,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      stripeRefundId: payments.stripeRefundId,
      refundedAmountCents: payments.refundedAmountCents,
      refundedAt: payments.refundedAt,
      attempts: payments.attempts,
      customerName: customers.fullName,
      customerEmail: customers.email,
      appointmentStartsAt: appointments.startsAt,
      financialOutcome: appointments.financialOutcome,
    })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(eq(payments.shopId, shopId))
    .orderBy(desc(payments.createdAt));

  return rows;
}

export const getBillingData = cache(
  async (shopId: string): Promise<BillingData> => {
    const [stats, paymentsData] = await Promise.all([
      getBillingStats(shopId),
      getBillingPayments(shopId),
    ]);
    return { stats, payments: paymentsData };
  }
);
