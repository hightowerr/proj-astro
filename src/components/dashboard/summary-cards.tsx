import type { DashboardMonthlyStats } from "@/types/dashboard";

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

interface SummaryCardsProps {
  totalUpcoming: number;
  highRiskCount: number;
  depositsAtRisk: number;
  monthlyStats: DashboardMonthlyStats;
}

export function SummaryCards({
  totalUpcoming,
  highRiskCount,
  depositsAtRisk,
  monthlyStats,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-lg border border-white/10 bg-bg-dark-secondary p-5">
        <h3 className="text-xs font-medium uppercase text-text-light-muted">Total Upcoming (30d)</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{totalUpcoming}</p>
      </article>

      <article className="rounded-lg border border-red-500/30 bg-bg-dark-secondary p-5">
        <h3 className="text-xs font-medium uppercase text-red-300">High-Risk Appointments</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-red-200">{highRiskCount}</p>
      </article>

      <article className="rounded-lg border border-amber-500/30 bg-bg-dark-secondary p-5">
        <h3 className="text-xs font-medium uppercase text-amber-300">Deposits at Risk</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-200">
          {formatCurrency(depositsAtRisk)}
        </p>
      </article>

      <article className="rounded-lg border border-white/10 bg-bg-dark-secondary p-5">
        <h3 className="text-xs font-medium uppercase text-text-light-muted">This Month</h3>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-light-muted">Retained</span>
            <span className="font-semibold text-green-300">
              {formatCurrency(monthlyStats.depositsRetained)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-light-muted">Refunded</span>
            <span className="font-semibold text-red-300">
              {formatCurrency(monthlyStats.refundsIssued)}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
