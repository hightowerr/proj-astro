"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

type FormInputProps = {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (() => void) | undefined;
  error?: string | undefined;
  success?: string | undefined;
  required?: boolean | undefined;
  helper?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  autoComplete?: string | undefined;
};

export function FormInput({
  label,
  id,
  value,
  onChange,
  onBlur,
  error,
  success,
  required,
  helper,
  placeholder,
  type = "text",
  autoComplete,
}: FormInputProps) {
  const descriptionId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2.5 block text-sm font-bold text-primary uppercase tracking-wider">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={descriptionId}
        autoComplete={autoComplete}
        className={`
          w-full rounded-xl border px-5 py-4 text-base text-primary transition-all duration-300
          placeholder:text-muted-foreground/40 focus:ring-4 focus:outline-none font-medium
          ${
            error
              ? "border-destructive/50 bg-destructive/5 focus:border-destructive focus:ring-destructive/10"
              : success
                ? "border-success/50 bg-success/5 focus:border-success focus:ring-success/10"
                : "border-border/60 bg-al-surface-low focus:border-primary/40 focus:ring-primary/5 shadow-sm"
          }
        `}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-destructive/80">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {!error && success ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success/80">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          <span>{success}</span>
        </p>
      ) : null}
      {!error && !success && helper ? (
        <p id={`${id}-helper`} className="mt-2 text-xs font-medium text-muted-foreground/60">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
