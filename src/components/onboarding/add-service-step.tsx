"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createEventType } from "@/app/app/settings/services/actions";
import { MAX_SERVICE_DURATION_MINUTES } from "@/app/app/settings/services/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormInput } from "./form-input";

type AddServiceStepProps = {
  onDone: () => void;
  onSkip: () => Promise<void>;
};

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
    <div className="space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight lg:text-4xl">
          Add your first service
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          Personalize your shop with a signature treatment
        </p>
      </div>

      <div className="space-y-8">
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

        <div className="space-y-4">
          <label className="text-sm font-bold text-primary uppercase tracking-wider">
            Duration <span className="text-destructive">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              id="duration"
              min={5}
              max={MAX_SERVICE_DURATION_MINUTES}
              step={5}
              placeholder="e.g. 60"
              aria-label="Duration"
              value={durationMinutes || ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDurationMinutes(Number.isNaN(val) ? 0 : val);
              }}
              className={cn(
                "w-full rounded-xl border-2 border-border/40 bg-al-surface-low px-4 py-3.5 text-sm font-bold text-primary transition-all",
                "placeholder:text-muted-foreground/40",
                "focus:border-primary focus:bg-primary/5 focus:outline-none",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden",
                "pr-24",
              )}
            />
            <span className="absolute right-14 text-sm text-muted-foreground/60 pointer-events-none select-none">
              min
            </span>
            <div className="absolute right-3 flex flex-col gap-0.5">
              <button
                type="button"
                aria-label="Increase"
                className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
                onClick={() => setDurationMinutes((prev) => Math.min(prev + 5, MAX_SERVICE_DURATION_MINUTES))}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_up</span>
              </button>
              <button
                type="button"
                aria-label="Decrease"
                className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
                onClick={() => setDurationMinutes((prev) => Math.max(prev - 5, 5))}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_down</span>
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground/60">
            In 5-minute steps, up to 8 hours (480 min).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-primary uppercase tracking-wider">
              Buffer time
            </label>
            <p className="mt-1 text-xs font-medium text-muted-foreground/60">
              Wrap-up time at the end of each slot
            </p>
          </div>
          <div className="flex gap-3">
            {BUFFER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBufferMinutes(option.value)}
                className={cn(
                  "flex-1 rounded-xl border-2 px-4 py-3.5 text-sm font-bold transition-all duration-300 active:scale-95",
                  bufferMinutes === option.value
                    ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10"
                    : "border-border/40 bg-al-surface-low text-muted-foreground/60 hover:border-primary/30"
                )}
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
          helper="Leave blank to use your shop's default policy"
          type="number"
        />

        {submitError ? (
          <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive/80">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse justify-between gap-5 sm:flex-row pt-4">
        <Button
          onClick={handleSkip}
          disabled={isSkipping || isSubmitting}
          variant="al-ghost"
          className="px-8 py-7 rounded-2xl font-bold text-lg h-auto border border-border/40 hover:bg-background transition-all active:scale-95"
          type="button"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || isSkipping}
          variant="al-primary"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-3 px-12 py-7 rounded-2xl font-bold text-lg h-auto shadow-xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Saving service...</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Add service</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase" aria-live="polite">
        Step 3 of 3
      </p>
    </div>
  );
}
