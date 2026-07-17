# Spec 07 — P4b: Unit tests for payment card disputed modifier

## Priority

P4 — LOW. Tests for spec 05.

## Summary

Add unit tests for the `disputed` modifier in the payment card helper functions. Follow the existing test patterns in `payment-card.test.ts`.

## Changes

- **File:** `src/components/appointments/payment-card.test.ts` (or `src/lib/__tests__/payment-card.test.ts` — wherever existing tests live)

### Test cases

**`resolvePayoutDisplay`:**
1. Returns "Disputed" when `disputed=true`
2. `disputed=true` takes priority over `refunded=true`
3. `disputed=true` takes priority over `transferHeld=true`

**`resolveHelperIcon`:**
4. Returns `"gavel"` when `disputed=true`
5. `disputed=true` takes priority over `refunded=true` (gavel, not undo)

**`resolveHelperText`:**
6. Returns dispute text when `disputed=true`
7. `disputed=true` takes priority over other states

## Acceptance Criteria

- [ ] 7 test cases covering disputed modifier across all three helpers
- [ ] Priority ordering verified: disputed > refunded > transferHeld > default
- [ ] All tests pass with `pnpm test`
- [ ] `pnpm check` passes

## Prerequisites

- Spec 05 (disputed modifier must exist in helper functions)

## Dependencies

Depends on: spec 05.
