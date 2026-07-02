# Spec 07: Thread Prop Through PaymentCard

## Summary
Wire the derived `refunded` boolean from `PaymentCard` down to `FeeBreakdown`. This is the orchestration spec — connecting the data layer (spec 01) to the component layer (spec 02).

## Behaviour
- In `PaymentCard` render logic: derive `refunded` from `financialOutcome` (spec 01)
- Pass `refunded` as a prop to `<FeeBreakdown refunded={refunded} ... />`
- No new props on `PaymentCard` itself — it already has `financialOutcome`
- Stripe params (`reverse_transfer: true`, `refund_application_fee: true`) are upstream of `financialOutcome` and not this component's concern

## Scope
- Single prop pass-through in `PaymentCard`'s render method
- Derivation call site

## Dependencies
- **Requires**: Spec 01 (derive-refunded-flag) — the derivation logic
- **Requires**: Spec 02 (fee-breakdown-refunded-prop) — FeeBreakdown accepts the prop

## Out of scope
- What `FeeBreakdown` does with the prop (specs 03–05)
