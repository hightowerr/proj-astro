"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/app/app/actions";
import { createDefaultEventType } from "@/app/app/settings/services/actions";
import { AddServiceStep } from "./add-service-step";
import { BusinessTypeStep, type BusinessTypeValue } from "./business-type-step";
import { ShopDetailsStep } from "./shop-details-step";
import { StepContainer } from "./step-container";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessTypeValue | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopSlug, setShopSlug] = useState("");

  const handleNext = () => {
    if (!businessType) {
      return;
    }
    setDirection(1);
    setStep(2);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!businessType) {
      throw new Error("Select a business type first");
    }

    await createShop({
      businessType,
      shopName,
      shopSlug,
    });

    setDirection(1);
    setStep(3);
  };

  const handleServiceDone = () => {
    router.push("/app/dashboard");
  };

  const handleServiceSkip = async () => {
    await createDefaultEventType();
    router.push("/app/dashboard");
  };

  return (
    <div className="min-h-screen bg-background font-manrope px-4 py-16 sm:px-6 sm:py-20 selection:bg-al-primary-fixed/30 selection:text-al-primary">
      <div className="mx-auto w-full max-w-2xl rounded-[var(--al-radius-2xl)] border border-border/40 bg-card p-8 sm:p-12 shadow-[var(--al-shadow-float)]">
        <StepContainer step={step} direction={direction}>
          {step === 1 ? (
            <BusinessTypeStep selected={businessType} onSelect={setBusinessType} onNext={handleNext} />
          ) : step === 2 && businessType ? (
            <ShopDetailsStep
              businessType={businessType}
              shopName={shopName}
              shopSlug={shopSlug}
              onShopNameChange={setShopName}
              onShopSlugChange={setShopSlug}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          ) : step === 3 ? (
            <AddServiceStep onDone={handleServiceDone} onSkip={handleServiceSkip} />
          ) : null}
        </StepContainer>
      </div>
    </div>
  );
}
