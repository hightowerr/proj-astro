"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  "block text-[10px] font-extrabold uppercase tracking-widest ml-1 opacity-60";

// Shared input/select chrome — flat surface, no border, rounded-xl, generous padding.
const surfaceFieldClassName = cn(
  "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors shadow-none",
  "bg-[var(--al-background)] text-[var(--al-on-surface)]",
  "placeholder:text-[var(--al-outline)]",
  "focus-visible:bg-[var(--al-surface-container-high)]",
  "focus-visible:ring-1 focus-visible:ring-[var(--al-ghost-border)]",
);

function getFieldClassName(hasError: boolean) {
  return cn(surfaceFieldClassName, hasError && "bg-[var(--al-error-container)]");
}

function ToggleField({ checked, description, label, name, onChange }: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-center gap-4">
      {/*
        CSS-driven toggle switch — the `<input>` below remains in the DOM (sr-only) so
        keyboard users can focus/toggle it, and its onChange still drives the behavior.
      */}
      <span
        className="al-toggle-track"
        data-checked={checked ? "true" : "false"}
        aria-hidden="true"
      >
        <span className="al-toggle-thumb" />
      </span>
      <input
        className="sr-only"
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="space-y-0.5">
        <span
          className="block text-[11px] font-extrabold uppercase tracking-widest"
          style={{ color: checked ? "var(--al-on-surface)" : "var(--al-on-surface-variant)" }}
        >
          {label}
        </span>
        <span
          className="block text-xs"
          style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}
        >
          {description}
        </span>
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
    { value: null, label: "Shop Default" },
  ];

  const depositValue =
    draft.depositAmountCents === null ? "" : (draft.depositAmountCents / 100).toFixed(2);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <AnimatePresence>
        {formError ? (
          <motion.div
            key="form-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-4 text-sm"
            style={{
              background: "var(--al-error-container)",
              color: "var(--al-on-error-container)",
            }}
          >
            {formError}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-2">
        <label className={labelClassName} htmlFor="service-name">
          Service name
        </label>
        <Input
          aria-invalid={fieldErrors.name ? true : undefined}
          className={getFieldClassName(Boolean(fieldErrors.name))}
          id="service-name"
          onChange={(event) => onFieldChange("name", event.target.value)}
          placeholder="Signature fitting"
          value={draft.name}
        />
        {fieldErrors.name ? (
          <p className="text-xs" style={{ color: "var(--al-error)" }}>
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className={labelClassName} htmlFor="service-duration">
            Duration
          </label>
          <select
            className={cn(
              getFieldClassName(Boolean(fieldErrors.durationMinutes)),
              "appearance-none",
            )}
            id="service-duration"
            onChange={(event) => onFieldChange("durationMinutes", Number(event.target.value))}
            value={String(draft.durationMinutes)}
          >
            {durationOptions.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
          {fieldErrors.durationMinutes ? (
            <p className="text-xs" style={{ color: "var(--al-error)" }}>
              {fieldErrors.durationMinutes}
            </p>
          ) : null}
          <p
            className="text-xs text-pretty ml-1 opacity-70"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Uses your {shopContext.slotMinutes}-minute slot grid.
          </p>
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="service-deposit">
            Deposit override
          </label>
          <Input
            aria-invalid={fieldErrors.depositAmountCents ? true : undefined}
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
                ? "Policy default"
                : `Policy default (${(shopContext.defaultDepositCents / 100).toFixed(2)})`
            }
            type="number"
            value={depositValue}
          />
          {fieldErrors.depositAmountCents ? (
            <p className="text-xs" style={{ color: "var(--al-error)" }}>
              {fieldErrors.depositAmountCents}
            </p>
          ) : null}
          <p
            className="text-xs text-pretty ml-1 opacity-70"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Leave blank to inherit the booking policy default.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClassName} htmlFor="service-description">
          Description
        </label>
        <Textarea
          aria-invalid={fieldErrors.description ? true : undefined}
          className={getFieldClassName(Boolean(fieldErrors.description))}
          id="service-description"
          onChange={(event) => onFieldChange("description", event.target.value)}
          placeholder="Add optional details customers should know before booking."
          rows={4}
          value={draft.description}
        />
        {fieldErrors.description ? (
          <p className="text-xs" style={{ color: "var(--al-error)" }}>
            {fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <span className={labelClassName}>Buffer</span>
        <div className="flex flex-wrap gap-2">
          {bufferOptions.map((option) => {
            const key = option.value === null ? "default" : String(option.value);
            const isSelected =
              (draft.bufferMinutes === null && option.value === null) ||
              draft.bufferMinutes === option.value;
            return (
              <motion.button
                key={key}
                type="button"
                // BOUNDARY: buffer still fires onFieldChange with the same typed values (0 | 5 | 10 | null).
                onClick={() => onFieldChange("bufferMinutes", option.value)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                  isSelected
                    ? "shadow-md"
                    : "border hover:bg-[var(--al-surface-container-lowest)]",
                )}
                style={
                  isSelected
                    ? {
                        background: "var(--al-primary)",
                        color: "var(--al-on-primary)",
                      }
                    : {
                        borderColor: "rgba(195, 198, 209, 0.35)",
                        color: "var(--al-on-surface-variant)",
                      }
                }
                whileTap={{ scale: 0.91 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
        {fieldErrors.bufferMinutes ? (
          <p className="text-xs" style={{ color: "var(--al-error)" }}>
            {fieldErrors.bufferMinutes}
          </p>
        ) : null}
      </div>

      {fieldErrors.isActive || fieldErrors.isHidden ? (
        <div className="space-y-1">
          {fieldErrors.isActive ? (
            <p className="text-xs" style={{ color: "var(--al-error)" }}>
              {fieldErrors.isActive}
            </p>
          ) : null}
          {fieldErrors.isHidden ? (
            <p className="text-xs" style={{ color: "var(--al-error)" }}>
              {fieldErrors.isHidden}
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
        Footer region — uses negative margins to bleed to the card edge and is painted with a tonal
        surface + top border to match the Stitch reference footer bar.
      */}
      <div
        className="-mx-8 -mb-8 mt-8 px-8 py-8 border-t"
        style={{
          background: "rgba(244, 244, 242, 0.50)",
          borderColor: "rgba(195, 198, 209, 0.30)",
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            {/* BOUNDARY: toggles still fire onFieldChange("isActive"/"isHidden", checked). */}
            <ToggleField
              checked={draft.isActive}
              description="Inactive services cannot be booked."
              label="Active"
              name="isActive"
              onChange={(value) => onFieldChange("isActive", value)}
            />
            <ToggleField
              checked={draft.isHidden}
              description="Publicly hidden - bookable via direct link only."
              label="Hide from public page"
              name="isHidden"
              onChange={(value) => onFieldChange("isHidden", value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {saveSuccess ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-success)" }}
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                    style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  Saved
                </motion.span>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-colors hover:border-[var(--al-primary)]/20 hover:underline"
              style={{ color: "var(--al-on-surface-variant)" }}
            >
              {mode === "create" ? "Cancel" : "Cancel"}
            </button>
            {/* BOUNDARY: Save click still invokes the form's onSubmit → onSave. */}
            <motion.button
              type="submit"
              disabled={savePending}
              className="px-10 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-70 inline-flex items-center gap-2"
              style={{
                background: "var(--al-primary)",
                color: "var(--al-on-primary)",
                boxShadow: "0 8px 24px rgba(0, 30, 64, 0.20)",
              }}
              whileHover={!savePending ? { scale: 1.02 } : {}}
              whileTap={!savePending ? { scale: 0.96 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {savePending ? (
                <>
                  <Spinner className="text-[var(--al-on-primary)]" size="sm" />
                  <span>{mode === "create" ? "Creating..." : "Saving..."}</span>
                </>
              ) : (
                <span>{mode === "create" ? "Create Service" : "Save Changes"}</span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </form>
  );
}
