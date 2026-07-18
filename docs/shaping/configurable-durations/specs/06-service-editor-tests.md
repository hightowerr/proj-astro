# Spec 06 — Unit tests for duration validation changes

**Priority**: P2 (verify the new validation boundaries)
**Type**: Tests
**Risk**: None

## Change

Add test cases to cover the new validation behavior. Location: either extend existing test file for services actions, or create `src/app/app/settings/services/__tests__/duration-validation.test.ts`.

### Test cases

1. **Duration 75 accepted** — `validateDuration(shopId, 75)` returns null (previously returned error when slotMinutes=60).
2. **Duration 50 accepted** — `validateDuration(shopId, 50)` returns null (previously returned error when slotMinutes=60).
3. **Duration 5 accepted** — `validateDuration(shopId, 5)` returns null (minimum).
4. **Duration 4 rejected** — `validateDuration(shopId, 4)` returns field error "at least 5 minutes".
5. **Duration 480 accepted** — Zod schema accepts 480.
6. **Duration 481 rejected** — Zod schema rejects 481 ("480 minutes or less").
7. **Duration 0 rejected** — Zod schema rejects 0 (positive integer required).
8. **Duration -1 rejected** — Zod schema rejects negative values.
9. **Duration 17 accepted** — non-step-aligned value passes backend validation (step=5 is browser-only).
10. **Existing grid-aligned durations still pass** — 30, 60, 90, 120, 180, 240 all accepted.

## Dependencies

- Spec 01 (MAX constant) — tests reference the 480 boundary.
- Spec 02 (validation logic) — tests verify the new behavior.

## Acceptance Criteria

1. All 10 test cases pass.
2. `pnpm check` clean.
