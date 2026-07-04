# Spec 05: Transfer Held Helper Text

**Priority**: P2 (HIGH) — UI

## Summary
Show contextual helper text below the fee breakdown when a payment's transfer is held. Copy: "Payment received but transfer paused — Stripe is reviewing your account."

## Behaviour
- When `transferHeld === true`:
  - Icon: `pause_circle` (Material Symbols) — warning/amber colour
  - Text: "Payment received but transfer paused — Stripe is reviewing your account."
  - Replaces the normal helper text (e.g., "Payout sent to your Stripe account") — not appended
- When `transferHeld === false`: no change
- When `transferHeld === true` AND `refunded === true`: show refund helper text (refund takes precedence)

## Scope
- **File**: `src/components/appointments/payment-card.tsx` — helper text row within `FeeBreakdown`
- Same swap pattern as refund helper text (spec 04 from refund-state)

## Dependencies
- **Requires**: Spec 04 (transferHeld prop threaded to FeeBreakdown)

## Design
Prototype: `Appointment Fee Breakdown.html` → "Held" tab

| Element | Value | Style |
|---------|-------|-------|
| Icon | `pause_circle` | Amber colour |
| Text | "Payment received but transfer paused — Stripe is reviewing your account." | Muted/secondary, same as existing helper row |

Copy confirmed in prototype — no further sign-off needed.

## Out of scope
- Customer-facing messaging (customer sees normal "paid" state)
