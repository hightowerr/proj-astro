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
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-white">
        {label} {required ? <span className="text-error-red">*</span> : null}
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
          w-full rounded-lg border px-4 py-3 text-base text-white transition-all duration-200
          placeholder:text-text-light-muted focus:ring-2 focus:outline-none
          ${
            error
              ? "border-error-red bg-error-red/5 focus:border-error-red focus:ring-error-red/20"
              : success
                ? "border-success-green bg-bg-dark-secondary focus:border-success-green focus:ring-success-green/20"
                : "border-white/10 bg-bg-dark-secondary focus:border-primary focus:ring-primary/20"
          }
        `}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-error-red">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {!error && success ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-success-green">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          <span>{success}</span>
        </p>
      ) : null}
      {!error && !success && helper ? (
        <p id={`${id}-helper`} className="mt-1.5 text-xs text-text-light-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
