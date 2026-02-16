import type { Tier } from "@/lib/scoring";

interface TierBadgeProps {
  tier: Tier | null;
}

export function TierBadge({ tier }: TierBadgeProps) {
  if (!tier) {
    return (
      <span className="inline-flex rounded-full border border-dashed px-2 py-1 text-xs font-medium text-muted-foreground">
        No tier
      </span>
    );
  }

  const styles: Record<Tier, string> = {
    top: "bg-green-100 text-green-800",
    neutral: "bg-muted text-muted-foreground",
    risk: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${styles[tier]}`}>
      {tier}
    </span>
  );
}
