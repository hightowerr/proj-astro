# Feature Loop Contract

## Goal
All ks-migration specs (2 specs, 1 wave) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: ks-migration (pre-Connect appointments query fallback)
- Wave: 1 of 1
- Phase: COMPLETE
- Specs in scope: docs/shaping/ks-migration/specs/ (01–02)
- Wave 1 specs: 01 (dashboard fallback), 02 (appointments fallback) — parallel

## Backlog
- Waves remaining: none
- Blocked specs: none

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-07 | — | SHAPE | — | Specs pre-existing from issue analysis. Shape doc, slices doc, 1 wave plan created. 0 spikes (all edge cases pre-verified in issue analysis). Single shape (query fallback), 3 alternatives rejected. |
| 2026-07-07 | 1 | IMPLEMENT | — | 2 parallel slices: `dashboard/page.tsx` + `appointments/page.tsx`. Both add `OR (isNull(depositSkipped) AND paymentStatus = 'unpaid')` to unprotected count query. Import `isNull`, `or` from drizzle-orm. Comment added. `pnpm check` clean. 0 deviations. |
| 2026-07-07 | 1 | VERIFY | — | 10/10 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. Edge case safety confirmed. |
| 2026-07-07 | 1 | DRIFT AUDIT | — | 0 divergences. Implementation matches both specs exactly. |
| 2026-07-07 | 1 | RETRO | — | 0 new patterns. 0 friction. 0 drift. Loop COMPLETE. |

## Prior features
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
- Shape: docs/shaping/ks-migration/shape/ks-migration-shape.md
- Slices: docs/shaping/ks-migration/shape/ks-migration-slices.md
- Specs: docs/shaping/ks-migration/specs/ (01–02)
- Build order: docs/shaping/ks-migration/build-order.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-06-30_23-14-47_kicksnare_migration_depositskipped_signal/analysis_report.md
