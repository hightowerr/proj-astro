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
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
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

      <fieldset className="space-y-3">
        <legend
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          Default buffer between appointments
        </legend>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
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
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  background: isSelected
                    ? "var(--color-brand-subtle)"
                    : "var(--color-surface-overlay)",
                  border: isSelected
                    ? "1px solid var(--color-brand-border)"
                    : "1px solid var(--color-border-default)",
                  color: isSelected
                    ? "var(--color-brand)"
                    : "var(--color-text-secondary)",
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Business hours</h2>
        <div className="space-y-3">
          {initial.days.map((day) => {
            const isClosed = closedDays[day.dayOfWeek];

            return (
              <div
                key={day.dayOfWeek}
                className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[120px_1fr_1fr_120px]"
              >
                <div className="text-sm font-medium">{day.label}</div>

                <div className="space-y-1">
                  <Label htmlFor={`day-${day.dayOfWeek}-open`} className="text-xs">
                    Open
                  </Label>
                  <Input
                    id={`day-${day.dayOfWeek}-open`}
                    name={`day-${day.dayOfWeek}-open`}
                    type="time"
                    defaultValue={day.openTime}
                    disabled={isClosed}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`day-${day.dayOfWeek}-close`} className="text-xs">
                    Close
                  </Label>
                  <Input
                    id={`day-${day.dayOfWeek}-close`}
                    name={`day-${day.dayOfWeek}-close`}
                    type="time"
                    defaultValue={day.closeTime}
                    disabled={isClosed}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`day-${day.dayOfWeek}-closed`}
                    checked={isClosed}
                    onChange={(event) =>
                      setClosedDays((prev) => ({
                        ...prev,
                        [day.dayOfWeek]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save availability settings"}
      </Button>
    </form>
  );
}
