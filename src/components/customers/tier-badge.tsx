import type { Tier } from "@/lib/scoring";

interface TierBadgeProps {
  tier: Tier | null;
  size?: "sm" | "md";
}

const tierConfig: Record<Tier, { label: string; dot: string; pill: string }> = {
  top: {
    label: "Top",
    dot: "bg-[#0e7a55]",
    pill: "bg-[rgba(14,122,85,0.10)] text-[#0e7a55] border border-[rgba(14,122,85,0.25)]",
  },
  neutral: {
    label: "Neutral",
    dot: "bg-[#737780]",
    pill: "bg-[#eeeeec] text-[#43474f] border border-[rgba(195,198,209,0.40)]",
  },
  risk: {
    label: "Risk",
    dot: "bg-[#a8294a]",
    pill: "bg-[rgba(168,41,74,0.10)] text-[#a8294a] border border-[rgba(168,41,74,0.25)]",
  },
};

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const textSize = size === "sm" ? "text-[0.625rem]" : "text-[0.6875rem]";
  const px = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  if (!tier) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 ${px} ${textSize} font-semibold uppercase tracking-wider text-white/30`}
      >
        No tier
      </span>
    );
  }

  const config = tierConfig[tier];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${px} ${textSize} font-semibold uppercase tracking-wider ${config.pill}`}
    >
      <span className={`rounded-full ${dotSize} ${config.dot} shrink-0`} />
      {config.label}
    </span>
  );
}
