"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessTypeValue } from "./business-type-step";
import { FormInput } from "./form-input";

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
    <div className="space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight lg:text-4xl">
          Set up your {businessTypeLabels[businessType]}
        </h1>
        <p className="text-lg text-muted-foreground font-medium">Define your public brand and URL</p>
      </div>

      <div className="space-y-8">
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
          placeholder="e.g. Atelier Studio"
          autoComplete="organization"
        />

        <div className="space-y-3">
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
            placeholder="e.g. atelier-studio"
            autoComplete="off"
          />
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Public link</span>
            <div className="h-px flex-1 bg-border/40" />
            <p className="text-xs font-mono text-muted-foreground font-medium">
              astro.com/book/<span className="text-primary font-bold">{shopSlug || "your-slug"}</span>
            </p>
          </div>
        </div>

        {submitError ? (
          <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive/80 animate-in fade-in zoom-in-95">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse justify-between gap-5 sm:flex-row pt-4">
        <Button
          onClick={() => {
            setSubmitError(null);
            onBack();
          }}
          variant="al-ghost"
          className="px-8 py-7 rounded-2xl font-bold text-lg h-auto border border-border/40 hover:bg-background transition-all active:scale-95"
          type="button"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="al-primary"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-3 px-12 py-7 rounded-2xl font-bold text-lg h-auto shadow-xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Building shop...</span>
            </>
          ) : (
            "Create Shop"
          )}
        </Button>
      </div>

      <p className="text-center text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase" aria-live="polite">
        Step 2 of 3
      </p>
    </div>
  );
}
