# Spec 10: Integration Test — PaymentCard Refund Flow

## Summary
End-to-end rendering test: `PaymentCard` receives `financialOutcome: "refunded"` and the full fee breakdown renders correctly with reversal amounts and helper text.

## Test cases
1. `PaymentCard` with `financialOutcome: "refunded"` + connect fees → full refunded display: deposit unchanged, "Returned" italic, "£0.00" bold, `undo` icon, "Payout reversed to customer.", metadata rows present
2. `PaymentCard` with `financialOutcome: "refunded"` + waived fees → identical to connect+refunded (modifier flattens the distinction)
3. `PaymentCard` with `financialOutcome: "refunded"` + legacy → collapsed card: "Payment" header (no Stripe Connect badge), single "Outcome: Refunded" row, no other content
4. `PaymentCard` with `financialOutcome: "completed"` → original display unchanged, `north_east` icon, bank account helper text (regression)
~~5. `PaymentCard` with `financialOutcome: undefined` → original display unchanged~~ REMOVED: impossible state — `financialOutcome` is `string` (not optional), schema is `notNull` with default `"unresolved"`

## Dependencies
- **Requires**: Spec 07 (prop threading wired up)
- **Requires**: Spec 03 (refunded display renders correctly)

## Out of scope
- Stripe webhook simulation
- Database state verification
