"use client";

import { useState } from "react";
import { createShop } from "@/app/app/actions";
import { BusinessTypeStep, type BusinessTypeValue } from "./business-type-step";
import { ShopDetailsStep } from "./shop-details-step";
import { StepContainer } from "./step-container";

export function OnboardingFlow() {
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
  };

  return (
    <div className="min-h-screen bg-bg-dark px-4 py-12">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-bg-dark p-6 sm:p-8">
        <StepContainer step={step} direction={direction}>
          {step === 1 ? (
            <BusinessTypeStep selected={businessType} onSelect={setBusinessType} onNext={handleNext} />
          ) : businessType ? (
            <ShopDetailsStep
              businessType={businessType}
              shopName={shopName}
              shopSlug={shopSlug}
              onShopNameChange={setShopName}
              onShopSlugChange={setShopSlug}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          ) : null
          }
        </StepContainer>
      </div>
    </div>
  );
}
