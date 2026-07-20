# Feature Loop Contract

## Goal
Launch truth audit: remove false claims, unverifiable metrics, and vaporware references from the landing page and booking page. Replace with honest, directional, structurally-true copy. 6 specs, 1 wave.

## Current state
- Feature: launch-truth-audit
- Wave: 1 of 1
- Phase: COMPLETE
- Specs in scope: docs/shaping/launch-truth-audit/specs/ (01–06)
- Build order: docs/shaping/launch-truth-audit/_build-order.md
- Design prototypes: docs/shaping/launch-truth-audit/design/ (3 interactive HTML mockups)

## Backlog
- Waves remaining: none (single wave)
- Blocked specs: none
- Design review: 3 prototypes — Slot Recovery Phone Mockup, Float Cards Directional Copy, BookingNav Simplified

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-18 | — | SHAPE | — | 6 specs + build order pre-written. 3 design prototypes. Zero inter-dependencies → single wave, all parallel. No spikes needed — string replacements + 1 component swap (Spec 02). |
| 2026-07-18 | 1 | IMPLEMENT | ~20 min | All 6 specs implemented. 0 deviations. `pnpm check` lint clean (pre-existing TS error in route.test.ts:829 only). |
| 2026-07-19 | 1 | VERIFY | — | Awaiting separate fresh session. |
| 2026-07-20 | 1 | VERIFY+DRIFT+RETRO | — | 32/32 PASS. 0 evolution / 0 shortcut. Context files updated. Loop COMPLETE. |

## Dependency graph
```
01 (hero social proof)       — independent
02 (carousel slot recovery)  — independent
03 (float cards directional) — independent
04 (CTA section cleanup)     — independent
05 (FAQ onboarding claim)    — independent
06 (BookingNav cleanup)      — independent
```
Zero inter-dependencies. All specs touch different files.

## Waves
| Wave | Specs | Strategy | Files |
|------|-------|----------|-------|
| 1 | 01–06 | All parallel (zero inter-deps) | `hero-section.tsx`, `features-carousel.tsx`, `page.tsx`, `cta-section.tsx`, `faq-section.tsx`, `booking-nav.tsx` |

## Critical path
```
No sequential chain. All specs are parallel.
Critical path = longest single spec = Spec 02 (~25 min).
```

## Document updates (apply in RETRO)
Queued in `docs/shaping/launch-truth-audit/_build-order.md`:
1. project-overview.md: §2 social proof line, §4 exclusion #8 note
2. current-issues.md: BookingNav session awareness → Resolved
3. progress-tracker.md: add feature entry
4. roadmap.md: mark "Homepage update (parked)" partially addressed

## OLD — Spec 01 (raise MAX) ─────────────────────────┐
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
