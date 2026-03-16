"use client";

import { cn } from "@/lib/utils";
import type { DashboardAppointment } from "@/types/dashboard";

type ConfirmationStatus = DashboardAppointment["confirmationStatus"];

const STATUS_STYLES: Record<
  ConfirmationStatus,
  { label: string; className: string }
> = {
  none: {
    label: "None",
    className: "bg-white/10 text-text-light-muted",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  },
  expired: {
    label: "Expired",
    className: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  },
};

export function ConfirmationStatusBadge({
  status,
}: {
  status: ConfirmationStatus;
}) {
  const config = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
