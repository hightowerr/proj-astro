# Feature Loop Contract

## Goal
All MCC-hardcoded specs (5 specs, 2 implementation waves) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: MCC-hardcoded (derive MCC from shop.businessType instead of hardcoding 7241)
- Wave: 2 of 2 (wave 3 is post-deploy, deferred)
- Phase: COMPLETE
- Specs in scope: docs/shaping/MCC-hardcoded/specs/ (01–05)
- Wave 1 specs: 01 (mapping module)
- Wave 2 specs: 02 (route integration), 03 (schema guard test)
- Deferred: 04 (post-deploy audit script), 05 (codebase audit — already complete as documentation)

## Backlog
- Waves remaining: wave 2 (specs 02+03), wave 3 (spec 04, post-deploy)
- Blocked specs: 04 — requires deployment of waves 1-2 to production

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-06 | — | SHAPE | — | Specs pre-existing. Shape doc, slices doc, 2 wave plans created. 3 spikes confirmed (query returns businessType, type import works, vitest aliases work). No unknowns. |
| 2026-07-06 | 1 | IMPLEMENT | — | 1 slice: mcc-mapping.ts. Type-check clean. |
| 2026-07-06 | 2 | IMPLEMENT | — | 2 slices: route integration + guard test. 6 tests passing. Type-check clean. 0 regressions. |
| 2026-07-06 | 1–2 | DRIFT AUDIT | — | 2 evolution / 0 shortcut (0%). Both follow spec's own recommendations. No spec patches needed. |
| 2026-07-06 | 1–2 | VERIFY | — | 10/10 PASS (all acceptance criteria). Independent verifier in fresh session. |
| 2026-07-06 | 1–2 | RETRO | — | 0 new patterns. 0 friction. 2 evolutions (both spec-guided). Loop COMPLETE. |
| 2026-07-06 | 3 | IMPLEMENT | — | Spec 04: `scripts/audit-mcc.ts` (post-deploy audit). Type-check clean. Run after deploy. |

## Prior features
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
- Shape: docs/shaping/MCC-hardcoded/shape/mcc-hardcoded-shape.md
- Slices: docs/shaping/MCC-hardcoded/shape/mcc-hardcoded-slices.md
- Specs: docs/shaping/MCC-hardcoded/specs/ (01–05)
- Build order: docs/shaping/MCC-hardcoded/specs/_build-order.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-06-30_15-42-56_mcc_hardcoded_multi_vertical_risk/analysis_report.md
