# Slice 6 — Duration validation tests

**Spec**: 06
**Wave**: 2 (tests)
**Effort**: Small

## Change

Create new test file: `src/app/app/settings/services/__tests__/duration-validation.test.ts`

### Test cases (10)

Testing the new validation boundaries from Specs 01 + 02:

| # | Test name | Input | Expected |
|---|-----------|-------|----------|
| 1 | Duration 75 accepted | `validateDuration(shopId, 75)` | returns `null` |
| 2 | Duration 50 accepted | `validateDuration(shopId, 50)` | returns `null` |
| 3 | Duration 5 accepted (minimum) | `validateDuration(shopId, 5)` | returns `null` |
| 4 | Duration 4 rejected | `validateDuration(shopId, 4)` | returns field error "at least 5 minutes" |
| 5 | Duration 480 accepted (maximum) | Zod parse `{ durationMinutes: 480 }` | passes |
| 6 | Duration 481 rejected | Zod parse `{ durationMinutes: 481 }` | fails ("480 minutes or less") |
| 7 | Duration 0 rejected | Zod parse `{ durationMinutes: 0 }` | fails (positive required) |
| 8 | Duration -1 rejected | Zod parse `{ durationMinutes: -1 }` | fails |
| 9 | Duration 17 accepted (non-step-aligned) | `validateDuration(shopId, 17)` | returns `null` (step=5 is browser-only) |
| 10 | Grid-aligned durations still pass | 30, 60, 90, 120, 180, 240 | all return `null` |

### Implementation notes

- `validateDuration` is not exported — it's a private `async function` in `actions.ts`. Tests need to either:
  - (a) Test indirectly via `createEventType`/`updateEventType` — but these require DB + auth (heavy)
  - (b) Extract `validateDuration` or duplicate the logic for testing
  - (c) Test the Zod schema directly (it's accessible as a const) + test the floor check separately

**Recommended approach**: Test the Zod schema validation directly (cases 5-8) and extract or re-implement the floor check logic for cases 1-4, 9-10. The Zod schema `serviceEditorSchema` may need to be exported or its validation tested via the public action functions.

If `validateDuration` cannot be tested directly, create a pure function `isDurationValid(durationMinutes: number): boolean` that encapsulates the floor check and export it for testing. The `validateDuration` function would call this internally.

### Alternative: test via Zod schema only

If extracting the function is too invasive, test cases 1-4 and 9-10 by calling `serviceEditorSchema.safeParse()` with a complete valid object (all fields filled) and varying only `durationMinutes`. This tests the Zod boundary. The floor check (`< 5`) in `validateDuration` would then be covered by integration tests or Phase 3 verification.

## Files to create

| File | Purpose |
|------|---------|
| `src/app/app/settings/services/__tests__/duration-validation.test.ts` | 10 test cases |

## Files to potentially modify

| File | Change |
|------|--------|
| `src/app/app/settings/services/actions.ts` | May need to export `serviceEditorSchema` or extract floor-check function |

## Acceptance criteria

1. All 10 test cases pass
2. `pnpm check` clean

## Dependencies

- Slice 1 (MAX constant = 480)
- Slice 2 (validation logic — floor check)
