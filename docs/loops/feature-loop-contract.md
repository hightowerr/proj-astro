# Feature Loop Contract

## Goal
All remaining design-consistency specs are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: design-consistency
- Wave: 5 — spec #20 (dead token cleanup)
- Phase: COMPLETE (implement, verify, drift audit all done)
- Specs in scope: #20 (2 slices)
- Shaping docs: docs/shaping/design-consistency/feature-spec/shape/wave-5/

## Backlog
- Design consistency: specs #09-#20 (inline styles, typography, alignment, dead tokens)
- Booking page reskin: specs #08 (confirm-booking-CTA), #09 (footer)
- Blocked specs: none

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| prior | 1 | COMPLETE | - | Specs #01, #03, #05, #07 |
| prior | 2 | COMPLETE | - | Specs #02, #06, #08 |
| 2026-06-21 | 1-2 | RETRO (backfill) | - | Seeded 13 signals: 5 patterns, 5 friction, 3 drift. Ratio 3/0 evolution/shortcut |
| 2026-06-22 | 3 | COMPLETE | ~15min | Spec #04 AL utility classes. 3 tokens + 8 classes. Purely additive, no drift. |
| 2026-06-22 | 4 | COMPLETE | ~60min | Specs #09-#19. 8 slices, 18 files. Verified: 2 fixes applied. Drift: 3 evolution, 0 shortcuts. |
| 2026-06-22 | 5 | COMPLETE | ~25min | Spec #20. 2 slices, 4 files. globals.css -215 lines. 49 dead tokens + 15 dead classes removed. Verify found+fixed 6 DL Tailwind classes in booking-form success block. Drift: 3 evolution, 0 shortcuts. |

## References
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Shaping (prior waves): docs/shaping/design-consistency/feature-spec/shape/
- Shaping methodology: `/shaping` skill (invoke at start of Phase 1)
