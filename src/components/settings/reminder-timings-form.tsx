"use client";

import { Fragment, useState, useTransition } from "react";
import { CheckIcon, LockIcon, CalendarIcon } from "lucide-react";
import { updateReminderTimings } from "@/app/app/settings/reminders/actions";
import { Button } from "@/components/ui/button";

type Interval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

const PRESETS: Array<{
  value: Interval;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { value: "10m", label: "10 min", shortLabel: "10m", description: "10 minutes before" },
  { value: "1h", label: "1 hr", shortLabel: "1h", description: "1 hour before" },
  { value: "2h", label: "2 hr", shortLabel: "2h", description: "2 hours before" },
  { value: "4h", label: "4 hr", shortLabel: "4h", description: "4 hours before" },
  { value: "24h", label: "24 hr", shortLabel: "24h", description: "24 hours before" },
  { value: "48h", label: "48 hr", shortLabel: "48h", description: "48 hours before" },
  { value: "1w", label: "1 wk", shortLabel: "1w", description: "1 week before" },
];

const MAX = 3;

const intervalMinutes: Record<Interval, number> = {
  "10m": 10,
  "1h": 60,
  "2h": 120,
  "4h": 240,
  "24h": 1440,
  "48h": 2880,
  "1w": 10080,
};

const normalizeTimings = (timings: Interval[]) => {
  const set = new Set(timings);
  return PRESETS.map((preset) => preset.value).filter((value) => set.has(value));
};

