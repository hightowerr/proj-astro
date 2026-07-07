# MCC Hardcoded — Shape

## Problem

Express account creation (`create-account/route.ts:50`) hardcodes `business_profile.mcc: "7241"` for all merchants. The onboarding flow collects `shop.businessType` (6 verticals) but ignores it at the Stripe layer. Every merchant gets classified as a barbershop regardless of their actual business.

## Requirements

| # | Requirement | Source |
|---|-------------|--------|
| R0 | Derive MCC from `shop.businessType` via a lookup table | current-issues.md |
| R1 | No new DB columns — data already exists in `shops.businessType` | current-issues.md |
| R2 | Build-time guard: every `businessTypeSchema` value must have a corresponding MCC entry | current-issues.md |
| R3 | Safe fallback for null/unknown `businessType` values | schema analysis (field is nullable `text`) |
| R4 | Audit existing shops for MCC discrepancies post-deploy | current-issues.md |
| R5 | Existing shops unaffected — MCC is set-once at account creation | Stripe API semantics |

## Shape A (only shape — no alternatives warranted)

**Lookup table module + route integration + schema guard test.**

Single new file (`src/lib/mcc-mapping.ts`) with:
- `MCC_BY_BUSINESS_TYPE` record typed against `BusinessTypeValue` for compile-time exhaustiveness
- `getMccForBusinessType()` function accepting `string | null | undefined`
- `DEFAULT_MCC = "7299"` (Miscellaneous Recreation Services)

Route change: replace `mcc: "7241"` with `mcc: getMccForBusinessType(shop.businessType)`.

Test: iterate `businessTypes` array, assert each has an explicit MCC entry.

### Why no alternative shapes

This is a 1-to-1 data routing fix. The data exists (`shop.businessType`), the consumption point exists (`business_profile.mcc`), and the mapping is static (ISO 18245 codes). No design decisions, no UI, no new infrastructure. A lookup table is the canonical solution.

## Fit Check

| R | Shape A |
|---|---------|
| R0 | YES — `getMccForBusinessType()` derives MCC from businessType |
| R1 | YES — no schema changes |
| R2 | YES — test iterates `businessTypes` array |
| R3 | YES — null/undefined/unknown return `DEFAULT_MCC` |
| R4 | YES — spec 04 is a one-time audit script |
| R5 | YES — only fires inside `if (!accountId)` guard |

## Spikes

### Spike: getShopByOwnerId returns businessType
- **Question**: Does the query in `create-account/route.ts` return `shop.businessType`?
- **Finding**: YES. `getShopByOwnerId()` uses `db.query.shops.findFirst()` with no column selection — Drizzle returns all columns by default.
- **Impact**: No query changes needed.

### Spike: BusinessTypeValue import in lib/
- **Question**: Can a `src/lib/` file import a type from a `"use client"` component?
- **Finding**: YES. Using `import type { BusinessTypeValue }` — TypeScript strips type imports at compile time. No runtime dependency on the client component.
- **Impact**: None — spec's approach is correct.

### Spike: Vitest path aliases
- **Question**: Do tests support `@/components/` imports?
- **Finding**: YES. `vitest.config.mts` aliases `@` → `./src`. Existing tests (e.g., `payment-card.test.ts`) use this pattern.
- **Impact**: None — spec's test imports work.

## Signals applied

- **spike-before-shape**: 3 confirmation spikes run against codebase before finalizing shape.
- **extract-for-testability**: `getMccForBusinessType()` is a pure function — zero mocks needed in tests.

## Decision

Shape A. Single shape, all requirements met, all spikes confirmed, zero unknowns.
