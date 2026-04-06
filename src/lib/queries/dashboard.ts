import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getCached } from "@/lib/cache";
import { db } from "@/lib/db";
import { appointments, customerContactPrefs, customers, customerScores, payments } from "@/lib/schema";
import type {
  DashboardData,
  DashboardAppointment,
  DashboardFilters,
  DashboardMonthlyStats,
  DashboardSort,
  DashboardTierDistribution,
} from "@/types/dashboard";

const UPCOMING_WINDOW_DAYS = 30;
const HIGH_RISK_SCORE_THRESHOLD = 40;
const HIGH_RISK_VOIDS_THRESHOLD = 2;
const TIER_DISTRIBUTION_CACHE_TTL_SECONDS = 5 * 60;

const highRiskCondition = sql<boolean>`(
  ${customerScores.tier} = 'risk' OR
  ${customerScores.score} < ${HIGH_RISK_SCORE_THRESHOLD} OR
  COALESCE((${customerScores.stats} ->> 'voidedLast90Days')::int, 0) >= ${HIGH_RISK_VOIDS_THRESHOLD}
)`;

const baseAppointmentSelect = {
  id: appointments.id,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  customerName: customers.fullName,
  customerEmail: customers.email,
  customerPhone: customers.phone,
  customerTier: customerScores.tier,
  customerScore: customerScores.score,
  voidedLast90Days: sql<number>`COALESCE((${customerScores.stats} ->> 'voidedLast90Days')::int, 0)`,
  confirmationStatus: appointments.confirmationStatus,
  bookingUrl: appointments.bookingUrl,
  smsOptIn: sql<boolean>`COALESCE(${customerContactPrefs.smsOptIn}, false)`,
};

const dashboardAppointmentSelect = {
  ...baseAppointmentSelect,
  depositAmount: sql<number>`COALESCE(${payments.amountCents}, 0)`,
};

export const getTierDistributionCacheKey = (shopId: string) =>
  `dashboard:tier-distribution:${shopId}`;

export async function getHighRiskAppointments(
  shopId: string,
  periodHours: number
): Promise<DashboardAppointment[]> {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  return await db
    .select(baseAppointmentSelect)
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
    )
    .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        highRiskCondition
      )
    )
    .orderBy(asc(appointments.startsAt));
}

export async function getTotalUpcomingCount(shopId: string): Promise<number> {
  const now = new Date();
  const endDate = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate)
      )
    );

  return result?.count ?? 0;
}

export async function getHighRiskCount(shopId: string, periodHours: number): Promise<number> {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
    )
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        highRiskCondition
      )
    );

  return result?.count ?? 0;
}

export async function getDepositsAtRisk(shopId: string, periodHours: number): Promise<number> {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)::int`,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
    )
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        highRiskCondition
      )
    );

  return result?.total ?? 0;
}

export async function getMonthlyFinancialStats(shopId: string): Promise<DashboardMonthlyStats> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const rows = await db
    .select({
      financialOutcome: appointments.financialOutcome,
      total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)::int`,
    })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.endsAt, firstDayOfMonth),
        lte(appointments.endsAt, lastDayOfMonth)
      )
    )
    .groupBy(appointments.financialOutcome);

  return {
    depositsRetained: rows.find((row) => row.financialOutcome === "settled")?.total ?? 0,
    refundsIssued: rows.find((row) => row.financialOutcome === "refunded")?.total ?? 0,
  };
}

export async function getTierDistribution(shopId: string): Promise<DashboardTierDistribution> {
  return getCached(
    getTierDistributionCacheKey(shopId),
    TIER_DISTRIBUTION_CACHE_TTL_SECONDS,
    async () => {
      const normalizedTier =
        sql<"top" | "neutral" | "risk">`COALESCE(${customerScores.tier}, 'neutral')`;

      const rows = await db
        .select({
          tier: normalizedTier,
          count: sql<number>`count(*)::int`,
        })
        .from(customers)
        .leftJoin(
          customerScores,
          and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, shopId))
        )
        .where(eq(customers.shopId, shopId))
        .groupBy(normalizedTier);

      return {
        top: rows.find((row) => row.tier === "top")?.count ?? 0,
        neutral: rows.find((row) => row.tier === "neutral")?.count ?? 0,
        risk: rows.find((row) => row.tier === "risk")?.count ?? 0,
      };
    }
  );
}

