# Spec 04: Refunded Helper Text

## Summary
Add contextual helper text below the fee breakdown when a payment has been refunded.

## Behaviour
- When `refunded === true`: display Material `undo` icon + "Payout reversed to customer." as helper/muted text below the fee breakdown
- When `refunded === false` or absent: existing helper shown (Material `north_east` icon + "Payout routed to your connected bank account.")
- The refunded helper *replaces* the normal helper — not appended alongside it
- Text style: secondary/muted, same as the existing `north_east` helper text

## Scope
- Swap icon from `north_east` → `undo` (Material Icons) when refunded
- Swap text from "Payout routed to your connected bank account." → "Payout reversed to customer."
- Placement: same position as existing helper text row inside `FeeBreakdown`

## Dependencies
- **Requires**: Spec 03 (refunded display logic exists to pair with)

## Out of scope
- Stripe refund details or timestamps
- Link to refund record
