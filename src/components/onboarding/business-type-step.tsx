"use client";

import {
  Dumbbell,
  Heart,
  Scissors,
  Sparkles,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { BusinessTypeCard } from "./business-type-card";

export const businessTypes = [
  { value: "beauty", label: "Beauty", icon: Sparkles },
  { value: "hair", label: "Hair", icon: Scissors },
  { value: "spa-massage", label: "Spa/Massage", icon: Heart },
  { value: "health-clinic", label: "Health Clinic", icon: Stethoscope },
  { value: "personal-trainer", label: "Personal Trainer", icon: Dumbbell },
  { value: "general-services", label: "General Services", icon: Wrench },
] as const;

export type BusinessTypeValue = (typeof businessTypes)[number]["value"];

type BusinessTypeStepProps = {
  selected: BusinessTypeValue | null;
  onSelect: (value: BusinessTypeValue) => void;
  onNext: () => void;
};

export function BusinessTypeStep({ selected, onSelect, onNext }: BusinessTypeStepProps) {
  const handleSelect = (value: string) => {
    const match = businessTypes.find((type) => type.value === value);
    if (match) {
      onSelect(match.value);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-white lg:text-3xl">
          What type of business do you run?
        </h1>
        <p className="text-base text-text-muted lg:text-lg">
          Select one option below to get started
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {businessTypes.map((businessType) => (
          <BusinessTypeCard
            key={businessType.value}
            icon={businessType.icon}
            label={businessType.label}
            value={businessType.value}
            selected={selected === businessType.value}
            onClick={handleSelect}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onNext}
          disabled={!selected}
          className="rounded-xl bg-accent-coral px-8 py-3 font-semibold text-bg-dark transition-colors duration-200 hover:bg-[#F09070] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          Next
        </button>
        <p className="text-xs font-medium tracking-wider text-text-light-muted uppercase" aria-live="polite">
          Step 1 of 3
        </p>
      </div>
    </div>
  );
}
