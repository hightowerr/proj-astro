# V1: Dashboard UI - Basic Layout

Build a working dashboard page that displays high-risk appointments and supporting metrics.

---

## What Gets Built

- Dashboard page at `/app/dashboard` with four main sections:
  1. Attention Required table (high-risk appointments)
  2. Summary cards (4 metrics)
  3. Tier distribution chart (donut)
  4. All Appointments table (filterable, sortable)
- Time period selector for Attention Required section
- Filter and sort controls for All Appointments
- Database queries for all metrics

---

## Demo

After implementing this slice, you can:

1. Navigate to `/app/dashboard`
2. See Attention Required section showing high-risk appointments
3. Select different time periods (24h, 3 days, 7 days, 14 days)
4. View summary cards: total appointments, high-risk count, deposits at risk, monthly stats
5. See tier distribution donut chart (green/yellow/red)
6. Scroll to All Appointments table
7. Filter appointments by tier
8. Sort by time, risk score, or tier

---

## Implementation Steps

### Step 1: Create Dashboard Queries

Create `src/lib/queries/dashboard.ts`:

```typescript
import { db } from "@/lib/db";
import { appointments, customers, payments } from "@/lib/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";

/**
 * Get high-risk appointments within a time period
 * High-risk = tier='risk' OR score<40 OR voidedLast90Days>=2
 */
export async function getHighRiskAppointments(shopId: string, periodHours: number) {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  const results = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      serviceName: appointments.serviceName,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerTier: customers.tier,
      customerScore: customers.score,
      voidedLast90Days: customers.voidedLast90Days,
      confirmationStatus: sql<string>`'none'`, // V1: always 'none' (no confirmation system yet)
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        sql`(
          ${customers.tier} = 'risk' OR
          ${customers.score} < 40 OR
          ${customers.voidedLast90Days} >= 2
        )`
      )
    )
    .orderBy(asc(appointments.startsAt));

  return results;
}

/**
 * Get total upcoming appointments count (next 30 days)
 */
export async function getTotalUpcomingCount(shopId: string) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, thirtyDaysFromNow)
      )
    );

  return result[0]?.count || 0;
}

/**
 * Get high-risk appointments count for selected period
 */
export async function getHighRiskCount(shopId: string, periodHours: number) {
  const appointments = await getHighRiskAppointments(shopId, periodHours);
  return appointments.length;
}

/**
 * Get total deposits at risk (sum of deposits for high-risk appointments)
 */
export async function getDepositsAtRisk(shopId: string, periodHours: number) {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.depositAmount}), 0)`,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(payments, eq(appointments.paymentId, payments.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        sql`(
          ${customers.tier} = 'risk' OR
          ${customers.score} < 40 OR
          ${customers.voidedLast90Days} >= 2
        )`
      )
    );

  return result[0]?.total || 0;
}

/**
 * Get monthly financial stats (deposits retained, refunds issued)
 */
export async function getMonthlyFinancialStats(shopId: string) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const results = await db
    .select({
      financialOutcome: appointments.financialOutcome,
      total: sql<number>`COALESCE(SUM(${payments.depositAmount}), 0)`,
    })
    .from(appointments)
    .innerJoin(payments, eq(appointments.paymentId, payments.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.endsAt, firstDayOfMonth),
        lte(appointments.endsAt, lastDayOfMonth)
      )
    )
    .groupBy(appointments.financialOutcome);

  const depositsRetained = results.find((r) => r.financialOutcome === "settled")?.total || 0;
  const refundsIssued = results.find((r) => r.financialOutcome === "refunded")?.total || 0;

  return {
    depositsRetained,
    refundsIssued,
  };
}

/**
 * Get tier distribution across all customers for this shop
 */
export async function getTierDistribution(shopId: string) {
  // Get all customer IDs who have booked with this shop
  const shopCustomers = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.shopId, shopId))
    .groupBy(appointments.customerId);

  const customerIds = shopCustomers.map((c) => c.customerId);

  if (customerIds.length === 0) {
    return { top: 0, neutral: 0, risk: 0 };
  }

  const results = await db
    .select({
      tier: customers.tier,
      count: sql<number>`count(*)`,
    })
    .from(customers)
    .where(sql`${customers.id} IN ${customerIds}`)
    .groupBy(customers.tier);

  const distribution = {
    top: results.find((r) => r.tier === "top")?.count || 0,
    neutral: results.find((r) => r.tier === "neutral" || r.tier === null)?.count || 0,
    risk: results.find((r) => r.tier === "risk")?.count || 0,
  };

  return distribution;
}

