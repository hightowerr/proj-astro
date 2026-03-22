"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { updateReminderTimings } from "@/app/app/settings/reminders/actions";
import { Button } from "@/components/ui/button";

type Interval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

const PRESETS: Array<{
  value: Interval;
  badge: string;
  fullLabel: string;
  persona: string;
}> = [
  { value: "10m", badge: "10 min", fullLabel: "10 minutes before", persona: "Phone calls" },
  { value: "1h", badge: "1 hr", fullLabel: "1 hour before", persona: "General" },
  { value: "2h", badge: "2 hr", fullLabel: "2 hours before", persona: "Hairstylists" },
  { value: "4h", badge: "4 hr", fullLabel: "4 hours before", persona: "General" },
  { value: "24h", badge: "24 hr", fullLabel: "24 hours before", persona: "Most common" },
  { value: "48h", badge: "48 hr", fullLabel: "48 hours before", persona: "Therapists" },
  { value: "1w", badge: "1 wk", fullLabel: "1 week before", persona: "Therapists" },
];

const MAX = 3;

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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Customers receive a reminder at each selected interval before their appointment. Changes
          apply to new bookings only.
        </p>
        <div
          className="flex shrink-0 items-center gap-1.5 pt-0.5"
          aria-label={`${selected.length} of ${MAX} slots used`}
        >
          {Array.from({ length: MAX }).map((_, index) => (
            <span
              key={index}
              className={
                index < selected.length
                  ? "block h-2 w-2 rounded-full bg-[var(--color-primary)] transition-colors duration-200"
                  : "block h-2 w-2 rounded-full bg-[rgba(255,255,255,0.12)] transition-colors duration-200"
              }
            />
          ))}
          <span className="text-muted-foreground ml-1 font-mono text-xs">
            {selected.length}/{MAX}
          </span>
        </div>
      </div>

      {atMax ? (
        <div className="rounded-md border border-[var(--color-accent-coral)]/25 bg-[var(--color-accent-coral)]/8 px-3.5 py-2.5">
          <p className="text-xs text-[var(--color-accent-coral)]">
            Max 3 reminders reached - deselect one to choose a different interval.
          </p>
        </div>
      ) : null}

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {PRESETS.map((preset) => {
          const isSelected = selected.includes(preset.value);
          const isDisabled = atMax && !isSelected;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  toggle(preset.value);
                }
              }}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={[
                "group flex w-full items-center gap-3 px-1 py-3 text-left transition-colors duration-150",
                isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                    : "border-[var(--color-border-medium)] bg-transparent",
                ].join(" ")}
              >
                {isSelected ? (
                  <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                ) : null}
              </span>

              <span
                className={[
                  "w-12 shrink-0 font-mono text-xs font-semibold tracking-tight",
                  isSelected ? "text-[var(--color-primary-light)]" : "text-muted-foreground",
                ].join(" ")}
              >
                {preset.badge}
              </span>

              <span className="flex-1 text-sm">{preset.fullLabel}</span>

              <span
                className={[
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity",
                  isSelected
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-light)] opacity-100"
                    : "text-muted-foreground bg-[rgba(255,255,255,0.06)] opacity-60 group-hover:opacity-80",
                ].join(" ")}
              >
                {preset.persona}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSave}
          disabled={isPending || !isDirty || selected.length === 0}
          size="sm"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        {savedKey > 0 && !isDirty ? (
          <span className="text-xs text-[var(--color-success-green)]">Saved</span>
        ) : null}
        {selected.length === 0 ? (
          <span className="text-muted-foreground text-xs">Select at least one interval</span>
        ) : null}
      </div>
    </div>
  );
}
