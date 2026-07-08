# Verification Report — No Minimum Deposit Floor (All Specs)

**Date:** 2026-07-07
**Verifier:** fresh session, read-only
**Files inspected:** `src/lib/tier-pricing.ts`, `src/lib/queries/appointments.ts`, `src/lib/__tests__/tier-pricing.test.ts`
**`pnpm vitest run` result:** 22 / 22 PASS
**`pnpm check` result:** PASS (zero lint or type errors)

---

## Results

| Spec | Criterion | Status | Evidence |
|------|-----------|--------|----------|
| 01 | `PLATFORM_MINIMUM_DEPOSIT_CENTS` is exported and equals `100` | PASS | `tier-pricing.ts:28` — `export const PLATFORM_MINIMUM_DEPOSIT_CENTS = 100;` |
| 01 | `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 50 })` → `{ paymentRequired: true, amountCents: 100 }` | PASS | `tier-pricing.ts:73-81` — `amountCents = 50`, not `<= 0`, then `50 < 100` triggers clamp to 100; confirmed by test line 150-154 |
| 01 | `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 0 })` → `{ paymentRequired: false, amountCents: 0 }` | PASS | `tier-pricing.ts:74-76` — `0 <= 0` early return before clamp; confirmed by test line 168-172 |
| 01 | `derivePaymentRequirement({ paymentMode: "none", depositAmountCents: 50 })` → `{ paymentRequired: false, amountCents: 0 }` | PASS | `tier-pricing.ts:69-71` — `paymentMode === "none"` early return; confirmed by test line 186-190 |
| 01 | `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 100 })` → `{ paymentRequired: true, amountCents: 100 }` (at-floor, no clamp) | PASS | `tier-pricing.ts:79` — `100 < 100` is false, no clamp fires; confirmed by test line 174-178 |
| 01 | `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 500 })` → `{ paymentRequired: true, amountCents: 500 }` (above-floor, no clamp) | PASS | `tier-pricing.ts:79` — `500 < 100` is false, no clamp fires; confirmed by test line 180-184 |
| 01 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 02 | `clampedDepositCents` used in `derivePaymentRequirement()` call | PASS | `appointments.ts:876` — `depositAmountCents: clampedDepositCents` passed to `derivePaymentRequirement()` |
| 02 | `clampedDepositCents` used in `policyVersions` insert | PASS | `appointments.ts:888` — `depositAmountCents: clampedDepositCents` in `policyVersions` insert |
| 02 | 50p tier-override stores `depositAmountCents: 100` in `policyVersions`, not 50 | PASS | `appointments.ts:867-872` — `finalDepositCents = 50`, guard `50 > 0 && 50 < 100` true → `clampedDepositCents = 100`; stored at line 888 |
| 02 | Waived deposit (`topDepositWaived = true`) stores `depositAmountCents: 0` | PASS | `appointments.ts:867-872` — `finalDepositCents = 0`, guard `0 > 0` is false → `clampedDepositCents = 0`; zero passes through untouched |
| 02 | £5 deposit stores `depositAmountCents: 500` (floor not triggered) | PASS | `appointments.ts:867-872` — `finalDepositCents = 500`, guard `500 < 100` is false → `clampedDepositCents = 500` |
| 03 | All 9 floor tests pass | PASS | `pnpm vitest run` — 22 tests total (13 pre-existing `applyTierPricingOverride` + `derivePaymentRequirement` + 9 new floor tests), all green |
| 03 | Constant assertion test catches accidental changes | PASS | `tier-pricing.test.ts:143-147` — `expect(PLATFORM_MINIMUM_DEPOSIT_CENTS).toBe(100)` |
| 04 | Tripwire comment exists above `PLATFORM_MINIMUM_DEPOSIT_CENTS` | PASS | `tier-pricing.ts:22-27` — JSDoc with "TRIPWIRE: When multi-currency ships … JPY has no subunit … Also review if the platform fee changes from flat 50p to percentage-based" |
| 04 | Architecture context update documented in build order | PASS | `_build-order.md:70-88` — "Architecture Context Updates Needed" section has full invariant text and booking flow update, marked "Do not apply yet — queued for loop contract" |

---

## Critical Invariants

| Invariant | Status | Evidence |
|-----------|--------|----------|
| `PLATFORM_MINIMUM_DEPOSIT_CENTS` exported from `tier-pricing.ts`, equals 100 | PASS | `tier-pricing.ts:28` |
| `derivePaymentRequirement()` clamps positive sub-floor amounts to 100 | PASS | `tier-pricing.ts:79-81` |
| `derivePaymentRequirement()` does NOT clamp zero (waived path) | PASS | `tier-pricing.ts:74-76` — `<= 0` early return before clamp; zero returns `{ paymentRequired: false, amountCents: 0 }` |
| `derivePaymentRequirement()` does NOT clamp null | PASS | `tier-pricing.ts:73` — `null ?? 0 = 0`, `0 <= 0` early return |
| `derivePaymentRequirement()` does NOT clamp negative amounts | PASS | `tier-pricing.ts:74-76` — negative `<= 0` → early return |
| `derivePaymentRequirement()` does NOT clamp when `paymentMode=none` | PASS | `tier-pricing.ts:69-71` — first guard exits before any amount processing |
| `clampedDepositCents` used in BOTH `derivePaymentRequirement()` AND `policyVersions` insert | PASS | `appointments.ts:876` and `appointments.ts:888` |
| Tripwire JSDoc mentions multi-currency AND fee model | PASS | `tier-pricing.ts:24-26` — both mentioned explicitly |
| Floor guard is `> 0 && < 100` (zero safe) | PASS | `appointments.ts:868-871` — explicit `> 0 &&` guard; `tier-pricing.ts` achieves same via `<= 0` early return before the clamp line |
| `PLATFORM_MINIMUM_DEPOSIT_CENTS` imported in `appointments.ts` | PASS | `appointments.ts:51` — `PLATFORM_MINIMUM_DEPOSIT_CENTS` in import from `@/lib/tier-pricing` |

---

## Summary

**16 / 16 criteria PASS. 0 FAIL. 0 BLOCKED.**

No fix issues created.

---

## Note

Spec 03 specified the test file as `src/lib/tier-pricing.test.ts`. The actual file is at `src/lib/__tests__/tier-pricing.test.ts` — the project's standard test directory location (consistent with `slot-recovery.test.ts`, `stripe-refund.test.ts`, etc. in the same directory). This is an EVOLUTION, not a shortcut. All 9 tests run and pass from their actual location.
