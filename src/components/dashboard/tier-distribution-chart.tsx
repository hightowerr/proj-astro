import type { DashboardTierDistribution } from "@/types/dashboard";

interface TierDistributionChartProps {
  distribution: DashboardTierDistribution;
}

export function TierDistributionChart({ distribution }: TierDistributionChartProps) {
  const total = distribution.top + distribution.neutral + distribution.risk;

  if (total === 0) {
    return (
      <section>
        <div className="border-b border-al-surface-container-high pb-4">
          <h3 className="text-[1.75rem] font-bold text-al-primary font-manrope">Tier Distribution</h3>
          <p className="text-al-on-surface-variant text-sm mt-1">Client segments for upcoming 30 days.</p>
        </div>
        <div className="bg-al-surface-container-low rounded-2xl p-8 mt-8">
          <p className="text-sm text-al-on-surface-variant">No customer data available yet.</p>
        </div>
      </section>
    );
  }

  const topPercent = Math.round((distribution.top / total) * 100);
  const neutralPercent = Math.round((distribution.neutral / total) * 100);
  const riskPercent = Math.round((distribution.risk / total) * 100);

  const tiers = [
    { label: "Top Tier", count: distribution.top, percent: topPercent, color: "bg-al-primary" },
    { label: "Neutral", count: distribution.neutral, percent: neutralPercent, color: "bg-[#3a5f94]" },
    { label: "Risk", count: distribution.risk, percent: riskPercent, color: "bg-red-500" },
  ];

  return (
    <section>
      <div className="border-b border-al-surface-container-high pb-4">
        <h3 className="text-[1.75rem] font-bold text-al-primary font-manrope">Tier Distribution</h3>
        <p className="text-al-on-surface-variant text-sm mt-1">Client segments for upcoming 30 days.</p>
      </div>
      <div className="bg-al-surface-container-low rounded-2xl p-8 space-y-6 mt-8">
        {tiers.map((tier) => (
          <div key={tier.label}>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-al-primary">{tier.label}</span>
              <span className="text-al-on-surface-variant">{tier.count} clients ({tier.percent}%)</span>
            </div>
            <div className="w-full bg-al-surface-container-high rounded-full h-3 overflow-hidden">
              <div className={`${tier.color} h-3 rounded-full`} style={{ width: `${tier.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
