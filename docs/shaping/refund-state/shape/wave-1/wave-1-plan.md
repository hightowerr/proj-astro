# Wave 1 — Foundations

3 slices, sequential (single file). No dependencies.

## Slice 1a: Derive Refunded Flag (Spec 01)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- Add derivation: `const refunded = financialOutcome === "refunded"` inside `PaymentCard` render body
- Or extract as a helper if cleaner: `function isRefunded(outcome?: string): boolean`

**Acceptance criteria**:
- [ ] `financialOutcome === "refunded"` produces `true`
- [ ] All other values (including `undefined`) produce `false`
- [ ] No changes to `determineFeeState()`

---

## Slice 1b: FeeBreakdown Refunded Prop (Spec 02)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- Add `refunded?: boolean` to `FeeBreakdownProps` type (or inline props)
- Default to `false` when absent
- No rendering changes

**Acceptance criteria**:
- [ ] `FeeBreakdown` accepts `refunded` prop without type errors
- [ ] Existing rendering unchanged when `refunded` is absent or `false`
- [ ] `determineFeeState()` not modified

---

## Slice 1c: Legacy Refund Fallback (Spec 06)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- In `PaymentCard`, where `FeeBreakdown` is conditionally rendered based on `FeeState`:
  - When `FeeState === "legacy"` AND `refunded === true`:
    - Hide `FeeBreakdown` component
    - Hide helper text row
    - Hide payment status / outcome / resolved metadata rows
    - Show only "Payment" header + single row: "Outcome: Refunded"
    - No "Stripe Connect" badge

**Acceptance criteria**:
- [ ] Legacy+refunded shows only "Payment" header + "Outcome: Refunded"
- [ ] No fee breakdown, no helper text, no metadata rows
- [ ] No "Stripe Connect" badge
- [ ] Legacy+not-refunded unchanged (regression)

---

## Post-wave checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes (or equivalent)
- [ ] Update `docs/context/progress-tracker.md`
