import {
  Dumbbell,
  Heart,
  Scissors,
  Sparkles,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type BusinessTypeInfo = {
  label: string;
  icon: LucideIcon;
};

const FALLBACK_BUSINESS_TYPE: BusinessTypeInfo = {
  label: "Business",
  icon: Wrench,
};

export const businessTypes: Record<string, BusinessTypeInfo> = {
  beauty: { label: "Beauty Salon", icon: Sparkles },
  hair: { label: "Hair Salon", icon: Scissors },
  "spa-massage": { label: "Spa & Massage Studio", icon: Heart },
  "health-clinic": { label: "Health Clinic", icon: Stethoscope },
  "personal-trainer": { label: "Personal Training Studio", icon: Dumbbell },
  "general-services": { label: "Service Business", icon: Wrench },
};

export function getBusinessTypeInfo(type: string | null | undefined): BusinessTypeInfo {
  if (!type) {
    return FALLBACK_BUSINESS_TYPE;
  }

  return businessTypes[type] ?? FALLBACK_BUSINESS_TYPE;
}
