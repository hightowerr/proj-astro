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

  const stickyHeader = (
    <header className="sticky top-0 z-30 bg-al-surface-low/80 backdrop-blur-xl px-12 py-6 flex items-center gap-6 w-full border-b border-al-outline-variant/10 transition-all duration-300">
      <div className="flex-1 max-w-md">
        <DashboardSearch />
      </div>
      {tabSwitcher}
    </header>
  );

  const heroSection = (
    <section className="space-y-4">
      <h2 className="text-[3.5rem] font-bold text-al-primary tracking-tighter leading-tight font-manrope">
        Welcome back, {shop.name}
      </h2>
      <p className="text-al-on-surface-variant text-lg max-w-2xl leading-relaxed">
        Here is a curated overview of your studio&apos;s upcoming engagements and critical client touchpoints.
      </p>
    </section>
  );

  if (isLogView) {
    const logItems = await getDashboardDailyLog(shop.id, { days: 7, limit: 50 });

    return (
      <div className="min-h-screen bg-al-surface-low">
        {stickyHeader}
        <div className="px-12 pb-24 max-w-7xl mx-auto space-y-16 py-10">
          {heroSection}
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
      {stickyHeader}
      <div className="px-12 pb-24 max-w-7xl mx-auto space-y-16 py-10">
        {heroSection}

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
