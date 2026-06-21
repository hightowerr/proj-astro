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
    className: "bg-[var(--al-status-neutral-bg)] text-[var(--al-status-neutral)]",
  },
  pending: {
    label: "Pending",
    className: "bg-[var(--al-status-caution-bg)] text-[var(--al-status-caution)] ring-1 ring-[var(--al-status-caution)]/30",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-[var(--al-status-positive-bg)] text-[var(--al-status-positive)] ring-1 ring-[var(--al-status-positive)]/30",
  },
  expired: {
    label: "Expired",
    className: "bg-[var(--al-status-negative-bg)] text-[var(--al-status-negative)] ring-1 ring-[var(--al-status-negative)]/30",
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
