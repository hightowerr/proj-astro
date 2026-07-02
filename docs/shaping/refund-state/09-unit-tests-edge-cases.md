# Spec 09: Unit Tests — Edge Cases

## Summary
Unit tests for the waived+refunded and legacy+refunded edge cases.

## Test cases
1. `FeeState: waived` + `refunded: true` → "Platform fee: Returned" italic (not "Waived")
2. `FeeState: waived` + `refunded: true` → visually identical to connect+refunded (same icon, helper text, payout)
3. `FeeState: waived` + `refunded: false` → "Platform fee: Waived" (regression guard)
4. `FeeState: legacy` + `refunded: true` → no FeeBreakdown, no helper text, no metadata rows — only "Outcome: Refunded"
5. `FeeState: legacy` + `refunded: true` → no "Stripe Connect" badge in header
6. `FeeState: legacy` + `refunded: false` → existing legacy behaviour (regression guard)
~~7. `FeeState: skipped` + `refunded: true` → refunded display applies~~ REMOVED: impossible state — skipped only occurs when no payment exists, so refund cannot co-occur
~~8. `FeeState: policy` + `refunded: true` → refunded display applies~~ REMOVED: impossible state — policy only occurs when no payment exists

## Dependencies
- **Requires**: Spec 05 (waived+refunded logic to test)
- **Requires**: Spec 06 (legacy refund fallback to test)

## Out of scope
- Integration tests (see spec 10)
