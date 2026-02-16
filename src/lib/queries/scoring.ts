import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customerScores } from "@/lib/schema";
import type { AppointmentCounts, RecencyData, ScoringStats, Tier } from "@/lib/scoring";

const REFUNDED_REASON = "cancelled_refunded_before_cutoff";
const LATE_CANCEL_REASON = "cancelled_no_refund_after_cutoff";

const emptyCounts = (): AppointmentCounts => ({
  settled: 0,
  voided: 0,
  refunded: 0,
  lateCancels: 0,
});

export async function aggregateAppointmentCounts(
  customerId: string,
  shopId: string,
  windowDays = 180
): Promise<{
  recencyData: RecencyData;
  lastActivityAt: Date | null;
  voidedLast90Days: number;
}> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(last30DaysStart.getDate() - 30);

  const last90DaysStart = new Date(now);
  last90DaysStart.setDate(last90DaysStart.getDate() - 90);

  const rows = await db
    .select({
      status: appointments.status,
      financialOutcome: appointments.financialOutcome,
      resolutionReason: appointments.resolutionReason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, customerId),
        eq(appointments.shopId, shopId),
        gte(appointments.createdAt, windowStart)
      )
    );

  const last30Days = emptyCounts();
  const days31To90 = emptyCounts();
  const over90Days = emptyCounts();

  let lastActivityAt: Date | null = null;
  let voidedLast90Days = 0;

  for (const row of rows) {
    const createdAt = row.createdAt;
    const bucket =
      createdAt >= last30DaysStart
        ? last30Days
        : createdAt >= last90DaysStart
          ? days31To90
          : over90Days;

    if (row.status === "booked" && row.financialOutcome === "settled") {
      bucket.settled += 1;
    } else if (row.financialOutcome === "voided") {
      bucket.voided += 1;
      if (createdAt >= last90DaysStart) {
        voidedLast90Days += 1;
      }
    } else if (row.resolutionReason === REFUNDED_REASON) {
      bucket.refunded += 1;
    } else if (row.resolutionReason === LATE_CANCEL_REASON) {
      bucket.lateCancels += 1;
    }

    if (!lastActivityAt || createdAt > lastActivityAt) {
      lastActivityAt = createdAt;
    }
  }

  return {
    recencyData: {
      last30Days,
      days31To90,
      over90Days,
    },
    lastActivityAt,
    voidedLast90Days,
  };
}

export async function upsertCustomerScore(data: {
  customerId: string;
  shopId: string;
  score: number;
  tier: Tier;
  windowDays: number;
  stats: ScoringStats;
}): Promise<void> {
  await db
    .insert(customerScores)
    .values({
      customerId: data.customerId,
      shopId: data.shopId,
      score: data.score,
      tier: data.tier,
      windowDays: data.windowDays,
      stats: data.stats,
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [customerScores.customerId, customerScores.shopId],
      set: {
        score: data.score,
        tier: data.tier,
        windowDays: data.windowDays,
        stats: data.stats,
        computedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export interface CustomerScore {
  score: number;
  tier: Tier;
  stats: ScoringStats;
  computedAt: Date;
}

type ScoreSelectable = Pick<typeof db, "select">;

const loadCustomerScoreWithDb = async (
  queryable: ScoreSelectable,
  customerId: string,
  shopId: string
): Promise<CustomerScore | null> => {
  const [score] = await queryable
    .select({
      score: customerScores.score,
      tier: customerScores.tier,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customerScores)
    .where(
      and(
        eq(customerScores.customerId, customerId),
        eq(customerScores.shopId, shopId)
      )
    )
    .limit(1);

  if (!score) {
    return null;
  }

  return {
    score: score.score,
    tier: score.tier,
    stats: score.stats,
    computedAt: score.computedAt,
  };
};

export async function loadCustomerScore(
  customerId: string,
  shopId: string
): Promise<CustomerScore | null> {
  return await loadCustomerScoreWithDb(db, customerId, shopId);
}

export async function loadCustomerScoreTx(
  tx: ScoreSelectable,
  customerId: string,
  shopId: string
): Promise<CustomerScore | null> {
  return await loadCustomerScoreWithDb(tx, customerId, shopId);
}
