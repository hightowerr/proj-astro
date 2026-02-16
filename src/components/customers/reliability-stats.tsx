import type { ScoringStats } from "@/lib/scoring";

interface ReliabilityStatsProps {
  stats: ScoringStats | null;
}

export function ReliabilityStats({ stats }: ReliabilityStatsProps) {
  if (!stats) {
    return <span className="text-xs text-muted-foreground">Insufficient history</span>;
  }

  const { settled, voided, refunded, lateCancels } = stats;
  const total = settled + voided + refunded + lateCancels;

  if (total === 0) {
    return <span className="text-xs text-muted-foreground">Insufficient history</span>;
  }

  const parts: string[] = [];
  if (settled > 0) parts.push(`Settled: ${settled}`);
  if (voided > 0) parts.push(`Voided: ${voided}`);
  if (refunded > 0) parts.push(`Refunded: ${refunded}`);
  if (lateCancels > 0) parts.push(`Late cancels: ${lateCancels}`);

  return <span className="text-xs text-muted-foreground">{parts.join(", ")}</span>;
}
