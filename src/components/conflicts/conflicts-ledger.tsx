"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  cancelAppointmentFromConflict,
  dismissConflictAction,
} from "@/app/app/conflicts/actions";

type SerializedConflict = {
  id: string;
  appointmentId: string;
  appointmentStartsAt: string;
  appointmentEndsAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  calendarEventId: string;
  eventSummary: string | null;
  eventStart: string;
  eventEnd: string;
  severity: "full" | "high" | "partial" | "all_day";
  detectedAt: string;
  formattedAptTime: string;
  formattedAptDay: string;
  formattedEventTime: string;
  formattedDetected: string;
  formattedOverlap: string;
};

type ConflictsLedgerProps = {
  conflicts: SerializedConflict[];
  timezone: string;
};

type SeverityFilter = "all" | "high_group" | "medium_group" | "low_group";

/**
 * Severity visual config using AL design tokens.
 * Dynamic background/foreground values are applied via inline style
 * because they are data-driven (mapped per severity level).
 */
const SEVERITY_CONFIG = {
  full: {
    bg: "var(--al-status-negative-bg)",
    fg: "var(--al-status-negative)",
    label: "High",
    note: "Full overlap",
  },
  high: {
    bg: "var(--al-status-negative-bg)",
    fg: "var(--al-status-negative)",
    label: "High",
    note: "High overlap",
  },
  partial: {
    bg: "var(--al-status-caution-bg)",
    fg: "var(--al-status-caution)",
    label: "Medium",
    note: "Partial overlap",
  },
  all_day: {
    bg: "var(--al-surface-container)",
    fg: "var(--al-on-surface-variant)",
    label: "Low",
    note: "All-day event",
  },
} as const;

const FILTER_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "All conflicts" },
  { key: "high_group", label: "High" },
  { key: "medium_group", label: "Medium" },
  { key: "low_group", label: "Low" },
];

const toGroup = (s: SerializedConflict["severity"]): Exclude<SeverityFilter, "all"> =>
  s === "full" || s === "high" ? "high_group" : s === "partial" ? "medium_group" : "low_group";

function Icon({ name, size = 16, fill }: { name: string; size?: number; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined inline-flex items-center leading-none"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: SerializedConflict["severity"] }) {
  const s = SEVERITY_CONFIG[severity];
  return (
    <span
      className="al-eyebrow inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 opacity-100"
      style={{ background: s.bg, color: s.fg }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: s.fg }}
      />
      {s.label}
    </span>
  );
}

