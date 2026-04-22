import Link from "next/link";
import { redirect } from "next/navigation";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { DailyLogFeed } from "@/components/dashboard/daily-log-feed";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { getDashboardDailyLog, getDashboardData } from "@/lib/queries/dashboard";
import { getShopByOwnerId } from "@/lib/queries/shops";
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
        <h1 className="text-3xl font-semibold text-al-primary">Dashboard</h1>
        <p className="text-sm text-al-on-surface-variant">
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
      <div className="min-h-screen bg-al-surface-low">
        <div className="max-w-7xl mx-auto space-y-16 px-12 pb-24 py-10">
          {pageHeader}
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
      <div className="max-w-7xl mx-auto space-y-16 px-12 pb-24 py-10">
        {pageHeader}

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
