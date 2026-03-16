"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TierBadge } from "@/components/customers/tier-badge";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { ConfirmationStatusBadge } from "@/components/dashboard/confirmation-status-badge";
import { SmsStatusBadge } from "@/components/dashboard/sms-status-badge";
import type { DashboardAppointment } from "@/types/dashboard";

const PERIOD_OPTIONS = [
  { value: 24, label: "Next 24 hours" },
  { value: 72, label: "Next 3 days" },
  { value: 168, label: "Next 7 days" },
  { value: 336, label: "Next 14 days" },
] as const;

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
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-white">Attention Required</h2>
        <label className="flex items-center gap-3 text-sm text-text-light-muted" htmlFor="attention-period">
          Window
          <select
            id="attention-period"
            name="period"
            value={String(currentPeriod)}
            disabled={isPending}
            onChange={(event) => handlePeriodChange(Number(event.target.value))}
            className="rounded-md border border-white/20 bg-bg-dark px-3 py-2 text-sm text-white outline-none ring-primary focus:ring-2 disabled:opacity-60"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-bg-dark-secondary p-8 text-center">
          <p className="text-sm text-text-light-muted">
            No high-risk appointments in this period.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-bg-dark-secondary">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Time
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Voids (90d)
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Confirmation
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{appointment.customerName}</span>
                      <TierBadge tier={appointment.customerTier} />
                      <SmsStatusBadge smsOptIn={appointment.smsOptIn} />
                    </div>
                    <div className="mt-1 text-xs text-text-light-muted">
                      {appointment.customerEmail || appointment.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-light-muted">
                    <div>{format(new Date(appointment.startsAt), "MMM d, h:mm a")}</div>
                    <div className="text-xs">
                      Ends {format(new Date(appointment.endsAt), "h:mm a")}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-white">
                    {appointment.customerScore ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-light-muted">
                    {appointment.voidedLast90Days}
                  </td>
                  <td className="px-4 py-3">
                    <ConfirmationStatusBadge status={appointment.confirmationStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <ActionButtons
                      appointmentId={appointment.id}
                      customerPhone={appointment.customerPhone}
                      customerEmail={appointment.customerEmail}
                      bookingUrl={appointment.bookingUrl}
                      confirmationStatus={appointment.confirmationStatus}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
