# Spec 03: FeeBreakdown Refunded Display

## Summary
When `refunded === true`, override the fee breakdown line items to show reversal amounts instead of original charges.

## Behaviour
- **Deposit line**: unchanged (still shows "Deposit: £X" — customer was charged)
- **Platform fee line**: render "Returned" in italic (same style as "Waived"), replacing the −£0.50 amount
- **Payout line**: render "£0.00" in bold (same weight as normal payout — not greyed out)
- When `refunded === false` or absent: no change to existing rendering
- "Stripe Connect" badge in card header: unchanged
- Payment status / Outcome / Resolved metadata rows: unchanged

## Display
```
Deposit          £10.00
Platform fee     Returned      ← italic, right-aligned in value column
Your payout      £0.00         ← bold, same weight as normal
```

## Scope
- Conditional rendering branch inside `FeeBreakdown` keyed on `refunded` prop
- Applies to `connect` FeeState (the primary case where fee breakdown shows amounts)

## Dependencies
- **Requires**: Spec 02 (FeeBreakdown accepts `refunded` prop)

## Out of scope
- Helper text below breakdown (see spec 04)
- Waived+refunded edge case (see spec 05)
- Legacy refund handling (see spec 06)
