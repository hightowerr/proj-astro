import { redirect } from "next/navigation";
import { AllAppointmentsTable } from "@/components/dashboard/all-appointments-table";
import { AttentionRequiredTable } from "@/components/dashboard/attention-required-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TierDistributionChart } from "@/components/dashboard/tier-distribution-chart";
import { getDashboardData } from "@/lib/queries/dashboard";
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

  const {
    highRiskAppointments,
    totalUpcoming,
    depositsAtRisk,
    monthlyStats,
    tierDistribution,
    allAppointments,
  } = await getDashboardData(shop.id, periodHours);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="container mx-auto space-y-6 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-text-light-muted">
            Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
          </p>
        </header>

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
