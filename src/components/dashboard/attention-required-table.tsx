"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TierBadge } from "@/components/customers/tier-badge";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { ConfirmationStatusBadge } from "@/components/dashboard/confirmation-status-badge";
import { SmsStatusBadge } from "@/components/dashboard/sms-status-badge";
import { cn } from "@/lib/utils";
import type { DashboardAppointment } from "@/types/dashboard";

const PERIOD_OPTIONS = [
  { value: 24, chipLabel: "24h" },
  { value: 72, chipLabel: "3 days" },
  { value: 168, chipLabel: "7 days" },
  { value: 336, chipLabel: "14 days" },
] as const;

const HIGH_RISK_SCORE_THRESHOLD = 40;
const HIGH_RISK_VOIDS_THRESHOLD = 2;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isHighRiskAppointment(appointment: DashboardAppointment): boolean {
  return (
    appointment.customerTier === "risk" ||
    (appointment.customerScore !== null &&
      appointment.customerScore < HIGH_RISK_SCORE_THRESHOLD) ||
    appointment.voidedLast90Days >= HIGH_RISK_VOIDS_THRESHOLD
  );
}

interface AttentionRequiredTableProps {
  appointments: DashboardAppointment[];
  currentPeriod: number;
}

export function AttentionRequiredTable({ appointments, currentPeriod }: AttentionRequiredTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: number) => {
    startTransition(() => {
      router.push(`/app/dashboard?period=${newPeriod}`);
    });
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-al-surface-container-high pb-4">
        <div>
          <h2 className="text-[1.75rem] font-bold text-al-primary font-manrope leading-snug">Attention Required</h2>
          <p className="text-al-on-surface-variant text-sm mt-1">Clients flagged for potential no-shows or unconfirmed deposits.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => handlePeriodChange(option.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-colors disabled:opacity-60",
                currentPeriod === option.value
                  ? "bg-[#ffdbcf] text-[#2a170f]"
                  : "bg-al-surface-container text-al-on-surface-variant hover:bg-al-surface-container-high"
              )}
            >
              {option.chipLabel}
            </button>
          ))}
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl bg-al-surface-lowest p-8 text-center border border-al-surface-container-low">
          <p className="text-sm text-al-on-surface-variant">
            No high-risk appointments in this period.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const isHighRisk = isHighRiskAppointment(appointment);
            const initials = getInitials(appointment.customerName);

            return (
              <div
                key={appointment.id}
                className="bg-al-surface-lowest rounded-xl p-5 flex items-center justify-between border border-al-surface-container-low shadow-[0px_4px_20px_rgba(26,28,27,0.02)] hover:shadow-[0px_8px_30px_rgba(26,28,27,0.04)] transition-shadow"
              >
                <div className="flex items-center gap-5 w-1/3 min-w-0">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                      isHighRisk
                        ? "bg-red-100 text-red-700"
                        : "bg-al-surface-container-highest text-al-primary"
                    )}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-al-primary truncate">{appointment.customerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TierBadge tier={appointment.customerTier} />
                      <SmsStatusBadge smsOptIn={appointment.smsOptIn} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-2/3 pl-8 gap-4">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <span className="text-xs text-al-on-surface-variant uppercase tracking-wider">Time</span>
                    <span className="font-medium text-foreground text-sm">
                      {format(new Date(appointment.startsAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <span className="text-xs text-al-on-surface-variant uppercase tracking-wider">Score</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {appointment.customerScore ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <span className="text-xs text-al-on-surface-variant uppercase tracking-wider">Voids (90d)</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {appointment.voidedLast90Days}
                    </span>
                  </div>
                  <ConfirmationStatusBadge status={appointment.confirmationStatus} />
                  <ActionButtons
                    appointmentId={appointment.id}
                    customerPhone={appointment.customerPhone}
                    customerEmail={appointment.customerEmail}
                    bookingUrl={appointment.bookingUrl}
                    confirmationStatus={appointment.confirmationStatus}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
