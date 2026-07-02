# Verification Report — Refund State (All Waves)

**Verifier**: Independent agent (did not implement)
**Date**: 2026-07-01
**Files reviewed**: `src/components/appointments/payment-card.tsx`, `src/components/appointments/payment-card.test.ts`
**Method**: Code review against acceptance criteria + unit test run. Playwright BLOCKED (empty database — no seed data).

## Summary

| Category | PASS | FAIL | BLOCKED | Total |
|----------|------|------|---------|-------|
| Wave 1 (specs 01, 02, 06) | 10 | 0 | 0 | 10 |
| Wave 2 (specs 03, 05, 07) | 12 | 0 | 0 | 12 |
| Wave 3 — code (spec 04) | 4 | 0 | 0 | 4 |
| Wave 3 — tests (specs 08, 09, 10) | 0 | 3 | 0 | 3 |
| Playwright visual (re-verified) | 5 | 0 | 0 | 5 |
| **Total** | **31** | **3** | **0** | **34** |

---

## Wave 1 — Foundations

### Spec 01: Derive Refunded Flag

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `financialOutcome === "refunded"` produces `true` | PASS | Line 139: `const refunded = financialOutcome === "refunded"` — strict equality returns `true` for `"refunded"` |
| 2 | All other values (including `undefined`) produce `false` | PASS | Strict equality returns `false` for any non-`"refunded"` string. Type is `string` (not optional); schema column is `notNull` with default `"unresolved"` — `undefined` cannot flow in |
| 3 | No changes to `determineFeeState()` | PASS | Function body (lines 18-33) is unchanged from prior implementation |

### Spec 02: FeeBreakdown Refunded Prop

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `FeeBreakdown` accepts `refunded` prop without type errors | PASS | Lines 39-47: `refunded?: boolean` in inline props type |
| 2 | Existing rendering unchanged when `refunded` absent or `false` | PASS | Default `refunded = false` (line 42); all conditionals fall through to existing branches when `false` |
| 3 | `determineFeeState()` not modified | PASS | Same as Spec 01 #3 |

### Spec 06: Legacy Refund Fallback

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Legacy+refunded shows only "Payment" header + "Outcome: Refunded" | PASS | Lines 193-198: `feeState === "legacy" && refunded` renders only `<div>Outcome / Refunded</div>`. Header "Payment" on line 143-145 always renders |
| 2 | No fee breakdown, no helper text, no metadata rows | PASS | `FeeBreakdown` gated by `connect \|\| waived` (line 147). Helper text same gate (line 165). Metadata gated by `legacy && !refunded` (line 233) — all excluded for legacy+refunded |
| 3 | No "Stripe Connect" badge | PASS | Badge inside the `connect \|\| waived` block (lines 149-163) — never renders for legacy |
| 4 | Legacy+not-refunded unchanged (regression) | PASS | Line 179: `feeState === "legacy" && !refunded` renders Amount row. Line 233: metadata includes `legacy && !refunded`. Both paths preserved |

---

## Wave 2 — Core Rendering + Wiring

### Spec 03: FeeBreakdown Refunded Display

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Connect+refunded: "Platform fee" shows "Returned" (italic, right-aligned) | PASS | Lines 64-65: `refunded ? <em>Returned</em>` — `<em>` renders italic. Parent `<span>` is in a `flex justify-between` layout (line 62), so right-aligned |
| 2 | Connect+refunded: "Your payout" shows "£0.00" (bold) | PASS | Line 50: `refunded ? formatGBP(0)` → `"£0.00"`. Line 74: `fontWeight: 800` on payout row |
| 3 | Connect+refunded: deposit line unchanged | PASS | Line 48: `const deposit = formatGBP(amountCents)` — no `refunded` conditional |
| 4 | Connect+not-refunded: original amounts shown (regression) | PASS | All ternaries fall through to existing branches when `refunded === false` |
| 5 | Metadata rows (payment status, outcome, resolved) unchanged | PASS | Metadata block (lines 231-248) is outside `FeeBreakdown`, condition includes `connect` and `waived` unconditionally |

### Spec 05: Waived + Refunded Edge Case

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Waived+refunded: "Platform fee" shows "Returned" (not "Waived") | PASS | Line 64: `refunded` checked before `waived` in ternary chain — "Returned" takes precedence |
| 2 | Waived+refunded: visually identical to connect+refunded | PASS | Same `<em>Returned</em>` and `formatGBP(0)` code paths. Same helper text (lines 170-175). Same metadata rendering |
| 3 | Waived+not-refunded: "Platform fee: Waived" unchanged (regression) | PASS | Line 66: `waived ? <em>Waived</em>` — reached when `refunded === false` |

### Spec 07: Thread Prop Through PaymentCard

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `FeeBreakdown` receives `refunded` prop derived from `financialOutcome` | PASS | Line 139: derivation. Line 164: `refunded={refunded}` passed to `<FeeBreakdown>` |
| 2 | `financialOutcome: "refunded"` → `FeeBreakdown` gets `refunded={true}` | PASS | `"refunded" === "refunded"` → `true` |
| 3 | `financialOutcome: "settled"` → `FeeBreakdown` gets `refunded={false}` | PASS | `"settled" === "refunded"` → `false` |
| 4 | `financialOutcome: undefined` → `FeeBreakdown` gets `refunded={false}` | PASS | Schema is `notNull` with default `"unresolved"`. `undefined` cannot flow in at DB level. Type is `string` (not optional) — TypeScript prevents `undefined` at compile time |

---

## Wave 3 — Polish + Tests

