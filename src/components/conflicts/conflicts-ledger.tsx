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

const SEVERITY_CONFIG = {
  full: { bg: "rgba(168,41,74,0.10)", fg: "#a8294a", label: "High", note: "Full overlap" },
  high: { bg: "rgba(168,41,74,0.10)", fg: "#a8294a", label: "High", note: "High overlap" },
  partial: { bg: "rgba(201,122,42,0.10)", fg: "#c97a2a", label: "Medium", note: "Partial overlap" },
  all_day: { bg: "#eeeeec", fg: "#43474f", label: "Low", note: "All-day event" },
} as const;

const FILTER_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "All conflicts" },
  { key: "high_group", label: "High" },
  { key: "medium_group", label: "Medium" },
  { key: "low_group", label: "Low" },
];

const toGroup = (s: SerializedConflict["severity"]): Exclude<SeverityFilter, "all"> =>
  s === "full" || s === "high" ? "high_group" : s === "partial" ? "medium_group" : "low_group";

const FONT_FAMILY = "'Manrope', system-ui, sans-serif";

function Icon({ name, size = 16, fill }: { name: string; size?: number; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.fg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: s.fg,
          flexShrink: 0,
        }}
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

  if (visible.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "80px 32px",
          textAlign: "center",
          boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "rgba(14,122,85,0.08)",
            display: "inline-grid",
            placeItems: "center",
            marginBottom: 18,
          }}
        >
          <Icon name="check_circle" size={32} fill />
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#001e40",
            letterSpacing: "-.02em",
          }}
        >
          No conflicts found
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#43474f",
            marginTop: 8,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
          }}
        >
          Your appointments and Google Calendar events are in sync. We check every 15 minutes
          &mdash; you&apos;ll see anything new here.
        </div>
        <div style={{ display: "inline-flex", gap: 10, marginTop: 22 }}>
          <Link
            href="/app/appointments"
            style={{
              padding: "12px 20px",
              border: 0,
              borderRadius: 12,
              background: "linear-gradient(135deg,#001e40,#003366)",
              color: "#fff",
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 14px 28px rgba(0,30,64,.2)",
              textDecoration: "none",
            }}
          >
            <Icon name="event_note" />
            Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
        }}
      >
        {/* Sheet head */}
        <div
          style={{
            padding: "24px 28px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "#f9f9f7",
            borderBottom: "1px solid rgba(195,198,209,.20)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#43474f",
                opacity: 0.55,
              }}
            >
              Resolution queue
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#43474f",
                opacity: 0.7,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="sync" size={13} />
              Synced &middot; 2 min ago
            </span>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-.02em",
              color: "#001e40",
              marginTop: 4,
            }}
          >
            {visible.length} {visible.length === 1 ? "conflict" : "conflicts"} to resolve
          </div>
        </div>

        {/* Filter pills */}
        <div
          style={{
            padding: "12px 28px",
            borderBottom: "1px solid rgba(195,198,209,.20)",
            display: "flex",
            gap: 4,
          }}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = severityFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSeverityFilter(opt.key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT_FAMILY,
                  border: 0,
                  cursor: "pointer",
                  background: isActive ? "#001e40" : "transparent",
                  color: isActive ? "#fff" : "#43474f",
                }}
              >
                {opt.label} ({filterCounts[opt.key]})
              </button>
            );
          })}
        </div>

        {/* Column headers */}
        <div
          style={{
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "#43474f",
            opacity: 0.6,
            background: "#f4f4f2",
          }}
        >
          <div style={{ flex: "0 0 6px" }} />
          <div style={{ flex: "0 0 110px" }}>Severity</div>
          <div style={{ flex: "1.1 1 0", minWidth: 0 }}>Appointment</div>
          <div style={{ flex: "1.1 1 0", minWidth: 0 }}>Calendar event</div>
          <div style={{ flex: "0 0 100px" }}>Overlap</div>
          <div style={{ flex: "0 0 116px" }}>Detected</div>
          <div style={{ flex: "0 0 280px", textAlign: "right" }}>Actions</div>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "22px 28px",
                transition: "background .12s",
                background: isHovered ? "#f9f9f7" : "transparent",
                borderTop: idx !== 0 ? "1px solid rgba(195,198,209,.20)" : undefined,
              }}
              onMouseEnter={() => setHoverRow(c.id)}
              onMouseLeave={() => setHoverRow(null)}
            >
              {/* Severity rail */}
              <div
                style={{
                  flex: "0 0 6px",
                  alignSelf: "stretch",
                  background: sev.fg,
                  marginLeft: -28,
                  marginTop: -1,
                  marginBottom: -1,
                  borderRadius: "0 3px 3px 0",
                  opacity: c.severity === "all_day" ? 0.45 : 0.85,
                }}
              />

              {/* Severity badge */}
              <div style={{ flex: "0 0 110px" }}>
                <SeverityBadge severity={c.severity} />
              </div>

              {/* Appointment */}
              <div style={{ flex: "1.1 1 0", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1c1b",
                    letterSpacing: "-.01em",
                  }}
                >
                  {c.customerName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#43474f",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 2,
                  }}
                >
                  {c.formattedAptTime} &middot; {c.formattedAptDay}
                </div>
              </div>

              {/* Calendar event */}
              <div style={{ flex: "1.1 1 0", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1c1b",
                    letterSpacing: "-.01em",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#c97a2a",
                      transform: "rotate(45deg)",
                      flexShrink: 0,
                    }}
                  />
                  {c.eventSummary ?? "Untitled event"}
                </div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  <span style={{ color: "#001e40", fontWeight: 800 }}>{c.formattedEventTime}</span>
                  <span style={{ color: "#43474f", opacity: 0.7 }}> &middot; Google Calendar</span>
                </div>
              </div>

              {/* Overlap */}
              <div style={{ flex: "0 0 100px" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#a8294a",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {overlapParts[0]}
                </div>
                {overlapParts[1] && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#43474f",
                      opacity: 0.65,
                      fontWeight: 600,
                    }}
                  >
                    of {overlapParts[1]}
                  </div>
                )}
              </div>

              {/* Detected */}
              <div
                style={{
                  flex: "0 0 116px",
                  fontSize: 12,
                  color: "#1a1c1b",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {c.formattedDetected}
              </div>

              {/* Actions */}
              <div
                style={{
                  flex: "0 0 280px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleKeep(c)}
                  disabled={isDisabled}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(195,198,209,.5)",
                    background: "#fff",
                    fontFamily: FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#001e40",
                    cursor: isDisabled ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                >
                  <Icon name="check" size={14} />
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => setModalConflict(c)}
                  disabled={isDisabled}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #a8294a",
                    background: "#a8294a",
                    color: "#fff",
                    fontFamily: FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: isDisabled ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontVariantNumeric: "tabular-nums",
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                >
                  <Icon name="event_busy" size={14} />
                  Cancel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel confirmation modal */}
      {modalConflict && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,28,27,.42)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: "40px 24px",
          }}
          onClick={() => setModalConflict(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(26,28,27,.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal head */}
            <div
              style={{
                padding: "22px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(195,198,209,.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(168,41,74,0.10)",
                    display: "grid",
                    placeItems: "center",
                    color: "#a8294a",
                  }}
                >
                  <Icon name="event_busy" size={20} fill />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".2em",
                      textTransform: "uppercase",
                      color: "#a8294a",
                      opacity: 0.85,
                    }}
                  >
                    Destructive action
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#001e40",
                      letterSpacing: "-.015em",
                      marginTop: 2,
                    }}
                  >
                    Cancel this appointment?
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConflict(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  border: 0,
                  background: "#f4f4f2",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {/* Summary block */}
              <div
                style={{
                  background: "#f4f4f2",
                  borderRadius: 14,
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
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
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: ".18em",
                        textTransform: "uppercase",
                        color: "#43474f",
                        opacity: 0.7,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#001e40",
                        textAlign: "right",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Refund note */}
              <div
                style={{
                  border: "1px solid rgba(195,198,209,.4)",
                  borderRadius: 14,
                  padding: "18px 18px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "#43474f",
                    opacity: 0.7,
                    marginBottom: 10,
                  }}
                >
                  What happens next
                </div>
                <div style={{ fontSize: 13, color: "#43474f", lineHeight: 1.55 }}>
                  If a refund is due per your cancellation policy, it will be processed automatically
                  via the original payment method within 5 business days.
                </div>
              </div>

              {/* Notification checkbox */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#f9f9f7",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    accentColor: "#001e40",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#001e40" }}>
                    Send cancellation email
                  </div>
                  <div style={{ fontSize: 12, color: "#43474f", marginTop: 2 }}>
                    Notify {modalConflict.customerName.split(" ")[0]} with an apology and link to
                    rebook.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal foot */}
            <div
              style={{
                padding: "16px 24px 22px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                borderTop: "1px solid rgba(195,198,209,.25)",
              }}
            >
              <button
                type="button"
                onClick={() => setModalConflict(null)}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(195,198,209,.5)",
                  background: "#fff",
                  fontFamily: FONT_FAMILY,
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#001e40",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Keep appointment
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={!!processing[modalConflict.id]}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: 0,
                  background: "#a8294a",
                  color: "#fff",
                  fontFamily: FONT_FAMILY,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: processing[modalConflict.id] ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 14px 28px rgba(168,41,74,.25)",
                  opacity: processing[modalConflict.id] ? 0.5 : 1,
                }}
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