export async function getDashboardData(
  shopId: string,
  periodHours: number
): Promise<DashboardData> {
  const now = new Date();
  const upcomingWindowEnd = new Date(
    now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const highRiskWindowEnd = new Date(now.getTime() + Math.max(0, periodHours) * 60 * 60 * 1000);

  const [allAppointmentsRaw, monthlyStats, tierDistribution] = await Promise.all([
    db
      .select(dashboardAppointmentSelect)
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(
        customerScores,
        and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
      )
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
      .where(
        and(
          eq(appointments.shopId, shopId),
          eq(appointments.status, "booked"),
          gte(appointments.startsAt, now),
          lte(appointments.startsAt, upcomingWindowEnd)
        )
      )
      .orderBy(asc(appointments.startsAt)),
    getMonthlyFinancialStats(shopId),
    getTierDistribution(shopId),
  ]);

  const highRiskAppointments: DashboardAppointment[] = [];
  let depositsAtRisk = 0;

  for (const appointment of allAppointmentsRaw) {
    const isHighRisk =
      appointment.startsAt <= highRiskWindowEnd &&
      (appointment.customerTier === "risk" ||
        (appointment.customerScore !== null && appointment.customerScore < HIGH_RISK_SCORE_THRESHOLD) ||
        appointment.voidedLast90Days >= HIGH_RISK_VOIDS_THRESHOLD);

    if (isHighRisk) {
      highRiskAppointments.push(appointment);
      depositsAtRisk += appointment.depositAmount;
    }
  }

  return {
    highRiskAppointments,
    totalUpcoming: allAppointmentsRaw.length,
    depositsAtRisk,
    monthlyStats,
    tierDistribution,
    allAppointments: allAppointmentsRaw,
  };
}

export async function getAllUpcomingAppointments(
  shopId: string,
  filters: DashboardFilters = {},
  sort: DashboardSort = { field: "time", direction: "asc" }
): Promise<DashboardAppointment[]> {
  const now = new Date();
  const endDate = filters.timeRange
    ? new Date(now.getTime() + filters.timeRange * 60 * 60 * 1000)
    : new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const whereClauses = [
    eq(appointments.shopId, shopId),
    eq(appointments.status, "booked"),
    gte(appointments.startsAt, now),
    lte(appointments.startsAt, endDate),
  ];

  if (filters.tier && filters.tier !== "all") {
    if (filters.tier === "neutral") {
      whereClauses.push(sql`COALESCE(${customerScores.tier}, 'neutral') = 'neutral'`);
    } else {
      whereClauses.push(eq(customerScores.tier, filters.tier));
    }
  }

  const query = db
    .select(baseAppointmentSelect)
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
    )
    .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
    .where(and(...whereClauses));

  if (sort.field === "score") {
    const scoreSort = sql<number>`COALESCE(${customerScores.score}, -1)`;
    return await query.orderBy(
      sort.direction === "asc" ? asc(scoreSort) : desc(scoreSort),
      asc(appointments.startsAt)
    );
  }

  if (sort.field === "tier") {
    const tierSort = sql<number>`CASE COALESCE(${customerScores.tier}, 'neutral')
      WHEN 'top' THEN 1
      WHEN 'neutral' THEN 2
      ELSE 3
    END`;

    return await query.orderBy(
      sort.direction === "asc" ? asc(tierSort) : desc(tierSort),
      asc(appointments.startsAt)
    );
  }

  return await query.orderBy(
    sort.direction === "asc" ? asc(appointments.startsAt) : desc(appointments.startsAt)
  );
}
