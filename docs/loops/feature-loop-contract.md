# Feature Loop Contract

## Goal
Configurable service durations: decouple service duration from calendar grid cadence, raise max from 240 to 480 minutes, replace dropdown/radio selectors with number inputs. 7 specs, 3 waves.

## Current state
- Feature: configurable-durations
- Wave: 3 of 3
- Phase: COMPLETE
- Specs in scope: docs/shaping/configurable-durations/specs/ (01–07)
- Build order: docs/shaping/configurable-durations/_build-order.md
- Design prototypes: docs/shaping/configurable-durations/designs/ (3 interactive HTML mockups)

## Backlog
- Waves remaining: none (all implemented)
- Blocked specs: none
- Design review: 3 prototypes reviewed — Service Editor Duration Input 1a, Onboarding Duration Input, Service Editor Grid Cadence Hint

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-18 | — | SHAPE | — | 7 specs + build order pre-written. 3 design prototypes loaded + token-extracted. Shape doc, slices doc, 7 slice plans created. No spikes needed — all patterns known from prior features. Collapsed build-order phases 1+2 into Wave 1 (foundation + core unlock). |
| 2026-07-18 | 1 | IMPLEMENT | — | 3 slices: Spec 01 (MAX 240→480, 1 line), Spec 02 (validateDuration: grid-multiple → floor check, `_shopId` unused prefix), Spec 05 (DB CHECK constraint + manual migration 0040). `pnpm check` clean. 1 deviation: MIN_SERVICE_DURATION_MINUTES constant extracted to constants.ts (EVOLUTION — testability). |
| 2026-07-18 | 2 | IMPLEMENT | — | 3 slices parallel: Spec 03 (editor dropdown → number input + stepper + "min" suffix + helper text), Spec 04 (onboarding radio → number input + stepper, MAX import added), Spec 06 (10 tests, all PASS). `pnpm check` clean. 0 deviations. |
| 2026-07-18 | 3 | IMPLEMENT | — | 1 slice: Spec 07 (showGridHint variable + conditional `<p>` with link to availability settings). `pnpm check` clean. 0 deviations. |
| 2026-07-18 | 1–3 | VERIFY | — | Independent verifier (fresh session). 45/45 PASS, 0 FAIL, 0 BLOCKED. Code review + unit tests (10/10 PASS). |
| 2026-07-18 | 1–3 | DRIFT AUDIT | — | 0 remaining unimplemented specs. 2 deviations, both EVOLUTION (MIN constant extraction, `_shopId` prefix). 0 shortcuts. |
| 2026-07-18 | 1–3 | RETRO | — | Architecture updates applied (content model note, domain rules convention). Progress tracker updated. Loop COMPLETE. |

## Dependency graph
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

## Waves
| Wave | Specs | Strategy | Files |
|------|-------|----------|-------|
| 1 | 01, 02, 05 | Sequential: 01 first (trivial), then 02 + 05 parallel | `constants.ts`, `actions.ts`, `schema.ts` + migration |
| 2 | 03, 04, 06 | Parallel: 3 independent files | `service-editor-form.tsx`, `add-service-step.tsx`, test file |
| 3 | 07 | Sequential: single addition | `service-editor-form.tsx` |

## Critical path
```
01 (raise MAX) → 02 (remove validation) → 03 (editor input) → 07 (grid hint)
```
4 specs, sequential. Specs 04, 05, 06 are off the critical path.

## Architecture context updates (apply in RETRO)
Queued in `docs/shaping/configurable-durations/_build-order.md`:
1. architecture-context.md: Content Model — `durationMinutes` decoupled from `slotMinutes` (5–480, not grid multiples)
2. code-standards.md: convention — duration and grid cadence are orthogonal, no coupling validation
3. progress-tracker.md: add feature entry
4. roadmap.md: move "Configurable service durations" to Resolved

## Prior features
### dispute-visibility — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-17 | 1–3 | ALL | 41/41 PASS. 4 evolution / 0 shortcut. Loop COMPLETE. |

### auto-poll-fallback — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-16 | 1 | ALL | ALL PASS. 0 evolution / 0 shortcut. Single-file sweep. Loop COMPLETE. |

### payouts-not-surfaced — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-15–16 | 1 | ALL | 14/14 PASS. 0 evolution / 0 shortcut. Loop COMPLETE. |

### rebrand — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-13–14 | 1–2 | ALL | 32/32 PASS. 4 evolution / 0 shortcut. Loop COMPLETE. |

### connect-guard — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-08 | 1–2 | ALL | 19/19 PASS. 1 evolution / 0 shortcut. Loop COMPLETE. |

### no-minimum — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-07 | 1–2 | ALL | 16/16 PASS. 1 evolution / 0 shortcut. Loop COMPLETE. |

### ks-migration — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-07 | 1 | ALL | 10/10 PASS. 0 evolution / 0 shortcut. Loop COMPLETE. |

### confirmation-SMS — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-07 | 1–2 | ALL | 20/20 PASS. 0 evolution / 0 shortcut. Loop COMPLETE. |

### MCC-hardcoded — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-06 | 1–2 | ALL | 10/10 PASS. 2 evolution / 0 shortcut. Loop COMPLETE. |

### Re-engagement-email — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-05 | 1 | ALL | 7 PASS / 4 FAIL (pre-existing). 0 evolution / 0 shortcut. Loop COMPLETE. |

### inflight-payments — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-02–03 | 1–7 | ALL | 107 PASS / 0 FAIL. 8 evolution / 0 shortcut. Loop COMPLETE. |

### webhook-unaware — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-01–02 | 1–3 | ALL | 30 PASS / 0 FAIL / 3 BLOCKED. 7 evolution / 0 shortcut. Loop COMPLETE. |

### refund-state — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-01 | 1–3 | ALL | 31 PASS / 3 FAIL (test infra). 4 evolution / 1 shortcut. Loop COMPLETE. |

## References
- Specs: docs/shaping/configurable-durations/specs/ (01–07)
- Build order: docs/shaping/configurable-durations/_build-order.md
- Design prototypes: docs/shaping/configurable-durations/designs/
- Shape: docs/shaping/configurable-durations/shape/configurable-durations-shape.md
- Slices: docs/shaping/configurable-durations/shape/configurable-durations-slices.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
