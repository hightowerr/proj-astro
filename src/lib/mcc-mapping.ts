import type { BusinessTypeValue } from "@/components/onboarding/business-type-step";

/**
 * Stripe Merchant Category Codes per business vertical.
 * Source: ISO 18245 / Stripe MCC reference.
 * Keep in sync with businessTypes in business-type-step.tsx.
 * Enforced by build-time test in mcc-mapping.test.ts.
 */
export const MCC_BY_BUSINESS_TYPE: Record<BusinessTypeValue, string> = {
  beauty: "7230",
  hair: "7241",
  "spa-massage": "7297",
  "health-clinic": "8099",
  "personal-trainer": "7941",
  "general-services": "7299",
};

export const DEFAULT_MCC = "7299";

export function getMccForBusinessType(
  businessType: string | null | undefined
): string {
  if (!businessType) return DEFAULT_MCC;
  if (!Object.hasOwn(MCC_BY_BUSINESS_TYPE, businessType)) return DEFAULT_MCC;
  return MCC_BY_BUSINESS_TYPE[businessType as BusinessTypeValue];
}
