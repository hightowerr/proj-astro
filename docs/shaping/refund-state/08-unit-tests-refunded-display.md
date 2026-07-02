# Spec 08: Unit Tests — Refunded Display

## Summary
Unit tests for the core refunded rendering in `FeeBreakdown`.

## Test cases
1. `FeeState: connect` + `refunded: false` → renders original amounts (regression guard)
2. `FeeState: connect` + `refunded: true` → "Platform fee: Returned" (italic), "Your payout: £0.00" (bold)
3. `FeeState: connect` + `refunded: true` → deposit line unchanged (still shows original deposit)
4. `refunded: true` → Material `undo` icon present (not `north_east`)
5. `refunded: true` → helper text "Payout reversed to customer." is present
6. `refunded: false` → Material `north_east` icon + "Payout routed to your connected bank account." (existing)
7. `refunded` prop omitted → same as `false` (default behaviour)
8. `refunded: true` → payment status / outcome / resolved metadata rows still rendered

## Dependencies
- **Requires**: Spec 03 (refunded display logic to test)
- **Requires**: Spec 04 (helper text to test)

## Out of scope
- Edge case tests (see spec 09)
- Integration-level tests (see spec 10)
