import { type NoShowRisk } from "@/lib/no-show-scoring";
import { cn } from "@/lib/utils";

interface NoShowRiskBadgeProps {
  risk: NoShowRisk | null;
  score?: number | null;
  stats?: {
    completed: number;
    noShows: number;
    totalAppointments: number;
  } | null;
  className?: string;
}

export function NoShowRiskBadge({ risk, score, stats, className }: NoShowRiskBadgeProps) {
  const displayRisk = risk ?? "medium";

  const config = {
    low: {
      label: "Low Risk",
      color: "bg-green-100 text-green-800",
    },
    medium: {
      label: "Medium Risk",
      color: "bg-yellow-100 text-yellow-800",
    },
    high: {
      label: "High Risk",
      color: "bg-red-100 text-red-800",
    },
  } as const;

  const { label, color } = config[displayRisk];
  const tooltip =
    score !== null && score !== undefined && stats
      ? `Score: ${score}/100 - ${stats.completed} completed, ${stats.noShows} no-show${stats.noShows === 1 ? "" : "s"} in last 180 days`
      : score !== null && score !== undefined
        ? `Score: ${score}/100`
        : "Score: - / No history yet";

  return (
    <span
      title={tooltip}
      className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", color, className)}
    >
      {label}
    </span>
  );
}
