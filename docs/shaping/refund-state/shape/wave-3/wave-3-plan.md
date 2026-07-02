# Wave 3 — Polish + Tests

4 slices. 3a first (code change), then 3b-3d (tests, parallelizable). Depends on Wave 2.

## Slice 3a: Refunded Helper Text (Spec 04)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- When `refunded === true`: swap the existing helper text row:
  - Icon: `north_east` → `undo` (Material Icons)
  - Text: "Payout routed to your connected bank account." → "Payout reversed to customer."
- This is a replacement, not an addition — the refunded helper replaces the normal helper
- When `refunded === false` or absent: existing helper text unchanged

**Acceptance criteria**:
- [ ] Refunded: `undo` icon shown (not `north_east`)
- [ ] Refunded: "Payout reversed to customer." text shown
- [ ] Not refunded: `north_east` icon + "Payout routed to your connected bank account." (existing)
- [ ] Helper text style (muted/secondary) unchanged

---

## Slice 3b: Unit Tests — Refunded Display (Spec 08)

**File**: `src/components/appointments/payment-card.test.tsx` (new)

**Test cases** (8):
1. Connect + `refunded: false` → renders original amounts (regression)
2. Connect + `refunded: true` → "Platform fee: Returned" (italic), "Your payout: £0.00" (bold)
3. Connect + `refunded: true` → deposit line unchanged
4. `refunded: true` → Material `undo` icon present (not `north_east`)
5. `refunded: true` → helper text "Payout reversed to customer."
6. `refunded: false` → `north_east` icon + "Payout routed to your connected bank account."
7. `refunded` prop omitted → same as `false`
8. `refunded: true` → payment status / outcome / resolved metadata rows still rendered

---

## Slice 3c: Unit Tests — Edge Cases (Spec 09)

**File**: `src/components/appointments/payment-card.test.tsx`

**Test cases** (8):
1. Waived + `refunded: true` → "Platform fee: Returned" italic (not "Waived")
2. Waived + `refunded: true` → visually identical to connect+refunded
3. Waived + `refunded: false` → "Platform fee: Waived" (regression)
4. Legacy + `refunded: true` → no FeeBreakdown, no helper text, no metadata — only "Outcome: Refunded"
5. Legacy + `refunded: true` → no "Stripe Connect" badge
6. Legacy + `refunded: false` → existing legacy behaviour (regression)
7. Skipped + `refunded: true` → refunded display applies
8. Policy + `refunded: true` → refunded display applies

---

## Slice 3d: Integration Test — PaymentCard Refund Flow (Spec 10)

**File**: `src/components/appointments/payment-card.test.tsx`

**Test cases** (5):
1. `PaymentCard` + `financialOutcome: "refunded"` + connect → full refunded display
2. `PaymentCard` + `financialOutcome: "refunded"` + waived → identical to connect+refunded
3. `PaymentCard` + `financialOutcome: "refunded"` + legacy → collapsed card
4. `PaymentCard` + `financialOutcome: "completed"` → original display (regression)
5. `PaymentCard` + `financialOutcome: undefined` → original display

---

## Post-wave checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] All tests pass (`pnpm test` or equivalent)
- [ ] Update `docs/context/progress-tracker.md`
