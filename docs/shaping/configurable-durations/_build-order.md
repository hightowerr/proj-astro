# Build Order — Configurable Service Durations

## Dependency Graph

```
Spec 01 (raise MAX) ─────────────────────────┐
                                              ├──► Spec 02 (remove grid-multiple)
                                              │         │
                                              │         ├──► Spec 03 (editor number input) ──► Spec 07 (grid hint)
                                              │         │
                                              │         ├──► Spec 04 (onboarding number input)
                                              │         │
                                              │         └──► Spec 06 (tests)
                                              │
                                              └──► Spec 05 (DB constraint)
```

## Phases

### Phase 1 — Foundation (1 spec, trivial)

| Spec | Title | File(s) | Depends on |
|------|-------|---------|------------|
| 01 | Raise MAX_SERVICE_DURATION_MINUTES to 480 | `constants.ts` | — |

### Phase 2 — Core unlock + safety (2 specs, parallel)

| Spec | Title | File(s) | Depends on |
|------|-------|---------|------------|
| 02 | Remove grid-multiple validation | `services/actions.ts` | 01 |
| 05 | Add DB upper-bound constraint | `schema.ts` + migration | 01 |

`pnpm check` after each. Run `pnpm drizzle-kit push` or generate migration for 05.

### Phase 3 — UI + tests (3 specs, parallel)

| Spec | Title | File(s) | Depends on |
|------|-------|---------|------------|
| 03 | Service editor number input | `service-editor-form.tsx` | 01, 02 |
| 04 | Onboarding number input | `add-service-step.tsx` | 01, 02 |
| 06 | Duration validation tests | `duration-validation.test.ts` | 01, 02 |

All three are independent of each other — different files, no shared state.

### Phase 4 — Polish (1 spec)

| Spec | Title | File(s) | Depends on |
|------|-------|---------|------------|
| 07 | Grid cadence guidance hint | `service-editor-form.tsx` | 03 |

## Critical Path

```
01 (raise MAX) → 02 (remove validation) → 03 (editor input) → 07 (grid hint)
```

4 specs, sequential. Phases 1–4. Specs 04, 05, 06 are off the critical path (parallel with 03).

## Summary

| Phase | Specs | Parallel? | Files touched |
|-------|-------|-----------|---------------|
| 1 | 01 | — | 1 |
| 2 | 02, 05 | Yes | 2 + migration |
| 3 | 03, 04, 06 | Yes | 3 |
| 4 | 07 | — | 1 (same as 03) |
| **Total** | **7** | | **~6 files + 1 migration** |

## Design Briefs

### Brief 1 — Service editor duration input (Spec 03)

**Current**: `<select>` dropdown showing multiples of grid cadence (e.g., 60, 120, 180, 240 for a 60-min grid).
**Proposed**: `<input type="number">` with min=5, max=480, step=5.
**Page**: Settings → Services → Edit/Create service modal.
**Design questions**: Should the input show a "min" suffix inline? Should it match the existing deposit amount input pattern? Native browser number controls or custom stepper arrows?
**Mockup needed**: Service editor form — "Time Commitment" field replacement.

### Brief 2 — Onboarding duration input (Spec 04)

**Current**: 4 radio-style options: 60, 120, 180, 240 min.
**Proposed**: Same number input as Brief 1.
**Page**: Onboarding → Step 3 "Add a service".
**Design questions**: Should the onboarding step show placeholder text like "e.g. 60" for guidance? Does removing the radio options change the visual weight of the step?
**Mockup needed**: Onboarding add-service step — duration field replacement.

### Brief 3 — Grid cadence guidance hint (Spec 07)

**Current**: No hint.
**Proposed**: Subtle text below duration input when duration >= 4× grid cadence, with link to availability settings.
**Page**: Settings → Services → Edit/Create service modal (below duration input).
**Design questions**: None — copy and tokens already specified. Informational, not blocking.
**Mockup needed**: Optional — text-only, follows existing hint patterns.

## Architecture Context Updates Needed

Apply during RETRO phase (Phase 5 of the feature loop). Do NOT apply yet.

1. **`docs/context/architecture-context.md`** — Content Model table: update `Event types` row to note that `durationMinutes` is decoupled from `slotMinutes` (arbitrary values 5–480, not grid multiples).

2. **`docs/context/code-standards.md`** — Add convention: "Service duration (`durationMinutes`) and calendar grid cadence (`slotMinutes`) are orthogonal. Do not add validation that couples them."

3. **`docs/context/progress-tracker.md`** — Add feature entry for configurable-durations.

4. **`docs/loops/feature-loop-contract.md`** — Update current feature to configurable-durations, record wave/phase timeline.

5. **`docs/context/roadmap.md`** — Move "Configurable service durations" entry to a Resolved section or remove after shipping (entry already updated with analysis reference).
