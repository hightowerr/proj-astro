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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-lg bg-al-surface-lowest p-5 al-shadow-float">
        <h3 className="text-xs font-medium uppercase text-al-on-surface-variant">Total Upcoming (30d)</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{totalUpcoming}</p>
      </article>

      <article className="rounded-lg bg-red-50 p-5 al-shadow-float">
        <h3 className="text-xs font-medium uppercase text-red-600">High-Risk Customers</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-red-700">
          {highRiskCustomerCount}
        </p>
        <p className="mt-1 text-xs text-red-600/70">In selected window</p>
      </article>

      <article className="rounded-lg bg-amber-50 p-5 al-shadow-float">
        <h3 className="text-xs font-medium uppercase text-amber-700">Deposits at Risk</h3>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-800">
          {renderDepositsAtRisk(depositsAtRisk)}
        </p>
      </article>

      <article className="rounded-lg bg-al-surface-lowest p-5 al-shadow-float">
        <h3 className="text-xs font-medium uppercase text-al-on-surface-variant">This Month</h3>
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
