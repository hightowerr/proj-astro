import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { type AppointmentOutcomeCounts, type RecencyBuckets } from "@/lib/no-show-scoring";
import { appointments, customerNoShowStats } from "@/lib/schema";

const REFUNDED_REASON = "cancelled_refunded_before_cutoff";
const LATE_CANCEL_REASON = "cancelled_no_refund_after_cutoff";

const emptyCounts = (): AppointmentOutcomeCounts => ({
  completed: 0,
  noShows: 0,
  lateCancels: 0,
  onTimeCancels: 0,
});

export async function scanAppointmentsByOutcome(
  customerId: string,
  shopId: string,
  windowDays = 180
): Promise<{
  recencyBuckets: RecencyBuckets;
  lastNoShowAt: Date | null;
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
      endsAt: appointments.endsAt,
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
  const days91To180 = emptyCounts();
  let lastNoShowAt: Date | null = null;

  for (const row of rows) {
    const createdAt = row.createdAt;
    const bucket =
      createdAt >= last30DaysStart
        ? last30Days
        : createdAt >= last90DaysStart
          ? days31To90
          : days91To180;

    if (row.status === "booked" && row.financialOutcome === "settled") {
      bucket.completed += 1;
    } else if (
      row.status === "booked" &&
      row.financialOutcome === "unresolved" &&
      row.endsAt < now
    ) {
      bucket.noShows += 1;
      if (!lastNoShowAt || row.endsAt > lastNoShowAt) {
        lastNoShowAt = row.endsAt;
      }
    } else if (row.status === "cancelled" && row.resolutionReason === LATE_CANCEL_REASON) {
      bucket.lateCancels += 1;
    } else if (row.status === "cancelled" && row.resolutionReason === REFUNDED_REASON) {
      bucket.onTimeCancels += 1;
    }
  }

  return {
    recencyBuckets: {
      last30Days,
      days31To90,
      days91To180,
    },
    lastNoShowAt,
  };
}

export async function upsertNoShowStats(data: {
  customerId: string;
  shopId: string;
  stats: {
    totalAppointments: number;
    noShowCount: number;
    lateCancelCount: number;
    onTimeCancelCount: number;
    completedCount: number;
    lastNoShowAt: string | null;
  };
}): Promise<void> {
  await db
    .insert(customerNoShowStats)
    .values({
      customerId: data.customerId,
      shopId: data.shopId,
      totalAppointments: data.stats.totalAppointments,
      noShowCount: data.stats.noShowCount,
      lateCancelCount: data.stats.lateCancelCount,
      onTimeCancelCount: data.stats.onTimeCancelCount,
      completedCount: data.stats.completedCount,
      lastNoShowAt: data.stats.lastNoShowAt ? new Date(data.stats.lastNoShowAt) : null,
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [customerNoShowStats.customerId, customerNoShowStats.shopId],
      set: {
        totalAppointments: data.stats.totalAppointments,
        noShowCount: data.stats.noShowCount,
        lateCancelCount: data.stats.lateCancelCount,
        onTimeCancelCount: data.stats.onTimeCancelCount,
        completedCount: data.stats.completedCount,
        lastNoShowAt: data.stats.lastNoShowAt ? new Date(data.stats.lastNoShowAt) : null,
        computedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getNoShowStats(
  customerId: string,
  shopId: string
): Promise<{
  totalAppointments: number;
  noShowCount: number;
  lateCancelCount: number;
  onTimeCancelCount: number;
  completedCount: number;
  lastNoShowAt: string | null;
} | null> {
  const [stats] = await db
    .select({
      totalAppointments: customerNoShowStats.totalAppointments,
      noShowCount: customerNoShowStats.noShowCount,
      lateCancelCount: customerNoShowStats.lateCancelCount,
      onTimeCancelCount: customerNoShowStats.onTimeCancelCount,
      completedCount: customerNoShowStats.completedCount,
      lastNoShowAt: customerNoShowStats.lastNoShowAt,
    })
    .from(customerNoShowStats)
    .where(
      and(
        eq(customerNoShowStats.customerId, customerId),
        eq(customerNoShowStats.shopId, shopId)
      )
    )
    .limit(1);

  if (!stats) {
    return null;
  }

  return {
    totalAppointments: stats.totalAppointments,
    noShowCount: stats.noShowCount,
    lateCancelCount: stats.lateCancelCount,
    onTimeCancelCount: stats.onTimeCancelCount,
    completedCount: stats.completedCount,
    lastNoShowAt: stats.lastNoShowAt ? stats.lastNoShowAt.toISOString() : null,
  };
}