/**
 * Get all upcoming appointments with filters and sorting
 */
export async function getAllUpcomingAppointments(
  shopId: string,
  filters: {
    tier?: "top" | "neutral" | "risk" | "all";
    timeRange?: number; // hours
  },
  sort: {
    field: "time" | "score" | "tier";
    direction: "asc" | "desc";
  }
) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endDate = filters.timeRange
    ? new Date(now.getTime() + filters.timeRange * 60 * 60 * 1000)
    : thirtyDaysFromNow;

  let query = db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      serviceName: appointments.serviceName,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerTier: customers.tier,
      customerScore: customers.score,
      voidedLast90Days: customers.voidedLast90Days,
      confirmationStatus: sql<string>`'none'`, // V1: always 'none'
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        filters.tier && filters.tier !== "all"
          ? eq(customers.tier, filters.tier)
          : undefined
      )
    );

  // Apply sorting
  if (sort.field === "time") {
    query = query.orderBy(
      sort.direction === "asc" ? asc(appointments.startsAt) : desc(appointments.startsAt)
    );
  } else if (sort.field === "score") {
    query = query.orderBy(
      sort.direction === "asc" ? asc(customers.score) : desc(customers.score)
    );
  } else if (sort.field === "tier") {
    query = query.orderBy(
      sort.direction === "asc" ? asc(customers.tier) : desc(customers.tier)
    );
  }

  return await query;
}
```

### Step 2: Create Dashboard Page

Create `/app/app/dashboard/page.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shops } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getHighRiskAppointments,
  getTotalUpcomingCount,
  getHighRiskCount,
  getDepositsAtRisk,
  getMonthlyFinancialStats,
  getTierDistribution,
  getAllUpcomingAppointments,
} from "@/lib/queries/dashboard";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  // Get shop for this user
  const shop = await db.query.shops.findFirst({
    where: eq(shops.userId, session.user.id),
  });

  if (!shop) {
    redirect("/app/onboarding");
  }

  // Parse period (default to 7 days = 168 hours)
  const periodHours = parseInt(searchParams.period || "168");

  // Fetch all data in parallel
  const [
    highRiskAppointments,
    totalUpcoming,
    highRiskCount,
    depositsAtRisk,
    monthlyStats,
    tierDistribution,
    allAppointments,
  ] = await Promise.all([
    getHighRiskAppointments(shop.id, periodHours),
    getTotalUpcomingCount(shop.id),
    getHighRiskCount(shop.id, periodHours),
    getDepositsAtRisk(shop.id, periodHours),
    getMonthlyFinancialStats(shop.id),
    getTierDistribution(shop.id),
    getAllUpcomingAppointments(
      shop.id,
      {},
      { field: "time", direction: "asc" }
    ),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Attention Required Section */}
      <AttentionRequiredTable
        appointments={highRiskAppointments}
        currentPeriod={periodHours}
      />

      {/* Summary Cards */}
      <SummaryCards
        totalUpcoming={totalUpcoming}
        highRiskCount={highRiskCount}
        depositsAtRisk={depositsAtRisk}
        monthlyStats={monthlyStats}
      />

      {/* Tier Distribution Chart */}
      <TierDistributionChart distribution={tierDistribution} />

      {/* All Appointments Table */}
      <AllAppointmentsTable appointments={allAppointments} />
    </div>
  );
}
```

### Step 3: Create Attention Required Table Component

Create `src/components/dashboard/attention-required-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Appointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: "top" | "neutral" | "risk" | null;
  customerScore: number;
  voidedLast90Days: number;
  confirmationStatus: string;
};