### Spec 04: Refunded Helper Text

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Refunded: `undo` icon shown (not `north_east`) | PASS | Line 170: `{refunded ? "undo" : "north_east"}` |
| 2 | Refunded: "Payout reversed to customer." text shown | PASS | Line 173: `"Payout reversed to customer."` |
| 3 | Not refunded: `north_east` icon + "Payout routed to your connected bank account." | PASS | Lines 170, 174: else branches |
| 4 | Helper text style (muted/secondary) unchanged | PASS | Line 167: `text-xs` + `color: var(--al-on-surface-variant)` — same as before |

### Spec 08: Unit Tests — Refunded Display

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| ALL | 8 rendering test cases (connect+refunded display, icon, helper text, regression, metadata) | **FAIL** | Test file is `.test.ts` (not `.test.tsx`). Contains 11 logic-only tests (7 `determineFeeState` + 4 refunded derivation). Zero rendering tests. Comment at lines 62-78 acknowledges gap: `@testing-library/react` + `jsdom` not installed. All 8 cases unimplemented. |

### Spec 09: Unit Tests — Edge Cases

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| ALL | 8 edge-case rendering test cases (waived+refunded, legacy+refunded, skipped+refunded, policy+refunded) | **FAIL** | Same root cause as Spec 08 — zero rendering tests. Additionally, test cases 7-8 (skipped+refunded, policy+refunded) describe domain-impossible states: `determineFeeState` returns "skipped"/"policy" only when `amountCents` is null (no payment), so `financialOutcome === "refunded"` cannot co-occur. The code doesn't handle these states and the spec likely shouldn't test them. |

### Spec 10: Integration Test — PaymentCard Refund Flow

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| ALL | 5 integration test cases (full PaymentCard render with financialOutcome variations) | **FAIL** | Same root cause as Spec 08 — zero rendering tests. Test case 5 (`financialOutcome: undefined`) also describes an impossible state: the prop type is `string` (not optional) and the schema column is `notNull`. |

---

## Playwright Visual Verification

Seed script `pnpm seed:payments` created 8 scenarios. Re-verified 2026-07-01 via Playwright.

| # | Variant | Status | Evidence |
|---|---------|--------|----------|
| 1 | Connect + refunded | **PASS** | Stripe Connect badge, Deposit £10.00, Platform fee *Returned* (italic), Your payout £0.00, undo icon, "Payout reversed to customer.", metadata rows present. Screenshot confirmed. |
| 2 | Waived + refunded | **PASS** | Identical to connect+refunded — Deposit £0.50, "Returned" (not "Waived"), £0.00 payout, undo icon. Modifier flattens distinction as designed. |
| 3 | Legacy + refunded | **PASS** | Card collapsed to "Payment" header + "Outcome: Refunded" only. No fee breakdown, no helper text, no Stripe Connect badge, no metadata rows. |
| 4 | Non-refunded regression (connect) | **PASS** | Original amounts (£10.00, -£0.50, £9.50), north_east icon, "Payout routed to your connected bank account.", Outcome: Settled. |
| 5 | Non-refunded regression (legacy) | **PASS** | Amount £10.00, no fee breakdown, metadata rows present, Outcome: Settled. |

---

## Findings

### FAIL-1: Rendering tests not implemented (Specs 08, 09, 10)

**Root cause**: `@testing-library/react` and `jsdom` are not project dependencies. The implementer honestly documented this in the test file (lines 62-78) and deferred rendering verification to Playwright.

**Impact**: 21 of 21 rendering test cases across 3 specs are unimplemented. The logic tests (11 total) are valuable but don't cover the visual rendering behavior that the specs require.

**Fix options**:
1. Install `@testing-library/react` + `jsdom` + `@testing-library/jest-dom` and implement the rendering tests as specified
2. Accept the implementer's tradeoff and cover rendering via Playwright E2E tests (requires test data seeding)
3. Reclassify specs 08-10 as E2E test specs and update the wave plan

### FAIL-2: Spec 09 test cases 7-8 describe impossible states

**Root cause**: `skipped` and `policy` fee states only occur when `amountCents` is null (no payment collected). A refund (`financialOutcome === "refunded"`) requires a payment. These states cannot co-occur in production.

**Impact**: Low — these test cases should not exist in the spec.

**Fix**: Remove test cases 7-8 from spec 09 or reclassify as "impossible state — no test needed."

### ~~BLOCKED~~: Playwright verification — RESOLVED

Seed script created (`scripts/seed-payment-scenarios.ts`, `pnpm seed:payments`). All 5 visual checks now PASS.

---

## Unit Test Results

```
payment-card.test.ts: 11 passed (2ms)
- determineFeeState: 7 passed
- refunded derivation: 4 passed
```

`pnpm check` has pre-existing lint errors (unrelated to this feature — `connect-confirmation-banner.tsx` setState-in-effect, import ordering in `appointments.ts` and `stripe-refund.ts`).

---

## Verdict

**Code implementation: PASS** — All 26 behavioral acceptance criteria verified by code review. The rendering logic, prop threading, legacy fallback, helper text, and edge case handling all match the specs and design brief.

**Visual verification: PASS** — All 5 Playwright checks pass after seeding with `pnpm seed:payments`. All 3 refund variants and 2 regression cases confirmed via screenshots.

**Test coverage: FAIL** — 0 of 21 rendering test cases implemented (specs 08, 09, 10). Requires either adding `@testing-library/react` or converting to E2E tests. Visual verification via Playwright provides equivalent coverage for this feature.
