import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { ConnectCard } from "@/components/dashboard/connect-card";
import { DailyLogFeed } from "@/components/dashboard/daily-log-feed";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { TransferHeldCard } from "@/components/dashboard/transfer-held-card";
import { db } from "@/lib/db";
import { getDashboardDailyLog, getDashboardData } from "@/lib/queries/dashboard";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = new Set([24, 72, 168, 336]);

function parsePeriod(value?: string): number {
  if (!value) return 168;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !PERIOD_OPTIONS.has(parsed)) {
    return 168;
  }

  return parsed;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    redirect("/app");
  }

  // Connect card gate queries — run in parallel, independent of view/period
  const transferHeldWhere = and(
    eq(appointments.shopId, shop.id),
    eq(appointments.transferHeld, true),
    ne(appointments.financialOutcome, "refunded"),
  );

  const [
    hasServicesResult,
    hasAvailabilityResult,
    unprotectedCountResult,
    heldCountResult,
    heldFirstResult,
  ] = await Promise.all([
      db.query.eventTypes.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.shopId, shop.id), eq(t.isActive, true)),
        columns: { id: true },
      }),
      db.query.shopHours.findFirst({
        where: (t, { eq }) => eq(t.shopId, shop.id),
        columns: { id: true },
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.shopId, shop.id),
            eq(appointments.status, "booked"),
            // Pre-migration fallback: depositSkipped IS NULL + paymentStatus = 'unpaid'
            // captures bookings created before the column existed.
            // Becomes inert once all pre-migration merchants complete Connect.
            or(
              eq(appointments.depositSkipped, "connect_not_complete"),
              and(
                isNull(appointments.depositSkipped),
                eq(appointments.paymentStatus, "unpaid")
              )
            )
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(transferHeldWhere),
      db
        .select({ id: appointments.id })
        .from(appointments)
        .where(transferHeldWhere)
        .limit(1),
    ]);

  const heldTransferCount = heldCountResult[0]?.count ?? 0;
  const heldFirstAppointmentId = heldFirstResult[0]?.id;

  const connectCardProps = {
    stripeOnboardingStatus: shop.stripeOnboardingStatus,
    hasServices: !!hasServicesResult,
    hasAvailability: !!hasAvailabilityResult,
    unprotectedBookingCount: unprotectedCountResult[0]?.count ?? 0,
  };

  const { period, view } = await searchParams;
  const isLogView = view === "log";

  const tabSwitcher = (
    <nav className="flex w-fit gap-1 rounded-lg bg-al-surface-container p-1 border border-al-outline-variant/20">
      <Link
        href="/app/dashboard?view=quick"
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
          !isLogView
            ? "bg-white text-al-primary shadow-sm"
            : "text-al-on-surface-variant hover:text-foreground"
        )}
      >
        Quick View
      </Link>
      <Link
        href="/app/dashboard?view=log"
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
          isLogView
            ? "bg-white text-al-primary shadow-sm"
            : "text-al-on-surface-variant hover:text-foreground"
        )}
      >
        Daily Log
      </Link>
    </nav>
  );

  const pageHeader = (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="al-page-title">Dashboard</h1>
        <p className="al-lede">
          Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
        </p>
      </div>
      <DashboardSearch />
      {tabSwitcher}
    </section>
  );

  if (isLogView) {
    const logItems = await getDashboardDailyLog(shop.id, { days: 7, limit: 50 });

    return (
      <div>
        <div className="max-w-7xl mx-auto space-y-16 px-12 pb-24 py-8">
          {pageHeader}
          <ConnectCard {...connectCardProps} />
          <TransferHeldCard count={heldTransferCount} appointmentId={heldFirstAppointmentId} />
          <DailyLogFeed items={logItems} />
        </div>
      </div>
    );
  }

  const periodHours = parsePeriod(period);

  const dashboardData = await getDashboardData(shop.id, periodHours);

  const {
    highRiskAppointments,
    totalUpcoming,
    depositsAtRisk,
    highRiskCustomerCount,
    monthlyStats,
    tierDistribution,
    allAppointments,
  } = dashboardData;

  return (
    <div className="min-h-screen bg-al-surface-low">
      <div className="max-w-7xl mx-auto space-y-16 px-12 pb-24 py-8">
        {pageHeader}

        <ConnectCard {...connectCardProps} />

        <TransferHeldCard count={heldTransferCount} appointmentId={heldFirstAppointmentId} />

        <SummaryCards
          totalUpcoming={totalUpcoming}
          highRiskCustomerCount={highRiskCustomerCount}
          depositsAtRisk={depositsAtRisk}
          monthlyStats={monthlyStats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <AttentionRequiredTable appointments={highRiskAppointments} currentPeriod={periodHours} />
          </div>
          <div>
            <TierDistributionChart distribution={tierDistribution} />
          </div>
        </div>

        <AllAppointmentsTable appointments={allAppointments} />
      </div>
    </div>
  );
}