export function ReminderTimingsForm({ initialTimings }: { initialTimings: Interval[] }) {
  const [selected, setSelected] = useState<Interval[]>(() => normalizeTimings(initialTimings));
  const [lastSaved, setLastSaved] = useState<Interval[]>(() => normalizeTimings(initialTimings));
  const [isPending, startTransition] = useTransition();
  const [savedKey, setSavedKey] = useState(0);

  const atMax = selected.length >= MAX;
  const isDirty = selected.join() !== lastSaved.join();

  function toggle(value: Interval) {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((entry) => entry !== value);
      }

      if (prev.length >= MAX) {
        return prev;
      }

      return normalizeTimings([...prev, value]);
    });
    setSavedKey(0);
  }

  function handleSave() {
    const nextSelected = [...selected];

    startTransition(async () => {
      await updateReminderTimings(nextSelected);
      setLastSaved(normalizeTimings(nextSelected));
      setSavedKey((key) => key + 1);
    });
  }

  const sortedForTimeline = [...selected].sort(
    (a, b) => intervalMinutes[b] - intervalMinutes[a]
  );

  return (
    <div className="space-y-8">
      {/* ── A: Pill Grid ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Reminder intervals
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--al-outline)" }}
          >
            {selected.length} / {MAX}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {PRESETS.map((preset) => {
            const isSelected = selected.includes(preset.value);
            const isLocked = atMax && !isSelected;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  if (!isLocked) toggle(preset.value);
                }}
                disabled={isLocked}
                aria-pressed={isSelected}
                className="relative rounded-full border py-3 px-1 text-center text-sm font-medium transition-all"
                style={{
                  background: isSelected
                    ? "var(--al-primary)"
                    : "var(--al-surface-container-low)",
                  borderColor: isSelected
                    ? "var(--al-primary)"
                    : "var(--al-outline-variant)",
                  color: isSelected
                    ? "var(--al-on-primary)"
                    : "var(--al-on-surface)",
                  boxShadow: isSelected
                    ? "0 1px 4px rgba(0,30,64,0.18)"
                    : "none",
                  opacity: isLocked ? 0.4 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                {preset.label}

                {isSelected && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                    style={{
                      background: "var(--al-status-positive)",
                      border: "1.5px solid var(--al-surface)",
                    }}
                  >
                    <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                )}

                {isLocked && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                    style={{
                      background: "var(--al-outline)",
                      border: "1.5px solid var(--al-surface)",
                    }}
                  >
                    <LockIcon className="h-2 w-2 text-white" strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── B: Selected Reminders Stack ── */}
      <div>
        <span
          className="mb-3 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Selected reminders
        </span>

        <div className="space-y-2">
          {Array.from({ length: MAX }).map((_, index) => {
            const interval = selected[index];
            const preset = interval
              ? PRESETS.find((p) => p.value === interval)
              : null;

            if (preset) {
              return (
                <div
                  key={index}
                  className="flex h-12 items-center gap-3 rounded-lg border px-4 transition-all"
                  style={{
                    borderColor: "var(--al-outline-variant)",
                    background: "var(--al-surface-container-lowest)",
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--al-primary)" }}
                  >
                    <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>

                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono font-bold"
                    style={{
                      fontSize: "11px",
                      background: "var(--al-primary-fixed)",
                      color: "var(--al-on-primary-fixed)",
                    }}
                  >
                    {preset.label}
                  </span>

                  <span
                    className="flex-1 text-sm"
                    style={{ color: "var(--al-on-surface)" }}
                  >
                    {preset.description}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggle(preset.value)}
                    className="text-xs hover:underline"
                    style={{ color: "var(--al-outline)" }}
                  >
                    Remove
                  </button>
                </div>
              );
            }

            return (
              <div
                key={index}
                className="flex h-12 items-center gap-3 rounded-lg border border-dashed px-4 transition-all"
                style={{
                  borderColor: "var(--al-outline-variant)",
                  background: "transparent",
                }}
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--al-outline)" }}
                >
                  Slot {index + 1} — empty
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── C: Reminder Timeline Preview ── */}
      <div>
        <div className="mb-3">
          <span
            className="block text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Reminder timeline preview
          </span>
          <span
            className="mt-0.5 block text-xs"
            style={{ color: "var(--al-outline)" }}
          >
            What your customer experiences, chronologically
          </span>
        </div>

        <div
          className="rounded-xl border px-5 py-4"
          style={{
            background: "var(--al-surface-container-low)",
            borderColor: "var(--al-outline-variant)",
          }}
        >
          {selected.length === 0 ? (
            <p
              className="text-center text-sm"
              style={{ color: "var(--al-outline)" }}
            >
              Select intervals above to preview the reminder timeline
            </p>
          ) : (
            <div className="flex items-center">
              {sortedForTimeline.map((interval, idx) => {
                const preset = PRESETS.find((p) => p.value === interval)!;

                return (
                  <Fragment key={interval}>
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                        style={{
                          background: "var(--al-primary-fixed)",
                          border: "2px solid var(--al-primary)",
                          color: "var(--al-on-primary-fixed)",
                        }}
                      >
                        {preset.shortLabel}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--al-outline)",
                        }}
                      >
                        SMS
                      </span>
                    </div>

                    {idx < sortedForTimeline.length - 1 && (
                      <div
                        className="mx-2 h-px min-w-[16px] flex-1"
                        style={{ background: "var(--al-outline-variant)" }}
                      />
                    )}
                  </Fragment>
                );
              })}

              {/* Connector before appointment node */}
              <div
                className="mx-2 h-px min-w-[16px] flex-1"
                style={{ background: "var(--al-outline-variant)" }}
              />

              {/* Appointment endpoint */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: "var(--al-primary)" }}
                >
                  <CalendarIcon
                    className="h-4 w-4"
                    style={{ color: "var(--al-on-primary)" }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--al-outline)",
                  }}
                >
                  Appt
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Save Controls ── */}
      <div
        className="flex items-center gap-3 border-t pt-5"
        style={{ borderColor: "var(--al-outline-variant)" }}
      >
        <Button
          onClick={handleSave}
          disabled={isPending || !isDirty || selected.length === 0}
          size="sm"
        >
          {isPending ? "Saving\u2026" : "Save reminders"}
        </Button>

        {savedKey > 0 && !isDirty && (
          <span
            className="text-xs"
            style={{ color: "var(--al-status-positive)" }}
          >
            Saved
          </span>
        )}

        {selected.length === 0 && (
          <span
            className="text-xs"
            style={{ color: "var(--al-outline)" }}
          >
            Select at least one interval
          </span>
        )}
      </div>
    </div>
  );
}
