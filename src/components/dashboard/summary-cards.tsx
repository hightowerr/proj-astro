import type { DashboardMonthlyStats } from "@/types/dashboard";

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function renderDepositsAtRisk(depositsAtRisk: Record<string, number>): string {
  const entries = Object.entries(depositsAtRisk);

  if (entries.length === 0) return formatCurrency(0, "USD");

  if (entries.length === 1) {
    const [currency, amountCents] = entries[0]!;
    return formatCurrency(amountCents, currency);
  }

  return "Multiple currencies";
}

interface SummaryCardsProps {
  totalUpcoming: number;
  highRiskCustomerCount: number;
  depositsAtRisk: Record<string, number>;
  monthlyStats: DashboardMonthlyStats;
}

export function SummaryCards({
  totalUpcoming,
  highRiskCustomerCount,
  depositsAtRisk,
  monthlyStats,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <article className="relative overflow-hidden rounded-2xl bg-al-surface-lowest p-6 group hover:bg-al-surface-container transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-al-primary">event_upcoming</span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-al-on-surface-variant mb-2">Total Upcoming (30d)</h3>
        <p className="text-4xl font-extrabold tabular-nums text-al-primary">{totalUpcoming}</p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-red-50 p-6 border border-red-100 group hover:bg-red-50/80 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-red-600">warning</span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-red-600 mb-2">High-Risk Customers</h3>
        <p className="text-4xl font-extrabold tabular-nums text-red-700">{highRiskCustomerCount}</p>
        <p className="mt-1 text-xs text-red-600/70">In selected window</p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-amber-50 p-6 group hover:bg-amber-50/80 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-amber-700">account_balance_wallet</span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-amber-700 mb-2">Deposits at Risk</h3>
        <p className="text-4xl font-extrabold tabular-nums text-amber-800">
          {renderDepositsAtRisk(depositsAtRisk)}
        </p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-al-surface-lowest p-6 group hover:bg-al-surface-container transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-al-primary">loyalty</span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-al-on-surface-variant mb-2">This Month</h3>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-al-on-surface-variant">Retained</span>
            <span className="font-semibold text-green-700">
              {formatCurrency(monthlyStats.depositsRetained, "USD")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-al-on-surface-variant">Refunded</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(monthlyStats.refundsIssued, "USD")}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
