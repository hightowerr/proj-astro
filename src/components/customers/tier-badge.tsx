import type { Tier } from "@/lib/scoring";

interface TierBadgeProps {
  tier: Tier | null;
  size?: "sm" | "md";
}

const tierConfig: Record<Tier, { label: string; dot: string; pill: string }> = {
  top: {
    label: "Top",
    dot: "bg-[#20d090]",
    pill: "bg-[rgba(32,208,144,0.1)] text-[#34d399] border border-[rgba(32,208,144,0.3)]",
  },
  neutral: {
    label: "Neutral",
    dot: "bg-[#6a88a0]",
    pill: "bg-[rgba(106,136,160,0.1)] text-[#8aa2bc] border border-[rgba(106,136,160,0.22)]",
  },
  risk: {
    label: "Risk",
    dot: "bg-[#f45878]",
    pill: "bg-[rgba(244,88,120,0.1)] text-[#fb7185] border border-[rgba(244,88,120,0.3)]",
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
