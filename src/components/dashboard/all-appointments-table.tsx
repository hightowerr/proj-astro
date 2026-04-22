"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TierBadge } from "@/components/customers/tier-badge";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { ConfirmationStatusBadge } from "@/components/dashboard/confirmation-status-badge";
import { SmsStatusBadge } from "@/components/dashboard/sms-status-badge";
import type { DashboardAppointment } from "@/types/dashboard";

const TIER_ORDER = { top: 1, neutral: 2, risk: 3 } as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface AllAppointmentsTableProps {
  appointments: DashboardAppointment[];
}

export function AllAppointmentsTable({ appointments }: AllAppointmentsTableProps) {
  const [tierFilter, setTierFilter] = useState<"all" | "top" | "neutral" | "risk">("all");
  const [sortField, setSortField] = useState<"time" | "score" | "tier">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredAppointments = useMemo(() => {
    const selected = tierFilter === "all"
      ? [...appointments]
      : appointments.filter((appointment) => (appointment.customerTier ?? "neutral") === tierFilter);

    selected.sort((left, right) => {
      if (sortField === "time") {
        const leftTime = new Date(left.startsAt).getTime();
        const rightTime = new Date(right.startsAt).getTime();
        return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
      }

      if (sortField === "score") {
        const leftScore = left.customerScore ?? -1;
        const rightScore = right.customerScore ?? -1;
        return sortDirection === "asc" ? leftScore - rightScore : rightScore - leftScore;
      }

      const leftTier = TIER_ORDER[left.customerTier ?? "neutral"];
      const rightTier = TIER_ORDER[right.customerTier ?? "neutral"];
      return sortDirection === "asc" ? leftTier - rightTier : rightTier - leftTier;
    });

    return selected;
  }, [appointments, sortDirection, sortField, tierFilter]);

  const handleSort = (field: "time" | "score" | "tier") => {
    if (sortField === field) {
      setSortDirection((previousDirection) => (previousDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const sortArrow = (field: "time" | "score" | "tier") => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <section className="space-y-8">
      <div className="border-b border-al-surface-container-high pb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.75rem] font-bold text-al-primary font-manrope">All Upcoming Appointments</h2>
          <p className="text-al-on-surface-variant text-sm mt-1">Comprehensive view of all confirmed engagements.</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-al-on-surface-variant" htmlFor="tier-filter">
          Tier
          <select
            id="tier-filter"
            name="tier"
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value as typeof tierFilter)}
            className="rounded-md border border-al-outline-variant bg-al-surface-low px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-2"
          >
            <option value="all">All tiers</option>
            <option value="top">Top only</option>
            <option value="neutral">Neutral only</option>
            <option value="risk">Risk only</option>
          </select>
        </label>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="rounded-2xl bg-al-surface-lowest p-8 text-center shadow-[0px_10px_30px_rgba(26,28,27,0.03)]">
          <p className="text-sm text-al-on-surface-variant">No appointments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-al-surface-lowest shadow-[0px_10px_30px_rgba(26,28,27,0.03)]">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-al-surface-container-low text-al-on-surface-variant text-xs uppercase tracking-widest border-b border-al-outline-variant/20 text-left">
                <th scope="col" className="p-6 font-semibold">Client</th>
                <th scope="col" className="p-6 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("time")}
                    className="inline-flex items-center gap-1 text-left hover:text-foreground uppercase tracking-widest"
                  >
                    Time <span className="text-xs normal-case">{sortArrow("time")}</span>
                  </button>
                </th>
                <th scope="col" className="p-6 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("score")}
                    className="inline-flex items-center gap-1 text-left hover:text-foreground uppercase tracking-widest"
                  >
                    Score <span className="text-xs normal-case">{sortArrow("score")}</span>
                  </button>
                </th>
                <th scope="col" className="p-6 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("tier")}
                    className="inline-flex items-center gap-1 text-left hover:text-foreground uppercase tracking-widest"
                  >
                    Tier <span className="text-xs normal-case">{sortArrow("tier")}</span>
                  </button>
                </th>
                <th scope="col" className="p-6 font-semibold">Voids (90d)</th>
                <th scope="col" className="p-6 font-semibold">Confirmation</th>
                <th scope="col" className="p-6 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-al-surface-container-low">
              {filteredAppointments.map((appointment) => {
                const initials = getInitials(appointment.customerName);

                return (
                  <tr key={appointment.id} className="hover:bg-al-surface-container/30 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-al-surface-container-highest text-al-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-al-primary">{appointment.customerName}</span>
                            <SmsStatusBadge smsOptIn={appointment.smsOptIn} />
                          </div>
                          <div className="mt-0.5 text-xs text-al-on-surface-variant">
                            {appointment.customerEmail || appointment.customerPhone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-al-on-surface-variant">
                      <div className="font-medium">{format(new Date(appointment.startsAt), "MMM d, h:mm a")}</div>
                      <div className="text-xs mt-0.5">
                        Ends {format(new Date(appointment.endsAt), "h:mm a")}
                      </div>
                    </td>
                    <td className="p-6 font-medium tabular-nums text-foreground">
                      {appointment.customerScore ?? "—"}
                    </td>
                    <td className="p-6">
                      <TierBadge tier={appointment.customerTier} />
                    </td>
                    <td className="p-6 tabular-nums text-al-on-surface-variant">
                      {appointment.voidedLast90Days}
                    </td>
                    <td className="p-6">
                      <ConfirmationStatusBadge status={appointment.confirmationStatus} />
                    </td>
                    <td className="p-6">
                      <ActionButtons
                        appointmentId={appointment.id}
                        customerPhone={appointment.customerPhone}
                        customerEmail={appointment.customerEmail}
                        bookingUrl={appointment.bookingUrl}
                        confirmationStatus={appointment.confirmationStatus}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
