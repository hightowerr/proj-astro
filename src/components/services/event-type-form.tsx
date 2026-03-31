"use client";

import { useId, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EventTypeFormValues = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: 0 | 5 | 10;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
};

type EventTypeFormProps = {
  action: (formData: FormData) => Promise<void>;
  slotMinutes: number;
  initial?: EventTypeFormValues;
  submitLabel?: string;
  showActiveField?: boolean;
  onSuccess?: () => void;
};

const BUFFER_OPTIONS = [
  { label: "None", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
] as const;

const getDurationOptions = (slotMinutes: number) => {
  const options: number[] = [];
  for (let value = slotMinutes; value <= 240; value += slotMinutes) {
    options.push(value);
  }
  return options;
};

/** Custom checkbox styled with brand color when checked */
function BrandCheckbox({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm" style={{ cursor: "pointer" }}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        style={{
          width: "1rem",
          height: "1rem",
          borderRadius: "var(--radius-sm)",
          border: checked
            ? "1px solid var(--color-brand)"
            : "1px solid var(--color-border-default)",
          background: checked ? "var(--color-brand)" : "var(--color-surface-overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 150ms ease",
          flexShrink: 0,
        }}
      >
        {checked ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 5L4 7L8 3"
              stroke="var(--color-surface-void)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
      <span style={{ color: "var(--color-text-primary)" }}>{label}</span>
    </label>
  );
}

export function EventTypeForm({
  action,
  slotMinutes,
  initial,
  submitLabel = "Save service",
  showActiveField = false,
  onSuccess,
}: EventTypeFormProps) {
  const id = useId();
  const durationOptions = getDurationOptions(slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState<0 | 5 | 10>(
    initial?.bufferMinutes ?? 0
  );
  const [isHidden, setIsHidden] = useState(initial?.isHidden ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDuration = initial?.durationMinutes ?? durationOptions[0] ?? slotMinutes;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set("bufferMinutes", String(bufferMinutes));
      if (isHidden) {
        formData.set("isHidden", "on");
      } else {
        formData.delete("isHidden");
      }

      if (showActiveField) {
        formData.set("isActive", isActive ? "on" : "off");
      }

      await action(formData);
      form.reset();
      setBufferMinutes(initial?.bufferMinutes ?? 0);
      setIsHidden(initial?.isHidden ?? false);
      setIsActive(initial?.isActive ?? true);
      onSuccess?.();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save service"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={initial?.name ?? ""}
            placeholder="Signature service"
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${id}-description`}>Description</Label>
          <Textarea
            id={`${id}-description`}
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="Optional notes about this service."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-duration`}>Duration</Label>
          <select
            id={`${id}-duration`}
            name="durationMinutes"
            defaultValue={String(defaultDuration)}
            style={{
              background: "var(--color-surface-overlay)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              borderRadius: "var(--radius-lg)",
              padding: "0.625rem 0.875rem",
              fontSize: "0.875rem",
              width: "100%",
            }}
          >
            {durationOptions.map((value) => (
              <option key={value} value={value}>
                {value} minutes
              </option>
            ))}
          </select>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Must align to your {slotMinutes}-minute booking grid.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-deposit`}>Deposit override</Label>
          <Input
            id={`${id}-deposit`}
            name="depositAmountCents"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={
              initial?.depositAmountCents
                ? (initial.depositAmountCents / 100).toFixed(2)
                : ""
            }
            placeholder="Same as shop policy"
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Buffer
        </legend>
        <div className="flex flex-wrap gap-3">
          {BUFFER_OPTIONS.map((option) => {
            const isSelected = bufferMinutes === option.value;
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
                  name="bufferMinutes"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setBufferMinutes(option.value)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <BrandCheckbox
          label="Hide from public service list"
          name="isHidden"
          checked={isHidden}
          onChange={setIsHidden}
        />

        {showActiveField ? (
          <BrandCheckbox
            label="Active"
            name="isActive"
            checked={isActive}
            onChange={setIsActive}
          />
        ) : null}
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          background: isSubmitting ? "var(--color-brand-dim)" : "var(--color-brand)",
          color: "var(--color-surface-void)",
          borderRadius: "var(--radius-lg)",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          border: "none",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? "Saving\u2026" : submitLabel}
      </button>
    </form>
  );
}
