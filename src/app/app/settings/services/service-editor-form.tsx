"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ShopContext, ServiceEditorValues, ServiceField } from "./types";

type ServiceEditorFormProps = {
  mode: "edit" | "create";
  draft: ServiceEditorValues;
  shopContext: ShopContext;
  fieldErrors?: Partial<Record<ServiceField, string>>;
  formError?: string | null;
  onFieldChange: <K extends ServiceField>(field: K, value: ServiceEditorValues[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  savePending?: boolean;
  saveSuccess?: boolean;
};

type ToggleFieldProps = {
  checked: boolean;
  description: string;
  label: string;
  name: "isActive" | "isHidden";
  onChange: (checked: boolean) => void;
};

// Shared label style — tiny uppercase caps with generous tracking per Stitch reference.
const labelClassName =
  "block text-[10px] font-extrabold uppercase tracking-[0.2em] ml-1 opacity-50";

// Shared input/select chrome — flat surface, no border, rounded-xl, generous padding.
const surfaceFieldClassName = cn(
  "w-full bg-al-surface-low dark:bg-slate-800/50 border-none rounded-xl px-5 py-4 text-foreground outline-none transition-colors shadow-none",
  "placeholder:text-on-surface-variant/30",
  "focus:bg-muted dark:focus:bg-slate-800 focus:ring-1 focus:ring-primary/20",
);

function getFieldClassName(hasError: boolean) {
  return cn(surfaceFieldClassName, hasError && "ring-1 ring-error/30 bg-error-container/20");
}

function ToggleField({ checked, label, name, onChange }: Omit<ToggleFieldProps, "description">) {
  return (
    <label className="flex items-center justify-between md:justify-start gap-4 cursor-pointer group">
      <div className="relative inline-flex items-center cursor-pointer">
        <input
          className="sr-only peer"
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className="w-12 h-6.5 bg-muted dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"></div>
      </div>
      <span className={cn(
        "text-[11px] font-extrabold uppercase tracking-widest transition-colors",
        checked ? "text-primary opacity-100" : "text-on-surface-variant opacity-50"
      )}>
        {label}
      </span>
    </label>
  );
}

export function ServiceEditorForm({
  mode,
  draft,
  shopContext,
  fieldErrors = {},
  formError = null,
  onFieldChange,
  onSave,
  onCancel,
  savePending = false,
  saveSuccess = false,
}: ServiceEditorFormProps) {
  const prefersReducedMotion = useReducedMotion();

  const durationOptions = Array.from(
    { length: Math.max(1, Math.floor(480 / shopContext.slotMinutes)) },
    (_, index) => (index + 1) * shopContext.slotMinutes,
  );

  // Buffer still emits the exact same typed values to onFieldChange — just rendered as chips.
  const bufferOptions: Array<{
    label: string;
    value: 0 | 5 | 10 | null;
  }> = [
    { value: 0, label: "None" },
    { value: 5, label: "5m" },
    { value: 10, label: "10m" },
    { value: null, label: "Default" },
  ];

  const depositValue =
    draft.depositAmountCents === null ? "" : (draft.depositAmountCents / 100).toFixed(2);

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <AnimatePresence mode="wait">
        {formError ? (
          <motion.div
            key="form-error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-5 text-sm font-semibold bg-al-error-container text-al-on-error-container"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined">error</span>
              {formError}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-3">
        <label className={labelClassName} htmlFor="service-name">
          {mode === "create" ? "New Service Label" : "Service Identification"}
        </label>
        <Input
          aria-invalid={fieldErrors.name ? true : undefined}
          autoComplete="off"
          className={getFieldClassName(Boolean(fieldErrors.name))}
          id="service-name"
          onChange={(event) => onFieldChange("name", event.target.value)}
          placeholder="e.g. Bespoke Tailoring"
          value={draft.name}
        />
        {fieldErrors.name ? (
          <p className="text-[10px] font-extrabold uppercase tracking-widest pl-1 text-error">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className={labelClassName} htmlFor="service-duration">
            Time Commitment
          </label>
          <div className="relative">
            <select
              className={cn(
                getFieldClassName(Boolean(fieldErrors.durationMinutes)),
                "appearance-none pr-12",
              )}
              id="service-duration"
              onChange={(event) => onFieldChange("durationMinutes", Number(event.target.value))}
              value={String(draft.durationMinutes)}
            >
              {durationOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} mins
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30"
            >
              expand_more
            </span>
          </div>
          {fieldErrors.durationMinutes ? (
            <p className="text-[10px] font-extrabold uppercase tracking-widest pl-1 text-error">
              {fieldErrors.durationMinutes}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className={labelClassName} htmlFor="service-deposit">
            Deposit override ($)
          </label>
          <Input
            aria-invalid={fieldErrors.depositAmountCents ? true : undefined}
            autoComplete="off"
            className={getFieldClassName(Boolean(fieldErrors.depositAmountCents))}
            id="service-deposit"
            inputMode="decimal"
            onChange={(event) => {
              const value = event.target.value.trim();
              if (value === "") {
                onFieldChange("depositAmountCents", null);
                return;
              }

              const dollars = Number(value);
              onFieldChange(
                "depositAmountCents",
                Number.isFinite(dollars) ? Math.round(dollars * 100) : null,
              );
            }}
            placeholder={
              shopContext.defaultDepositCents === null
                ? "0.00"
                : `${(shopContext.defaultDepositCents / 100).toFixed(2)}`
            }
            type="number"
            value={depositValue}
          />
          {fieldErrors.depositAmountCents ? (
            <p className="text-[10px] font-extrabold uppercase tracking-widest pl-1 text-error">
              {fieldErrors.depositAmountCents}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <label className={labelClassName} htmlFor="service-description">
          Experience Narrative
        </label>
        <Textarea
          aria-invalid={fieldErrors.description ? true : undefined}
          autoComplete="off"
          className={cn(getFieldClassName(Boolean(fieldErrors.description)), "resize-y min-h-[100px]")}
          id="service-description"
          onChange={(event) => onFieldChange("description", event.target.value)}
          placeholder="Describe the artisanal journey..."
          rows={3}
          value={draft.description}
        />
        {fieldErrors.description ? (
          <p className="text-[10px] font-extrabold uppercase tracking-widest pl-1 text-error">
            {fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <span id="buffer-group-label" className={labelClassName}>Operational Buffer</span>
        <div className="flex flex-wrap gap-3" role="group" aria-labelledby="buffer-group-label">
          {bufferOptions.map((option) => {
            const key = option.value === null ? "default" : String(option.value);
            const isSelected =
              (draft.bufferMinutes === null && option.value === null) ||
              draft.bufferMinutes === option.value;
            return (
              <motion.button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onFieldChange("bufferMinutes", option.value)}
                className={cn(
                  "px-6 py-2.5 text-[11px] font-extrabold uppercase tracking-widest rounded-full transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isSelected
                    ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20"
                    : "bg-transparent border-on-surface-variant/10 text-on-surface-variant hover:border-on-surface-variant/30 hover:bg-al-surface-low",
                )}
                {...(!prefersReducedMotion && { whileTap: { scale: 0.94 } })}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/*
        Footer region — uses negative margins to bleed to the card edge and is painted with a tonal
        surface + top border to match the Stitch reference footer bar.
      */}
      <div
        className="-mx-10 md:-mx-12 -mb-10 md:-mb-12 mt-12 p-10 md:p-12 border-t border-on-surface-variant/5 bg-al-surface-low"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col gap-6 w-full md:w-auto">
            <ToggleField
              checked={draft.isActive}
              label="Availability Status"
              name="isActive"
              onChange={(value) => onFieldChange("isActive", value)}
            />
            <ToggleField
              checked={draft.isHidden}
              label="Private Listing Only"
              name="isHidden"
              onChange={(value) => onFieldChange("isHidden", value)}
            />
          </div>

          <div className="flex items-center gap-8 w-full md:w-auto justify-end">
            <AnimatePresence>
              {saveSuccess ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-success"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-base"
                  >
                    done_all
                  </span>
                  Refined
                </motion.span>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Reset
            </button>
            <motion.button
              type="submit"
              disabled={savePending}
              className="flex-1 md:flex-none px-12 py-5 bg-primary text-on-primary rounded-[2rem] text-[11px] font-extrabold uppercase tracking-[0.2em] shadow-[0px_20px_40px_rgba(0,30,64,0.25)] transition-[opacity,transform] disabled:opacity-40 disabled:cursor-not-allowed motion-safe:hover:scale-[1.02] motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {savePending ? (
                <div className="flex items-center gap-3">
                  <Spinner className="text-on-primary" size="sm" />
                  <span>Committing...</span>
                </div>
              ) : (
                <span>Save Changes</span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </form>
  );
}
