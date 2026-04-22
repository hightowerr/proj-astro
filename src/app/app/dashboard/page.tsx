import Link from "next/link";
import { redirect } from "next/navigation";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { DailyLogFeed } from "@/components/dashboard/daily-log-feed";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { getDashboardDailyLog, getDashboardData } from "@/lib/queries/dashboard";
import { getEventTypesForShop } from "@/lib/queries/event-types";
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
    <nav className="flex w-fit gap-1 rounded-lg bg-al-surface-container p-1">
      <Link
        href="/app/dashboard?view=quick"
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          !isLogView
            ? "bg-al-surface-lowest text-al-primary al-shadow-float"
            : "text-al-on-surface-variant hover:text-foreground"
        )}
      >
        Quick View
      </Link>
      <Link
        href="/app/dashboard?view=log"
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          isLogView
            ? "bg-al-surface-lowest text-al-primary al-shadow-float"
            : "text-al-on-surface-variant hover:text-foreground"
        )}
      >
        Daily Log
      </Link>
    </nav>
  );

  const header = (
    <header className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-al-primary font-manrope">Dashboard</h1>
        <p className="text-sm text-al-on-surface-variant">
          Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
        </p>
      </div>
      <DashboardSearch />
    </header>
  );

  if (isLogView) {
    const logItems = await getDashboardDailyLog(shop.id, { days: 7, limit: 50 });

    return (
      <div className="min-h-screen bg-al-surface-low">
        <div className="container mx-auto space-y-6 px-4 py-10">
          {header}
          {tabSwitcher}
          <DailyLogFeed items={logItems} />
        </div>
      </div>
    );
  }

  const periodHours = parsePeriod(period);

  const [dashboardData, activeEventTypes] = await Promise.all([
    getDashboardData(shop.id, periodHours),
    getEventTypesForShop(shop.id, { isActive: true }),
  ]);

  const {
    highRiskAppointments,
    totalUpcoming,
    depositsAtRisk,
    highRiskCustomerCount,
    monthlyStats,
    tierDistribution,
    allAppointments,
  } = dashboardData;

  const hasOnlyDefaultServices =
    activeEventTypes.length > 0 &&
    activeEventTypes.every((eventType) => eventType.isDefault);

  return (
    <div className="min-h-screen bg-al-surface-low">
      <div className="container mx-auto space-y-6 px-4 py-10">
        {header}
        {tabSwitcher}

        {hasOnlyDefaultServices ? (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-amber-50 px-4 py-3 al-shadow-float">
            <p className="text-sm text-amber-800">
              Your booking page is using a default service. Set up your real services to show customers accurate durations and names.
            </p>
            <a
              href="/app/settings/services"
              className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Set up services
            </a>
          </div>
        ) : null}

        <AttentionRequiredTable appointments={highRiskAppointments} currentPeriod={periodHours} />

        <SummaryCards
          totalUpcoming={totalUpcoming}
          highRiskCustomerCount={highRiskCustomerCount}
          depositsAtRisk={depositsAtRisk}
          monthlyStats={monthlyStats}
        />

        <TierDistributionChart distribution={tierDistribution} />

        <AllAppointmentsTable appointments={allAppointments} />
      </div>
    </div>
  );
}
