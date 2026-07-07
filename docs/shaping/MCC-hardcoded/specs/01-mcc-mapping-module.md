# 01 — MCC Mapping Module

## Summary
Lookup table and helper function that derive the correct Stripe Merchant Category Code from a shop's `businessType` field.

## Prerequisites
- Depends on: none

## Changes

**New file:** `src/lib/mcc-mapping.ts`

### Implementation

```ts
import type { BusinessTypeValue } from "@/components/onboarding/business-type-step";

/**
 * Stripe Merchant Category Codes per business vertical.
 * Source: ISO 18245 / Stripe MCC reference.
 * Keep in sync with businessTypeSchema in actions.ts.
 */
const MCC_BY_BUSINESS_TYPE: Record<BusinessTypeValue, string> = {
  beauty: "7230",            // Beauty Shops
  hair: "7241",              // Barber and Beauty Shops
  "spa-massage": "7297",     // Massage Parlors
  "health-clinic": "8099",   // Health Practitioners (not elsewhere classified)
  "personal-trainer": "7941", // Commercial Sports, Athletic Fields
  "general-services": "7299", // Miscellaneous Recreation Services
};

export const DEFAULT_MCC = "7299";

export function getMccForBusinessType(
  businessType: string | null | undefined
): string {
  if (!businessType) return DEFAULT_MCC;
  return MCC_BY_BUSINESS_TYPE[businessType as BusinessTypeValue] ?? DEFAULT_MCC;
}
```

### Design decisions

- **Import the `BusinessTypeValue` type** — provides compile-time exhaustiveness. If a new value is added to `businessTypes` in `business-type-step.tsx` but not to `MCC_BY_BUSINESS_TYPE`, TypeScript errors.
- **`DEFAULT_MCC = "7299"`** — "Miscellaneous Recreation Services" is the safest catch-all for unknown verticals. Exported for test assertions.
- **Accepts `string | null | undefined`** — `shop.businessType` is `text` (nullable) in the schema. Pre-migration shops have `null`.

## Acceptance
- Module exports `getMccForBusinessType` and `DEFAULT_MCC`
- Every value in the `businessTypes` array has a corresponding MCC entry
- `null` / `undefined` / unknown strings return `DEFAULT_MCC`
