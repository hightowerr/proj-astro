"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TierBadge } from "@/components/customers/tier-badge";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { ConfirmationStatusBadge } from "@/components/dashboard/confirmation-status-badge";
import { SmsStatusBadge } from "@/components/dashboard/sms-status-badge";
import type { DashboardAppointment } from "@/types/dashboard";

const TIER_ORDER = { top: 1, neutral: 2, risk: 3 } as const;

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
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-white">All Upcoming Appointments</h2>
        <label className="flex items-center gap-3 text-sm text-text-light-muted" htmlFor="tier-filter">
          Tier
          <select
            id="tier-filter"
            name="tier"
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value as typeof tierFilter)}
            className="rounded-md border border-white/20 bg-bg-dark px-3 py-2 text-sm text-white outline-none ring-primary focus:ring-2"
          >
            <option value="all">All tiers</option>
            <option value="top">Top only</option>
            <option value="neutral">Neutral only</option>
            <option value="risk">Risk only</option>
          </select>
        </label>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-bg-dark-secondary p-8 text-center">
          <p className="text-sm text-text-light-muted">No appointments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-bg-dark-secondary">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  <button
                    type="button"
                    onClick={() => handleSort("time")}
                    className="inline-flex items-center gap-1 text-left hover:text-white"
                  >
                    Time <span className="text-xs">{sortArrow("time")}</span>
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  <button
                    type="button"
                    onClick={() => handleSort("score")}
                    className="inline-flex items-center gap-1 text-left hover:text-white"
                  >
                    Score <span className="text-xs">{sortArrow("score")}</span>
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-text-light-muted">
                  <button
                    type="button"
                    onClick={() => handleSort("tier")}
                    className="inline-flex items-center gap-1 text-left hover:text-white"
                  >
                    Tier <span className="text-xs">{sortArrow("tier")}</span>
                  </button>
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
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{appointment.customerName}</span>
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
                  <td className="px-4 py-3">
                    <TierBadge tier={appointment.customerTier} />
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
