# Spec 04: Transfer Held Card State

**Priority**: P2 (HIGH) — UI

## Summary
Display a `transferHeld` modifier on the payment card when a payment succeeded but the transfer to the connected account is paused. Follows the orthogonal modifier pattern established by the refund state (spec R5 from refund-state) — do NOT add a 6th `FeeState`.

## Behaviour
- When `transferHeld === true` AND `paymentStatus === "paid"`:
  - Fee breakdown payout line: show "Held" in amber/warning style instead of the calculated payout amount
  - Card does NOT show an error state — the payment succeeded from the customer's perspective
- When `transferHeld === false` or absent: no change to existing rendering
- Combinatorial: `transferHeld` can coexist with any `FeeState` (connect, waived, etc.)
- If `transferHeld === true` AND `refunded === true`: refunded takes precedence (the hold is moot if already refunded)

## Scope
- **File**: `src/components/appointments/payment-card.tsx` — thread `transferHeld` prop through `PaymentCard` → `FeeBreakdown`
- New prop: `transferHeld?: boolean` on `PaymentCardProps` and `FeeBreakdownProps`
- Derived from appointment data, same pattern as `refunded` derivation

## Dependencies
- **Requires**: Spec 02 (transferHeld column exists to source the prop)

## Design
Prototype: `Appointment Fee Breakdown.html` → "Held" tab

| Element | Value | Style |
|---------|-------|-------|
| Deposit | £10.00 | Unchanged |
| Platform fee | −£0.50 | Unchanged |
| Your payout | "Held" | Amber/warning colour, replaces amount, right-aligned |
| Payment status | "Succeeded" (green badge) | Unchanged |
| Outcome | "Settled" | Unchanged |
| Stripe Connect badge | Visible | Unchanged |

## Out of scope
- Helper text for transfer held (see spec 05)
- Dashboard-level action items (see spec 06)
