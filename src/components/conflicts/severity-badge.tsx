import { AlertCircle, AlertTriangle, Calendar, Info } from "lucide-react";

type SeverityBadgeProps = {
  severity: "full" | "high" | "partial" | "all_day";
};

const severityConfig = {
  full: {
    label: "Full Conflict",
    className: "border-red-200 bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  high: {
    label: "High Conflict",
    className: "border-orange-200 bg-orange-100 text-orange-800",
    icon: AlertTriangle,
  },
  partial: {
    label: "Partial Conflict",
    className: "border-yellow-200 bg-yellow-100 text-yellow-800",
    icon: Info,
  },
  all_day: {
    label: "All-Day Event",
    className: "border-blue-200 bg-blue-100 text-blue-800",
    icon: Calendar,
  },
} as const;

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
      role="status"
      aria-label={`Conflict severity: ${config.label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
