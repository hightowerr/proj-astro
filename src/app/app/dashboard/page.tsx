import { redirect } from "next/navigation";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getEventTypesForShop } from "@/lib/queries/event-types";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

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
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    redirect("/app");
  }

  const { period } = await searchParams;
  const periodHours = parsePeriod(period);

  const [dashboardData, activeEventTypes] = await Promise.all([
    getDashboardData(shop.id, periodHours),
    getEventTypesForShop(shop.id, { isActive: true }),
  ]);

  const {
    highRiskAppointments,
    totalUpcoming,
    depositsAtRisk,
    monthlyStats,
    tierDistribution,
    allAppointments,
  } = dashboardData;

  const hasOnlyDefaultServices =
    activeEventTypes.length > 0 &&
    activeEventTypes.every((eventType) => eventType.isDefault);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="container mx-auto space-y-6 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-text-light-muted">
            Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
          </p>
        </header>

        {hasOnlyDefaultServices ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <p className="text-sm text-yellow-200">
              Your booking page is using a default service. Set up your real services to show customers accurate durations and names.
            </p>
            <a
              href="/app/settings/services"
              className="shrink-0 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-bg-dark transition-colors hover:bg-yellow-400"
            >
              Set up services
            </a>
          </div>
        ) : null}

        <AttentionRequiredTable appointments={highRiskAppointments} currentPeriod={periodHours} />

        <SummaryCards
          totalUpcoming={totalUpcoming}
          highRiskCount={highRiskAppointments.length}
          depositsAtRisk={depositsAtRisk}
          monthlyStats={monthlyStats}
        />

        <TierDistributionChart distribution={tierDistribution} />

        <AllAppointmentsTable appointments={allAppointments} />
      </div>
    </div>
  );
}