export function AttentionRequiredTable({
  appointments,
  currentPeriod,
}: {
  appointments: Appointment[];
  currentPeriod: number;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState(currentPeriod);

  const handlePeriodChange = (newPeriod: number) => {
    setPeriod(newPeriod);
    router.push(`/app/dashboard?period=${newPeriod}`);
  };

  const getTierBadge = (tier: string | null) => {
    if (tier === "top") {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
          Top
        </span>
      );
    }
    if (tier === "risk") {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
          Risk
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
        Neutral
      </span>
    );
  };

  const getConfirmationBadge = (status: string) => {
    // V1: Always shows "None" - V3 will implement actual statuses
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
        None
      </span>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Attention Required</h2>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value={24}>Next 24 hours</option>
          <option value={72}>Next 3 days</option>
          <option value={168}>Next 7 days</option>
          <option value={336}>Next 14 days</option>
        </select>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No high-risk appointments in this period. Great job!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No-shows (90d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confirmation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appointment.customerName}</span>
                      {getTierBadge(appointment.customerTier)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(appointment.startsAt), "MMM d, h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.customerScore}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.voidedLast90Days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getConfirmationBadge(appointment.confirmationStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* V1: Empty - V2 will add action buttons */}
                    <div className="text-gray-400">—</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Create Summary Cards Component

Create `src/components/dashboard/summary-cards.tsx`:

```typescript
export function SummaryCards({
  totalUpcoming,
  highRiskCount,
  depositsAtRisk,
  monthlyStats,
}: {
  totalUpcoming: number;
  highRiskCount: number;
  depositsAtRisk: number;
  monthlyStats: {
    depositsRetained: number;
    refundsIssued: number;
  };
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Assuming amounts stored in cents
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Upcoming */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-sm font-medium text-gray-500 mb-1">
          Total Upcoming (30d)
        </div>
        <div className="text-3xl font-bold">{totalUpcoming}</div>
      </div>

      {/* High-Risk Count */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="text-sm font-medium text-gray-500 mb-1">
          High-Risk Appointments
        </div>
        <div className="text-3xl font-bold text-red-600">{highRiskCount}</div>
      </div>

      {/* Deposits at Risk */}
      <div className="bg-white border border-orange-200 rounded-lg p-6">
        <div className="text-sm font-medium text-gray-500 mb-1">
          Deposits at Risk
        </div>
        <div className="text-3xl font-bold text-orange-600">
          {formatCurrency(depositsAtRisk)}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-sm font-medium text-gray-500 mb-1">This Month</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Retained:</span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(monthlyStats.depositsRetained)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Refunded:</span>
            <span className="text-sm font-semibold text-red-600">
              {formatCurrency(monthlyStats.refundsIssued)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Create Tier Distribution Chart Component

Create `src/components/dashboard/tier-distribution-chart.tsx`:

```typescript
"use client";

export function TierDistributionChart({
  distribution,
}: {
  distribution: {
    top: number;
    neutral: number;
    risk: number;
  };
}) {
  const total = distribution.top + distribution.neutral + distribution.risk;

  if (total === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h3 className="text-lg font-semibold mb-4">Customer Tier Distribution</h3>
        <p className="text-gray-500">No customer data available yet.</p>
      </div>
    );
  }

  const topPercent = ((distribution.top / total) * 100).toFixed(0);
  const neutralPercent = ((distribution.neutral / total) * 100).toFixed(0);
  const riskPercent = ((distribution.risk / total) * 100).toFixed(0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Customer Tier Distribution</h3>

      <div className="flex items-center gap-8">
        {/* Simple horizontal bar chart */}
        <div className="flex-1">
          <div className="h-8 flex rounded-lg overflow-hidden">
            {distribution.top > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${topPercent}%` }}
                title={`Top: ${distribution.top}`}
              />
            )}
            {distribution.neutral > 0 && (
              <div
                className="bg-yellow-500"
                style={{ width: `${neutralPercent}%` }}
                title={`Neutral: ${distribution.neutral}`}
              />
            )}
            {distribution.risk > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${riskPercent}%` }}
                title={`Risk: ${distribution.risk}`}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm">
              Top: {distribution.top} ({topPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded" />
            <span className="text-sm">
              Neutral: {distribution.neutral} ({neutralPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-sm">
              Risk: {distribution.risk} ({riskPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Create All Appointments Table Component

Create `src/components/dashboard/all-appointments-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import { format } from "date-fns";

type Appointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: "top" | "neutral" | "risk" | null;
  customerScore: number;
  voidedLast90Days: number;
  confirmationStatus: string;
};

export function AllAppointmentsTable({
  appointments: initialAppointments,
}: {
  appointments: Appointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"time" | "score" | "tier">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const getTierBadge = (tier: string | null) => {
    if (tier === "top") {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
          Top
        </span>
      );
    }
    if (tier === "risk") {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
          Risk
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
        Neutral
      </span>
    );
  };

  // Client-side filtering and sorting
  let filteredAppointments = [...appointments];

  if (tierFilter !== "all") {
    filteredAppointments = filteredAppointments.filter(
      (a) => (a.customerTier || "neutral") === tierFilter
    );
  }

  filteredAppointments.sort((a, b) => {
    if (sortField === "time") {
      const aTime = new Date(a.startsAt).getTime();
      const bTime = new Date(b.startsAt).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    }
    if (sortField === "score") {
      return sortDirection === "asc"
        ? a.customerScore - b.customerScore
        : b.customerScore - a.customerScore;
    }
    if (sortField === "tier") {
      const tierOrder = { top: 1, neutral: 2, risk: 3 };
      const aTier = tierOrder[a.customerTier || "neutral"];
      const bTier = tierOrder[b.customerTier || "neutral"];
      return sortDirection === "asc" ? aTier - bTier : bTier - aTier;
    }
    return 0;
  });

  const handleSort = (field: "time" | "score" | "tier") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">All Upcoming Appointments</h2>
        <div className="flex items-center gap-4">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Tiers</option>
            <option value="top">Top Only</option>
            <option value="neutral">Neutral Only</option>
            <option value="risk">Risk Only</option>
          </select>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No appointments found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("time")}
                >
                  Time {sortField === "time" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("score")}
                >
                  Score {sortField === "score" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No-shows (90d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appointment.customerName}</span>
                      {getTierBadge(appointment.customerTier)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(appointment.startsAt), "MMM d, h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.customerScore}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.voidedLast90Days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* V1: Empty - V2 will add action buttons */}
                    <div className="text-gray-400">—</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Step 7: Update Navigation

Add a link to the dashboard in your main navigation. Modify `src/components/site-header.tsx` or wherever your navigation lives:

```typescript
<Link href="/app/dashboard" className="...">
  Dashboard
</Link>
```

### Step 8: Run Lint and Typecheck

```bash
pnpm lint
pnpm typecheck
```

Fix any issues that arise.

---

## Testing

### Unit Tests

Create `src/lib/queries/__tests__/dashboard.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  getHighRiskAppointments,
  getTotalUpcomingCount,
  getDepositsAtRisk,
  getTierDistribution,
} from "../dashboard";
import { shops, customers, appointments, payments } from "@/lib/schema";

describe("Dashboard Queries", () => {
  let testShopId: string;
  let testCustomerId: string;

  beforeEach(async () => {
    // Setup test data
    const [shop] = await db
      .insert(shops)
      .values({
        userId: "test-user",
        name: "Test Shop",
        slug: "test-shop",
      })
      .returning();
    testShopId = shop.id;

    const [customer] = await db
      .insert(customers)
      .values({
        phone: "+15555551234",
        name: "Test Customer",
        tier: "risk",
        score: 30,
        voidedLast90Days: 3,
      })
      .returning();
    testCustomerId = customer.id;
  });

  it("should fetch high-risk appointments", async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now

    await db.insert(appointments).values({
      shopId: testShopId,
      customerId: testCustomerId,
      startsAt: futureDate,
      endsAt: new Date(futureDate.getTime() + 60 * 60 * 1000),
      serviceName: "Test Service",
      status: "booked",
    });

    const results = await getHighRiskAppointments(testShopId, 168); // 7 days

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].customerTier).toBe("risk");
  });

  it("should count total upcoming appointments", async () => {
    const count = await getTotalUpcomingCount(testShopId);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // Add more tests...
});
```

### E2E Tests

Create `tests/e2e/dashboard.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto("/");
    // ... login flow
    await page.goto("/app/dashboard");
  });

  test("should display all dashboard sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attention Required" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer Tier Distribution" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "All Upcoming Appointments" })).toBeVisible();
  });

  test("should change time period for attention required", async ({ page }) => {
    await page.selectOption('select[name="period"]', "24"); // 24 hours
    await page.waitForURL("**/dashboard?period=24");
    // Verify table updates
  });

  test("should filter appointments by tier", async ({ page }) => {
    await page.selectOption('select[name="tier"]', "risk");
    // Verify only risk tier appointments shown
  });

  test("should sort appointments by score", async ({ page }) => {
    await page.click("th:has-text('Score')");
    // Verify sorting order
  });
});
```

---

## Acceptance Criteria

- [ ] Dashboard page accessible at `/app/dashboard`
- [ ] Attention Required section shows high-risk appointments (risk tier OR score<40 OR voids≥2)
- [ ] Time period selector works (24h, 3d, 7d, 14d)
- [ ] Summary cards display correct metrics
- [ ] Tier distribution chart shows customer breakdown
- [ ] All Appointments table shows all upcoming appointments
- [ ] Tier filter works (all/top/neutral/risk)
- [ ] Sorting works (time, score, tier)
- [ ] Empty states display when no data
- [ ] All queries optimized (use joins, not N+1)
- [ ] Lint and typecheck pass
- [ ] Unit tests pass
- [ ] E2E tests pass

---

## Next Steps

After completing V1, move to V2 to add View and Contact action buttons.
