# Wave 2 — Core Rendering + Wiring

3 slices, sequential (single file). Depends on Wave 1.

## Slice 2a: FeeBreakdown Refunded Display (Spec 03)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- In `FeeBreakdown`, when `refunded === true`:
  - Deposit line: unchanged
  - Platform fee line: render "Returned" in italic (same style as "Waived"), replacing the amount
  - Payout line: render "£0.00" in bold (same weight as normal payout)
- When `refunded === false` or absent: no change

**Acceptance criteria**:
- [ ] Connect+refunded: "Platform fee" shows "Returned" (italic, right-aligned)
- [ ] Connect+refunded: "Your payout" shows "£0.00" (bold)
- [ ] Connect+refunded: deposit line unchanged
- [ ] Connect+not-refunded: original amounts shown (regression)
- [ ] Metadata rows (payment status, outcome, resolved) unchanged

---

## Slice 2b: Waived + Refunded Edge Case (Spec 05)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- In `FeeBreakdown`, when `refunded === true` AND fee state is `waived`:
  - Fee label: "Returned" (italic) — NOT "Waived"
  - Payout: "£0.00" (bold)
  - `refunded` modifier takes precedence over `waived` for the fee label
- Result is visually identical to connect+refunded

**Acceptance criteria**:
- [ ] Waived+refunded: "Platform fee" shows "Returned" (not "Waived")
- [ ] Waived+refunded: visually identical to connect+refunded
- [ ] Waived+not-refunded: "Platform fee: Waived" unchanged (regression)

---

## Slice 2c: Thread Prop Through PaymentCard (Spec 07)

**File**: `src/components/appointments/payment-card.tsx`

**Work**:
- In `PaymentCard` render, derive `refunded` from `financialOutcome` (Slice 1a)
- Pass `refunded={refunded}` to `<FeeBreakdown>` call
- No new props on `PaymentCard` itself

**Acceptance criteria**:
- [ ] `FeeBreakdown` receives `refunded` prop derived from `financialOutcome`
- [ ] `financialOutcome: "refunded"` → `FeeBreakdown` gets `refunded={true}`
- [ ] `financialOutcome: "settled"` → `FeeBreakdown` gets `refunded={false}`
- [ ] `financialOutcome: undefined` → `FeeBreakdown` gets `refunded={false}`

---

## Post-wave checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] Update `docs/context/progress-tracker.md`
