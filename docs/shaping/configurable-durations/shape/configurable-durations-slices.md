# Slices — Configurable Service Durations

7 specs → 7 slices → 3 waves.

## Wave 1 — Foundation + Core Unlock (Slices 1–3)

Sequential start (Slice 1 first — trivial), then Slices 2 + 3 in parallel.

| Slice | Spec | Title | Files | Dependencies |
|-------|------|-------|-------|-------------|
| 1 | 01 | Raise MAX_SERVICE_DURATION_MINUTES to 480 | `constants.ts` | — |
| 2 | 02 | Remove grid-multiple validation | `actions.ts` | Slice 1 |
| 3 | 05 | Add DB upper-bound constraint | `schema.ts` + migration | Slice 1 |

**After each slice**: `pnpm check` (lint + typecheck). After Slice 3: `pnpm drizzle-kit generate` for migration.

## Wave 2 — UI + Tests (Slices 4–6)

All three in parallel — different files, no shared state.

| Slice | Spec | Title | Files | Dependencies |
|-------|------|-------|-------|-------------|
| 4 | 03 | Service editor number input | `service-editor-form.tsx` | Slices 1, 2 |
| 5 | 04 | Onboarding number input | `add-service-step.tsx` | Slices 1, 2 |
| 6 | 06 | Duration validation tests | `duration-validation.test.ts` (new) | Slices 1, 2 |

**After each slice**: `pnpm check`. After Slice 6: `pnpm test` to confirm all 10 cases pass.

## Wave 3 — Polish (Slice 7)

| Slice | Spec | Title | Files | Dependencies |
|-------|------|-------|-------|-------------|
| 7 | 07 | Grid cadence guidance hint | `service-editor-form.tsx` | Slice 4 |

**After slice**: `pnpm check`.

## Critical path

```
Slice 1 → Slice 2 → Slice 4 → Slice 7
```

Slices 3, 5, 6 are off the critical path and can run alongside their wave peers.

## Slice plans

- Wave 1: `shape/wave-1/slice-1-raise-max-plan.md`, `slice-2-remove-grid-validation-plan.md`, `slice-3-db-constraint-plan.md`
- Wave 2: `shape/wave-2/slice-4-service-editor-input-plan.md`, `slice-5-onboarding-input-plan.md`, `slice-6-validation-tests-plan.md`
- Wave 3: `shape/wave-3/slice-7-grid-hint-plan.md`

## Summary

| Metric | Value |
|--------|-------|
| Total slices | 7 |
| Total waves | 3 |
| Files modified | ~6 + 1 migration |
| New files | 1 test file + 1 migration |
| Design prototypes | 3 (specs 03, 04, 07) |
| Acceptance criteria | 42 total across all specs |
