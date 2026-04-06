"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormInput } from "./form-input";
import type { BusinessTypeValue } from "./business-type-step";

type ShopDetailsStepProps = {
  businessType: BusinessTypeValue;
  shopName: string;
  shopSlug: string;
  onShopNameChange: (value: string) => void;
  onShopSlugChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
};

const businessTypeLabels: Record<BusinessTypeValue, string> = {
  beauty: "Beauty Salon",
  hair: "Hair Salon",
  "spa-massage": "Spa & Massage Studio",
  "health-clinic": "Health Clinic",
  "personal-trainer": "Personal Training Studio",
  "general-services": "Service Business",
};

const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to create your shop right now. Please try again.";
};

const isRedirectSignal = (error: unknown) => {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
};

export function ShopDetailsStep({
  businessType,
  shopName,
  shopSlug,
  onShopNameChange,
  onShopSlugChange,
  onBack,
  onSubmit,
}: ShopDetailsStepProps) {
  const [errors, setErrors] = useState<{
    name: string | undefined;
    slug: string | undefined;
  }>({
    name: undefined,
    slug: undefined,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateShopName = () => {
    const trimmedName = shopName.trim();
    if (!trimmedName) {
      setErrors((previous) => ({ ...previous, name: "Shop name is required" }));
      return false;
    }
    if (trimmedName.length < 2) {
      setErrors((previous) => ({ ...previous, name: "Must be at least 2 characters" }));
      return false;
    }
    setErrors((previous) => ({ ...previous, name: undefined }));
    return true;
  };

  const validateShopSlug = () => {
    const trimmedSlug = shopSlug.trim();
    if (!trimmedSlug) {
      setErrors((previous) => ({ ...previous, slug: "Shop URL slug is required" }));
      return false;
    }
    if (trimmedSlug.length < 3) {
      setErrors((previous) => ({ ...previous, slug: "Must be at least 3 characters" }));
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setErrors((previous) => ({
        ...previous,
        slug: "Only lowercase letters, numbers, and hyphens allowed",
      }));
      return false;
    }

    setErrors((previous) => ({ ...previous, slug: undefined }));
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const isShopNameValid = validateShopName();
    const isShopSlugValid = validateShopSlug();
    if (!isShopNameValid || !isShopSlugValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      if (isRedirectSignal(error)) {
        return;
      }
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-white lg:text-3xl">
          Great! Now let&apos;s set up your {businessTypeLabels[businessType]}
        </h1>
        <p className="text-base text-text-muted lg:text-lg">We just need a few details to get started</p>
      </div>

      <div className="space-y-6">
        <FormInput
          label="Shop name"
          id="shop-name"
          value={shopName}
          onChange={(value) => {
            onShopNameChange(value);
            setSubmitError(null);
          }}
          onBlur={validateShopName}
          error={errors.name}
          required
          placeholder="My Awesome Shop"
          autoComplete="organization"
        />

        <div>
          <FormInput
            label="Shop URL slug"
            id="shop-slug"
            value={shopSlug}
            onChange={(value) => {
              onShopSlugChange(normalizeSlug(value));
              setSubmitError(null);
            }}
            onBlur={validateShopSlug}
            error={errors.slug}
            required
            placeholder="my-shop"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs font-mono text-text-light-muted">
            astro.com/book/<span className="text-primary">{shopSlug || "your-shop-slug"}</span>
          </p>
        </div>

        {submitError ? (
          <p role="alert" className="rounded-lg border border-error-red/40 bg-error-red/10 p-3 text-sm text-error-red">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row">
        <button
          onClick={() => {
            setSubmitError(null);
            onBack();
          }}
          className="rounded-xl border border-white/30 px-6 py-3 text-white transition-colors duration-200 hover:bg-white/10"
          type="button"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-coral px-8 py-3 font-semibold text-bg-dark transition-colors duration-200 hover:bg-[#F09070] disabled:cursor-wait disabled:opacity-75"
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Creating shop...</span>
            </>
          ) : (
            "Create Shop"
          )}
        </button>
      </div>

      <p className="text-center text-xs font-medium tracking-wider text-text-light-muted uppercase" aria-live="polite">
        Step 2 of 3
      </p>
    </div>
  );
}
