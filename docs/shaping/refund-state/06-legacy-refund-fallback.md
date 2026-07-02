# Spec 06: Legacy Refund Fallback

## Summary
For payments with `FeeState: legacy`, skip the `FeeBreakdown` component entirely when refunded. Show a text-only outcome instead.

## Behaviour
- `FeeState: legacy` + `refunded: true` → entire payment card collapses to:
  - "Payment" header (no "Stripe Connect" badge)
  - Single row: "Outcome" label + "Refunded" value (bold, right-aligned)
  - No deposit/fee/payout lines
  - No helper text or icon
  - No payment status / outcome / resolved metadata rows
- `FeeState: legacy` + `refunded: false` → existing behaviour (no `FeeBreakdown` shown, or minimal display)
- Card is significantly shorter than connect/waived variants
- Rationale: legacy payments lack the structured fee data needed for a meaningful breakdown; a text-only fallback is more honest than displaying zeroes

## Scope
- Conditional in `PaymentCard` (or wherever FeeBreakdown rendering is gated by FeeState)
- Hide all child sections (fee breakdown, helper text, metadata rows)
- Render single "Outcome: Refunded" row

## Dependencies
- **Prerequisites**: None — this is a separate code path from the `FeeBreakdown` component changes. It gates at the `PaymentCard` level before `FeeBreakdown` is rendered.

## Out of scope
- Retroactive fee reconstruction for legacy payments
