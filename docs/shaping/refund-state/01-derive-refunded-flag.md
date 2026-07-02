# Spec 01: Derive Refunded Flag

## Summary
Add a utility that derives `refunded: boolean` from the existing `financialOutcome` prop on `PaymentCard`. Pure data derivation — no UI changes.

## Behaviour
- `financialOutcome === "refunded"` → `true`
- All other values (including `undefined`) → `false`

## Scope
- Single derivation expression or helper, co-located with `PaymentCard` or shared utils
- No new DB fields, no schema changes — `financialOutcome` already exists on `PaymentCard` props

## Dependencies
- **Prerequisites**: None — uses existing prop

## Out of scope
- Threading the flag to child components (see spec 07)
- Partial refund amounts (future extension)