export function ConflictsLedger({ conflicts, timezone: _timezone }: ConflictsLedgerProps) {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [modalConflict, setModalConflict] = useState<SerializedConflict | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const visible = conflicts.filter((c) => !hidden.has(c.id));
  const filtered =
    severityFilter === "all"
      ? visible
      : visible.filter((c) => toGroup(c.severity) === severityFilter);

  const filterCounts: Record<SeverityFilter, number> = {
    all: visible.length,
    high_group: visible.filter((c) => c.severity === "full" || c.severity === "high").length,
    medium_group: visible.filter((c) => c.severity === "partial").length,
    low_group: visible.filter((c) => c.severity === "all_day").length,
  };

  const handleKeep = async (conflict: SerializedConflict) => {
    setProcessing((prev) => ({ ...prev, [conflict.id]: true }));
    try {
      const result = await dismissConflictAction(conflict.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to dismiss");
        return;
      }
      setHidden((prev) => new Set([...prev, conflict.id]));
      toast.success(`Kept: ${conflict.customerName}'s appointment`);
      router.refresh();
    } catch {
      toast.error("Failed to dismiss conflict");
    } finally {
      setProcessing((prev) => ({ ...prev, [conflict.id]: false }));
    }
  };

  const handleCancelConfirm = async () => {
    if (!modalConflict) return;
    const c = modalConflict;
    setProcessing((prev) => ({ ...prev, [c.id]: true }));
    setModalConflict(null);
    try {
      const result = await cancelAppointmentFromConflict(c.appointmentId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to cancel");
        return;
      }
      setHidden((prev) => new Set([...prev, c.id]));
      if (result.refunded && typeof result.amount === "number") {
        toast.success(
          `Cancelled. Refunded \u00A3${result.amount.toFixed(2)} to ${c.customerName.split(" ")[0]}.`
        );
      } else {
        toast.success(`Appointment cancelled for ${c.customerName.split(" ")[0]}.`);
      }
      router.refresh();
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setProcessing((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  /* ── Empty state ──────────────────────────────────────────── */
  if (visible.length === 0) {
    return (
      <div className="al-card px-8 py-20 text-center">
        <div className="mb-[18px] inline-grid size-16 place-items-center rounded-[20px] bg-[var(--al-status-positive-bg)]">
          <Icon name="check_circle" size={32} fill />
        </div>
        <div className="al-section-title">No conflicts found</div>
        <div className="al-lede mx-auto mt-2 max-w-[420px]">
          Your appointments and Google Calendar events are in sync. We check every 15 minutes
          &mdash; you&apos;ll see anything new here.
        </div>
        <div className="mt-[22px] inline-flex gap-2.5">
          <Link
            href="/app/appointments"
            className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--al-gradient-cta)] px-5 py-3 text-[13px] font-bold text-al-on-primary shadow-[0_14px_28px_rgba(0,30,64,.2)] no-underline"
          >
            <Icon name="event_note" />
            Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main ledger ──────────────────────────────────────────── */
  return (
    <>
      <div className="al-card">
        {/* Sheet head */}
        <div className="flex flex-col gap-1.5 border-b border-[var(--al-ghost-border)] bg-al-surface px-7 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <span className="al-eyebrow">Resolution queue</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-al-on-surface-variant opacity-70">
              <Icon name="sync" size={13} />
              Synced &middot; 2 min ago
            </span>
          </div>
          <div className="al-section-title mt-1">
            {visible.length} {visible.length === 1 ? "conflict" : "conflicts"} to resolve
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 border-b border-[var(--al-ghost-border)] px-7 py-3">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = severityFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSeverityFilter(opt.key)}
                className={`cursor-pointer rounded-full border-0 px-3.5 py-2 text-xs font-bold ${
                  isActive
                    ? "bg-al-primary text-al-on-primary"
                    : "bg-transparent text-al-on-surface-variant"
                }`}
              >
                {opt.label} ({filterCounts[opt.key]})
              </button>
            );
          })}
        </div>

        {/* Column headers */}
        <div className="al-eyebrow flex items-center gap-3.5 bg-al-surface-container px-7 py-3.5 opacity-60">
          <div className="shrink-0 basis-1.5" />
          <div className="shrink-0 basis-[110px]">Severity</div>
          <div className="min-w-0 shrink grow-[1.1] basis-0">Appointment</div>
          <div className="min-w-0 shrink grow-[1.1] basis-0">Calendar event</div>
          <div className="shrink-0 basis-[100px]">Overlap</div>
          <div className="shrink-0 basis-[116px]">Detected</div>
          <div className="shrink-0 basis-[280px] text-right">Actions</div>
        </div>

        {/* Rows */}
        {filtered.map((c, idx) => {
          const sev = SEVERITY_CONFIG[c.severity];
          const overlapParts = c.formattedOverlap.split(" of ");
          const isHovered = hoverRow === c.id;
          const isDisabled = !!processing[c.id];

          return (
            <div
              key={c.id}
              className={`flex items-center gap-3.5 px-7 py-[22px] transition-colors duration-[120ms] ${
                isHovered ? "bg-al-surface" : "bg-transparent"
              } ${idx !== 0 ? "border-t border-[var(--al-ghost-border)]" : ""}`}
              onMouseEnter={() => setHoverRow(c.id)}
              onMouseLeave={() => setHoverRow(null)}
            >
              {/* Severity rail — dynamic color from data, requires inline style */}
              <div
                className="-my-px -ml-7 shrink-0 basis-1.5 self-stretch rounded-r-[3px]"
                style={{
                  background: sev.fg,
                  opacity: c.severity === "all_day" ? 0.45 : 0.85,
                }}
              />

              {/* Severity badge */}
              <div className="shrink-0 basis-[110px]">
                <SeverityBadge severity={c.severity} />
              </div>

              {/* Appointment */}
              <div className="min-w-0 shrink grow-[1.1] basis-0">
                <div className="text-sm font-bold tracking-tight text-al-on-surface">
                  {c.customerName}
                </div>
                <div className="al-num mt-0.5 text-xs text-al-on-surface-variant">
                  {c.formattedAptTime} &middot; {c.formattedAptDay}
                </div>
              </div>

              {/* Calendar event */}
              <div className="min-w-0 shrink grow-[1.1] basis-0">
                <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-al-on-surface">
                  <span className="size-2 shrink-0 rotate-45 rounded-sm bg-[var(--al-status-caution)]" />
                  {c.eventSummary ?? "Untitled event"}
                </div>
                <div className="mt-0.5 text-xs">
                  <span className="font-extrabold text-al-primary">{c.formattedEventTime}</span>
                  <span className="text-al-on-surface-variant opacity-70">
                    {" "}
                    &middot; Google Calendar
                  </span>
                </div>
              </div>

              {/* Overlap */}
              <div className="shrink-0 basis-[100px]">
                <div className="al-num text-[13px] font-extrabold text-[var(--al-status-negative)]">
                  {overlapParts[0]}
                </div>
                {overlapParts[1] && (
                  <div className="text-[11px] font-semibold text-al-on-surface-variant opacity-65">
                    of {overlapParts[1]}
                  </div>
                )}
              </div>

              {/* Detected */}
              <div className="al-num shrink-0 basis-[116px] text-xs font-semibold text-al-on-surface">
                {c.formattedDetected}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 basis-[280px] justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleKeep(c)}
                  disabled={isDisabled}
                  className={`inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--al-hairline-strong)] bg-al-surface-lowest px-3.5 py-2 text-xs font-bold text-al-primary ${
                    isDisabled ? "cursor-default opacity-50" : "cursor-pointer"
                  }`}
                >
                  <Icon name="check" size={14} />
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => setModalConflict(c)}
                  disabled={isDisabled}
                  className={`al-num inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--al-status-negative)] bg-[var(--al-status-negative)] px-3.5 py-2 text-xs font-bold text-white ${
                    isDisabled ? "cursor-default opacity-50" : "cursor-pointer"
                  }`}
                >
                  <Icon name="event_busy" size={14} />
                  Cancel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cancel confirmation modal ─────────────────────────── */}
      {modalConflict && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-6 py-10 backdrop-blur-[4px]"
          onClick={() => setModalConflict(null)}
        >
          <div
            className="w-full max-w-[520px] overflow-hidden rounded-[20px] bg-al-surface-lowest shadow-[0_32px_80px_rgba(26,28,27,.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal head */}
            <div className="flex items-center justify-between border-b border-[var(--al-ghost-border)] px-6 py-[22px]">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[var(--al-status-negative-bg)] text-[var(--al-status-negative)]">
                  <Icon name="event_busy" size={20} fill />
                </div>
                <div>
                  <div className="al-eyebrow text-[var(--al-status-negative)] opacity-85">
                    Destructive action
                  </div>
                  <div className="mt-0.5 text-lg font-extrabold tracking-[-0.015em] text-al-primary">
                    Cancel this appointment?
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConflict(null)}
                className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-al-surface-container"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-[18px] px-6 py-[22px]">
              {/* Summary block */}
              <div className="flex flex-col gap-2.5 rounded-[14px] bg-al-surface-container px-[18px] py-3.5">
                {[
                  {
                    label: "Appointment",
                    value: `${modalConflict.formattedAptTime} \u00B7 ${modalConflict.formattedAptDay}`,
                  },
                  { label: "Customer", value: modalConflict.customerName },
                  {
                    label: "Conflicting event",
                    value: modalConflict.eventSummary ?? "Untitled event",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3.5"
                  >
                    <span className="al-eyebrow opacity-70">
                      {row.label}
                    </span>
                    <span className="text-right text-[13px] font-semibold text-al-primary">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Refund note */}
              <div className="rounded-[14px] border border-[var(--al-hairline-rest)] px-[18px] pb-3.5 pt-[18px]">
                <div className="al-eyebrow mb-2.5 opacity-70">What happens next</div>
                <div className="text-[13px] leading-[1.55] text-al-on-surface-variant">
                  If a refund is due per your cancellation policy, it will be processed automatically
                  via the original payment method within 5 business days.
                </div>
              </div>

              {/* Notification checkbox */}
              <div className="flex items-start gap-2.5 rounded-xl bg-al-surface px-3.5 py-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 size-[18px] shrink-0 accent-al-primary"
                />
                <div>
                  <div className="text-[13px] font-bold text-al-primary">
                    Send cancellation email
                  </div>
                  <div className="mt-0.5 text-xs text-al-on-surface-variant">
                    Notify {modalConflict.customerName.split(" ")[0]} with an apology and link to
                    rebook.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal foot */}
            <div className="flex justify-end gap-2.5 border-t border-[var(--al-ghost-border)] px-6 pb-[22px] pt-4">
              <button
                type="button"
                onClick={() => setModalConflict(null)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--al-hairline-strong)] bg-al-surface-lowest px-[18px] py-3 text-[13px] font-bold text-al-primary"
              >
                Keep appointment
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={!!processing[modalConflict.id]}
                className={`inline-flex items-center gap-1.5 rounded-xl border-0 bg-[var(--al-status-negative)] px-[18px] py-3 text-[13px] font-bold text-white shadow-[0_14px_28px_rgba(168,41,74,.25)] ${
                  processing[modalConflict.id]
                    ? "cursor-default opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <Icon name="event_busy" />
                Cancel appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
