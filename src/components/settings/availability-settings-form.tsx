"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DayHoursInput = {
  dayOfWeek: number;
  label: string;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
};

type AvailabilitySettingsFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    timezone: string;
    slotMinutes: 15 | 30 | 45 | 60 | 90 | 120;
    defaultBufferMinutes: 0 | 5 | 10;
    days: DayHoursInput[];
  };
};

const BUFFER_OPTIONS = [
  { label: "None", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
] as const;

/** Compute a human-readable duration label from open/close HH:MM strings. */
function durationLabel(openTime: string, closeTime: string): string {
  const openParts = openTime.split(":").map(Number);
  const closeParts = closeTime.split(":").map(Number);
  const oh = openParts[0] ?? 0;
  const om = openParts[1] ?? 0;
  const ch = closeParts[0] ?? 0;
  const cm = closeParts[1] ?? 0;
  const mins = ch * 60 + cm - (oh * 60 + om);
  if (mins <= 0) return "open";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hour${h !== 1 ? "s" : ""} open`;
  return `${h}h ${m}m open`;
}

export function AvailabilitySettingsForm({
  action,
  initial,
}: AvailabilitySettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultBufferMinutes, setDefaultBufferMinutes] = useState<0 | 5 | 10>(
    initial.defaultBufferMinutes
  );
  const [closedDays, setClosedDays] = useState<Record<number, boolean>>(
    Object.fromEntries(initial.days.map((day) => [day.dayOfWeek, day.isClosed]))
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      await action(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8 font-manrope">
      {/* ── Timezone + Slot length (unchanged) ────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={initial.timezone}
            placeholder="UTC"
            required
          />
          <p className="text-xs text-muted-foreground">
            Use an IANA timezone, for example `UTC`, `America/New_York`, or `Europe/London`.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slotMinutes">Slot length</Label>
          <select
            id="slotMinutes"
            name="slotMinutes"
            defaultValue={String(initial.slotMinutes)}
            className="h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm"
          >
            {[15, 30, 45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Buffer pills (tokens migrated to --al-*) ─────────────── */}
      <fieldset className="space-y-3">
        <legend
          className="text-sm font-medium"
          style={{ color: "var(--al-on-surface)" }}
        >
          Default buffer between appointments
        </legend>
        <p
          className="text-xs"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Padding after each appointment. Applied to services with no buffer set.
        </p>
        <div className="flex flex-wrap gap-3">
          {BUFFER_OPTIONS.map((option) => {
            const isSelected = defaultBufferMinutes === option.value;
            return (
              <label
                key={option.value}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.875rem",
                  borderRadius: "var(--al-radius-full)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  background: isSelected
                    ? "var(--al-primary-fixed)"
                    : "var(--al-surface-container-lowest)",
                  border: isSelected
                    ? "1px solid var(--al-primary)"
                    : `1px solid var(--al-ghost-border)`,
                  color: isSelected
                    ? "var(--al-primary)"
                    : "var(--al-on-surface-variant)",
                }}
              >
                <input
                  type="radio"
                  name="defaultBufferMinutes"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setDefaultBufferMinutes(option.value)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── Business hours — Editorial day-row card ───────────────── */}
      <section>
        <div
          style={{
            background: "var(--al-surface-container-lowest)",
            borderRadius: "var(--al-radius-xl)",
            border: "1px solid var(--al-ghost-border)",
            overflow: "hidden",
          }}
        >
          {/* Sheet header */}
          <div
            style={{
              borderBottom: "1px solid var(--al-ghost-border)",
              padding: "20px 24px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".2em",
                  color: "var(--al-on-surface-variant)",
                  opacity: 0.55,
                }}
              >
                Business hours
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "-.02em",
                  color: "var(--al-primary)",
                  fontFamily: "var(--al-font)",
                  margin: 0,
                }}
              >
                Weekly grid
              </h2>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--al-on-surface-variant)",
                margin: 0,
              }}
            >
              Closed days are excluded from the booking page entirely.
            </p>
          </div>

          {/* Day rows */}
          {initial.days.map((day, i) => {
            const isClosed = closedDays[day.dayOfWeek];
            const openId = `day-${day.dayOfWeek}-open`;
            const closeId = `day-${day.dayOfWeek}-close`;

            return (
              <div
                key={day.dayOfWeek}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(140px,160px) 1fr 1fr minmax(100px,130px)",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 24px",
                  borderTop:
                    i === 0
                      ? "none"
                      : "1px solid rgba(195,198,209,.15)",
                  background: isClosed
                    ? "repeating-linear-gradient(135deg, transparent 0, transparent 7px, rgba(195,198,209,.14) 7px, rgba(195,198,209,.14) 8px)"
                    : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Col 1 — dot + day name + eyebrow */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      flexShrink: 0,
                      background: isClosed
                        ? "var(--al-outline-variant)"
                        : "var(--al-primary)",
                      opacity: isClosed ? 0.55 : 1,
                      transition:
                        "background 0.15s ease, opacity 0.15s ease",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: "-.02em",
                        color: isClosed
                          ? "var(--al-outline)"
                          : "var(--al-primary)",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {day.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: ".18em",
                        textTransform: "uppercase",
                        marginTop: 1,
                        color: isClosed
                          ? "var(--al-outline)"
                          : "var(--al-on-surface-variant)",
                        opacity: isClosed ? 0.6 : 0.65,
                        transition: "color 0.15s ease",
                      }}
                    >
                      {isClosed
                        ? "Closed"
                        : durationLabel(day.openTime, day.closeTime)}
                    </div>
                  </div>
                </div>

                {/* Col 2 — Open time input */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <label
                    htmlFor={openId}
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "var(--al-on-surface-variant)",
                      opacity: isClosed ? 0.3 : 0.65,
                    }}
                  >
                    Open
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "9px 12px",
                      borderRadius: "var(--al-radius-lg)",
                      background: isClosed
                        ? "transparent"
                        : "var(--al-surface-container-lowest)",
                      border: `1px solid ${isClosed ? "rgba(195,198,209,.22)" : "rgba(195,198,209,.50)"}`,
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <input
                      id={openId}
                      name={`day-${day.dayOfWeek}-open`}
                      type="time"
                      defaultValue={day.openTime}
                      disabled={isClosed}
                      style={{
                        border: 0,
                        outline: "none",
                        background: "transparent",
                        fontFamily: "inherit",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "-.01em",
                        color: isClosed
                          ? "var(--al-outline)"
                          : "var(--al-primary)",
                        textDecoration: isClosed
                          ? "line-through"
                          : "none",
                        textDecorationColor: "rgba(115,119,128,.55)",
                        width: "100%",
                        padding: 0,
                        transition: "color 0.15s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Col 3 — Close time input */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <label
                    htmlFor={closeId}
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "var(--al-on-surface-variant)",
                      opacity: isClosed ? 0.3 : 0.65,
                    }}
                  >
                    Close
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "9px 12px",
                      borderRadius: "var(--al-radius-lg)",
                      background: isClosed
                        ? "transparent"
                        : "var(--al-surface-container-lowest)",
                      border: `1px solid ${isClosed ? "rgba(195,198,209,.22)" : "rgba(195,198,209,.50)"}`,
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <input
                      id={closeId}
                      name={`day-${day.dayOfWeek}-close`}
                      type="time"
                      defaultValue={day.closeTime}
                      disabled={isClosed}
                      style={{
                        border: 0,
                        outline: "none",
                        background: "transparent",
                        fontFamily: "inherit",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "-.01em",
                        color: isClosed
                          ? "var(--al-outline)"
                          : "var(--al-primary)",
                        textDecoration: isClosed
                          ? "line-through"
                          : "none",
                        textDecorationColor: "rgba(115,119,128,.55)",
                        width: "100%",
                        padding: 0,
                        transition: "color 0.15s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Col 4 — Closed pill toggle */}
                <label
                  htmlFor={`day-${day.dayOfWeek}-closed`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "8px 12px",
                    borderRadius: "var(--al-radius-lg)",
                    background: isClosed
                      ? "rgba(186,26,26,0.07)"
                      : "transparent",
                    border: `1px solid ${isClosed ? "rgba(186,26,26,0.25)" : "rgba(195,198,209,.35)"}`,
                    transition:
                      "background 0.15s ease, border-color 0.15s ease",
                    fontSize: 13,
                    fontWeight: 700,
                    color: isClosed
                      ? "var(--al-error)"
                      : "var(--al-on-surface-variant)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id={`day-${day.dayOfWeek}-closed`}
                    type="checkbox"
                    name={`day-${day.dayOfWeek}-closed`}
                    checked={isClosed}
                    onChange={(e) =>
                      setClosedDays((prev) => ({
                        ...prev,
                        [day.dayOfWeek]: e.target.checked,
                      }))
                    }
                    className="sr-only"
                  />
                  {/* Custom checkbox visual */}
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      flexShrink: 0,
                      border: `1.5px solid ${isClosed ? "rgba(186,26,26,0.5)" : "rgba(195,198,209,.6)"}`,
                      background: isClosed
                        ? "rgba(186,26,26,0.12)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isClosed && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="rgba(186,26,26,0.9)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving\u2026" : "Save availability settings"}
      </Button>
    </form>
  );
}
