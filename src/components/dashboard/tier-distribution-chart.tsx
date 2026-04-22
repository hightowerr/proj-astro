import type { DashboardTierDistribution } from "@/types/dashboard";

interface TierDistributionChartProps {
  distribution: DashboardTierDistribution;
}

export function TierDistributionChart({ distribution }: TierDistributionChartProps) {
  const total = distribution.top + distribution.neutral + distribution.risk;

  if (total === 0) {
    return (
      <section className="rounded-lg bg-al-surface-lowest p-6 al-shadow-float">
        <h2 className="text-xl font-semibold text-al-primary font-manrope">Customer Tier Distribution</h2>
        <p className="mt-2 text-sm text-al-on-surface-variant">No customer data available yet.</p>
      </section>
    );
  }

  const topPercent = Math.round((distribution.top / total) * 100);
  const neutralPercent = Math.round((distribution.neutral / total) * 100);
  const riskPercent = Math.round((distribution.risk / total) * 100);

  return (
    <section className="rounded-lg bg-al-surface-lowest p-6 al-shadow-float">
      <h2 className="text-xl font-semibold text-al-primary font-manrope">Customer Tier Distribution</h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-8 overflow-hidden rounded-full bg-al-surface-container">
          <div className="flex h-full">
            {distribution.top > 0 ? (
              <div className="h-full bg-green-500" style={{ width: `${topPercent}%` }} />
            ) : null}
            {distribution.neutral > 0 ? (
              <div className="h-full bg-amber-500" style={{ width: `${neutralPercent}%` }} />
            ) : null}
            {distribution.risk > 0 ? (
              <div className="h-full bg-red-500" style={{ width: `${riskPercent}%` }} />
            ) : null}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-500" />
              <span className="text-al-on-surface-variant">Top</span>
            </div>
            <span className="tabular-nums text-foreground">
              {distribution.top} ({topPercent}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-al-on-surface-variant">Neutral</span>
            </div>
            <span className="tabular-nums text-foreground">
              {distribution.neutral} ({neutralPercent}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-500" />
              <span className="text-al-on-surface-variant">Risk</span>
            </div>
            <span className="tabular-nums text-foreground">
              {distribution.risk} ({riskPercent}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
