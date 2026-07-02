# Spec 05: Waived + Refunded Edge Case

## Summary
Handle the intersection of `FeeState: waived` and `refunded: true`. When a waived-fee payment is refunded, the fee line should still show "Returned" (not "Waived" or "£0.00").

## Behaviour
- `FeeState: waived` + `refunded: false` → existing behaviour ("Platform fee: *Waived*")
- `FeeState: waived` + `refunded: true` → "Platform fee: *Returned*" (italic, same style as "Waived")
- Payout line follows the same refunded override: "Your payout: **£0.00**" (bold)
- Helper text swaps to undo icon + "Payout reversed to customer." (same as connect+refunded)
- The final rendering is visually identical to Connect + Refunded — the refund modifier flattens the waived/connect distinction
- Rationale: "Returned" is the truthful state — the money went back regardless of whether a fee was originally waived

## Scope
- Conditional in `FeeBreakdown` rendering: `refunded` takes precedence over `waived` for the fee label
- Small logic branch — refunded modifier wins over structural state for display text

## Dependencies
- **Requires**: Spec 02 (FeeBreakdown accepts `refunded` prop)

## Out of scope
- Waived+disputed (future — same modifier pattern applies)
