# Feature Loop Contract

## Goal
All inflight-payments specs (13 specs across 4 waves) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: inflight-payments (In-flight payments during Connect suspension)
- Wave: ALL (1–4)
- Phase: COMPLETE
- Specs in scope: docs/shaping/inflight-payments/ (01–13)
- Verify: 76 PASS / 0 FAIL / 0 BLOCKED. Independent verifier in separate session.
- Drift: 8 evolution / 0 shortcut (0% — well below 50% threshold)
- Retro: 1 pattern extracted, 1 pattern updated
- Tests: 45 new tests (verifier count), all passing. 1 pre-existing failure (messages.test.ts).
- Type-check: zero new errors

## Backlog
- Wave 1: ✅ Specs 01, 02, 07 — foundations (3 parallel agents)
- Wave 2: ✅ Specs 03, 04, 06, 08, 09 — core logic + P1 tests (5 parallel agents)
- Wave 3: ✅ Specs 05, 10, 12 — UI completion + backend tests (3 parallel agents)
- Wave 4: ✅ Specs 11, 13 — final tests (2 parallel agents)
- Blocked specs: none

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-02 | — | SHAPE (specs) | — | 13 specs created from mental models analysis. BUILD-ORDER with 4-phase dependency graph. |
| 2026-07-03 | — | SHAPE (designs) | — | Both design prototypes reviewed (Appointment Fee Breakdown + Dashboard Connect Card). Specs 04-06 enriched with exact design details. |
| 2026-07-03 | — | SHAPE (spike+plans) | — | 7 spikes run. 3 critical findings: webhook needs shop lookup (spec 03), new error helper needed (spec 01), console.warn required. Shape doc, slices doc, 13 slice plans across 4 wave folders. |
| 2026-07-03 | 1 | IMPLEMENT | — | 3 parallel agents (worktree). stripe-refund.ts (+isReverseTransferFailedError, fallback catch), schema.ts (+transferHeld), connect-webhook (+sweep cancel). Clean. |
| 2026-07-03 | 2 | IMPLEMENT | — | 5 parallel agents. Detection guard (webhook/route.ts), card state (payment-card.tsx), dashboard card (new transfer-held-card.tsx), sweep flag (connect-webhook), refund tests (17 tests). |
| 2026-07-03 | 3 | IMPLEMENT | — | 3 parallel agents. Helper text (payment-card.tsx), guard tests (5 tests), sweep tests (9 tests). |
| 2026-07-03 | 4 | IMPLEMENT | — | 2 parallel agents. Card logic tests (16 tests, extracted 3 pure functions), integration tests (9 tests, 5 scenarios). |
| 2026-07-03 | ALL | VERIFY | — | 76 PASS / 0 FAIL / 0 BLOCKED. Independent verifier in separate session. |
| 2026-07-03 | ALL | DRIFT AUDIT | — | 8 evolution / 0 shortcut (0%). 3 root causes: data model discovery, mechanical necessity, testability. |
| 2026-07-03 | ALL | RETRO | — | 1 pattern extracted (multi-table-spike), 1 pattern updated (spike-before-shape +1 item). Loop COMPLETE. |

## Prior features
### webhook-unaware — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-01 | — | SHAPE | 10 specs, 3 waves |
| 2026-07-01 | 1–3 | IMPLEMENT | All 9 slices, 23 tests |
| 2026-07-02 | ALL | VERIFY+DRIFT+RETRO | 30 PASS / 0 FAIL / 3 BLOCKED. 7 evolution / 0 shortcut. Loop COMPLETE. |

### refund-state — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-01 | — | SHAPE | 10 specs, 3 waves |
| 2026-07-01 | 1–3 | IMPLEMENT | 3 waves sequential |
| 2026-07-01 | ALL | VERIFY+DRIFT+RETRO | 31 PASS / 3 FAIL (test infra). 4 evolution / 1 shortcut. Loop COMPLETE. |

## References
- Shape: docs/shaping/inflight-payments/shape/inflight-payments-shape.md
- Slices: docs/shaping/inflight-payments/shape/inflight-payments-slices.md
- Spike: docs/shaping/inflight-payments/shape/spike-codebase-analysis.md
- Specs: docs/shaping/inflight-payments/ (01–13)
- Build order: docs/shaping/inflight-payments/BUILD-ORDER.md
- Design brief: docs/shaping/inflight-payments/DESIGN-BRIEF.md
- Design prototypes: Appointment Fee Breakdown.html, Dashboard Connect Card.html
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-06-30_13-38-53_inflight_payment_connect_suspension/analysis_report.md
