"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createEventType } from "@/app/app/settings/services/actions";
import { FormInput } from "./form-input";

type AddServiceStepProps = {
  onDone: () => void;
  onSkip: () => Promise<void>;
};

const DURATION_OPTIONS = [
  { value: 60, label: "60 min" },
  { value: 120, label: "120 min" },
  { value: 180, label: "180 min" },
  { value: 240, label: "240 min" },
] as const;

const BUFFER_OPTIONS: Array<{ value: 0 | 5 | 10; label: string }> = [
  { value: 0, label: "None" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not save service. Please try again.";
};

export function AddServiceStep({ onDone, onSkip }: AddServiceStepProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [bufferMinutes, setBufferMinutes] = useState<0 | 5 | 10>(0);
  const [depositDollars, setDepositDollars] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const validateName = () => {
    if (!name.trim()) {
      setNameError("Service name is required");
      return false;
    }

    setNameError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!validateName()) {
      return;
    }

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("durationMinutes", String(durationMinutes));
    formData.set("bufferMinutes", String(bufferMinutes));
    if (depositDollars.trim()) {
      formData.set("depositAmountCents", depositDollars.trim());
    }

    setIsSubmitting(true);
    try {
      await createEventType(formData);
      onDone();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitError(null);
    setIsSkipping(true);

    try {
      await onSkip();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold lg:text-3xl" style={{ color: "var(--color-text-primary)" }}>
          Add your first service
        </h1>
        <p className="text-base lg:text-lg" style={{ color: "var(--color-text-secondary)" }}>
          You can add more services later from your dashboard
        </p>
      </div>

      <div className="space-y-6">
        <FormInput
          label="Service name"
          id="service-name"
          value={name}
          onChange={(value) => {
            setName(value);
            setSubmitError(null);
          }}
          onBlur={validateName}
          error={nameError}
          required
          placeholder="e.g. Haircut, Full Colour, Deep Tissue Massage"
        />

        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Duration <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDurationMinutes(option.value)}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={durationMinutes === option.value ? {
                  borderColor: "var(--color-brand-border)",
                  background: "var(--color-brand-subtle)",
                  color: "var(--color-brand)",
                } : {
                  borderColor: "var(--color-border-default)",
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Buffer time
          </label>
          <p className="mb-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Built-in wrap-up time at the end of each slot (inclusive of duration)
          </p>
          <div className="flex gap-2">
            {BUFFER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBufferMinutes(option.value)}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={bufferMinutes === option.value ? {
                  borderColor: "var(--color-brand-border)",
                  background: "var(--color-brand-subtle)",
                  color: "var(--color-brand)",
                } : {
                  borderColor: "var(--color-border-default)",
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <FormInput
          label="Deposit amount (optional)"
          id="deposit-override"
          value={depositDollars}
          onChange={(value) => {
            setDepositDollars(value);
            setSubmitError(null);
          }}
          placeholder="e.g. 25.00"
          helper="Leave blank to use your shop's default deposit policy"
          type="number"
        />

        {submitError ? (
          <p
            role="alert"
            className="rounded-lg p-3 text-sm"
            style={{
              border: "1px solid var(--color-error-border)",
              background: "var(--color-error-subtle)",
              color: "var(--color-error)",
            }}
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row">
        <button
          onClick={handleSkip}
          disabled={isSkipping || isSubmitting}
          className="rounded-xl px-6 py-3 transition-colors duration-200 disabled:opacity-50"
          style={{
            border: "1px solid var(--color-border-medium)",
            color: "var(--color-text-primary)",
            background: "var(--color-surface-elevated)",
          }}
          type="button"
        >
          Skip for now
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isSkipping}
          className="flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition-colors duration-200 disabled:cursor-wait disabled:opacity-75"
          style={{
            background: "var(--color-brand)",
            color: "var(--color-text-inverse)",
          }}
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Saving...</span>
            </>
          ) : (
            "Add service"
          )}
        </button>
      </div>

      <p
        className="text-center text-xs font-medium tracking-wider uppercase"
        style={{ color: "var(--color-text-tertiary)" }}
        aria-live="polite"
      >
        Step 3 of 3
      </p>
    </div>
  );
}
