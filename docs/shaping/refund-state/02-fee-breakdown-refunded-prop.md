# Spec 02: FeeBreakdown Refunded Prop

## Summary
Extend the `FeeBreakdown` component interface to accept a `refunded: boolean` prop. Type-level change only — no rendering logic yet.

## Behaviour
- Add `refunded?: boolean` to `FeeBreakdownProps` (optional, defaults to `false`)
- No visual change when prop is absent or `false` — existing behaviour preserved
- `determineFeeState()` is NOT modified (fee state remains structural, refund is temporal)

## Scope
- Type definition update on `FeeBreakdownProps`
- Default value handling

## Dependencies
- **Prerequisites**: None — interface-only change

## Out of scope
- Conditional rendering based on `refunded` (see spec 03)
- Prop threading from parent (see spec 07)
