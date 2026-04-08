"use client";

import {
  Dumbbell,
  Heart,
  Scissors,
  Sparkles,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-10">
      <div className="text-center space-y-3">
        <h1 className="font-manrope text-3xl font-extrabold text-primary tracking-tight lg:text-4xl">
          What type of business do you run?
        </h1>
        <p className="font-manrope text-lg text-muted-foreground font-medium">
          Select your specialty to personalize your hub
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-8">
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

      <div className="flex flex-col items-center gap-6 pt-4">
        <Button
          onClick={onNext}
          disabled={!selected}
          variant="al-primary"
          className="h-auto rounded-[var(--al-radius-xl)] px-12 py-7 font-manrope text-lg font-bold shadow-[var(--al-shadow-float)] transition-all active:scale-95 disabled:opacity-30"
          type="button"
        >
          Continue
        </Button>
        <p className="font-manrope text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase" aria-live="polite">
          Step 1 of 3
        </p>
      </div>
    </div>
  );
}
