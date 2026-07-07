# Slice 2-1: Route Integration

## Spec: 02-route-integration

## What to build
Replace hardcoded `mcc: "7241"` in `create-account/route.ts:50` with `mcc: getMccForBusinessType(shop.businessType)`.

## Files to modify
- `src/app/api/settings/stripe-connect/create-account/route.ts` (1 import + 1 line change)

## Changes
1. Add import: `import { getMccForBusinessType } from "@/lib/mcc-mapping";`
2. Replace line 50: `mcc: "7241"` → `mcc: getMccForBusinessType(shop.businessType)`

## Acceptance criteria
1. No hardcoded `"7241"` remains in the file
2. `getMccForBusinessType` is imported from `@/lib/mcc-mapping`
3. `shop.businessType` is passed as the argument
4. TypeScript compiles with zero errors
5. Existing shops with `stripeAccountId` are unaffected (line 39 guard)

## Dependencies
- Spec 01 (mcc-mapping module must exist)
