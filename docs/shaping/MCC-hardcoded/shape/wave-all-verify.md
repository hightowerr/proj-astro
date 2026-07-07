# Verification Report — MCC Hardcoded (Waves 1–2)

**Verifier:** Independent agent (did not implement)
**Date:** 2026-07-06
**Verdict:** ALL PASS

## Test Results

- `pnpm vitest run src/lib/mcc-mapping.test.ts` — **6/6 pass** (466ms)
- `pnpm exec tsc --noEmit` — **0 errors**
- Grep `7241` in `src/` — appears only in `mcc-mapping.ts` (mapping table) and `mcc-mapping.test.ts` (test assertion). **Not in route.ts.**

## Spec 01 — MCC Mapping Module

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Module exports `getMccForBusinessType` and `DEFAULT_MCC` | PASS | `mcc-mapping.ts:18` exports `DEFAULT_MCC = "7299"`, `:20` exports `getMccForBusinessType` |
| Every value in `businessTypes` has a corresponding MCC entry | PASS | Test "every businessType has a corresponding MCC entry" passes; `Record<BusinessTypeValue, string>` enforces exhaustiveness at compile time |
| `null` / `undefined` / unknown strings return `DEFAULT_MCC` | PASS | Three dedicated tests pass; code uses `if (!businessType) return DEFAULT_MCC` + `?? DEFAULT_MCC` |

## Spec 02 — Route Integration

| Criterion | Status | Evidence |
|-----------|--------|----------|
| New Express accounts created with correct MCC for `businessType` | PASS | `route.ts:51` calls `getMccForBusinessType(shop.businessType)` inside `stripe.accounts.create` |
| `hair` merchants still get `7241` (no regression) | PASS | `getMccForBusinessType("hair")` returns `"7241"` — confirmed by test assertion |
| Shop with `null` businessType gets `7299` (safe fallback) | PASS | `getMccForBusinessType(null)` returns `DEFAULT_MCC` (`"7299"`) — confirmed by test |
| No changes to existing shops' Stripe accounts | PASS | MCC is only set in `stripe.accounts.create` (line 41), gated by `if (!accountId)` (line 40). Shops with existing `stripeAccountId` skip this path entirely |

## Spec 03 — Schema Guard Test

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `pnpm vitest mcc-mapping` passes | PASS | 6/6 tests pass |
| Adding new `businessTypes` value without MCC entry causes test failure | PASS | Test iterates `businessTypes` array and asserts `value in MCC_BY_BUSINESS_TYPE` — missing entry fails with explicit message |
| All edge cases (null, undefined, unknown string) covered | PASS | Dedicated tests for all three: lines 34, 38, 42 |

## Notes

- **Spec 03 Option 2 adopted:** Implementation exports `MCC_BY_BUSINESS_TYPE` and uses `value in MCC_BY_BUSINESS_TYPE` for exhaustiveness (not `not.toBe(DEFAULT_MCC)`). This correctly handles the `general-services` edge case flagged in the spec.
- **Comment accuracy:** Spec 01 references `businessTypeSchema in actions.ts`; implementation references `businessTypes in business-type-step.tsx`. The implementation comment is more accurate — the test imports from `business-type-step`, not `actions.ts`.
