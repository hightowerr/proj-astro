# Feature Loop Contract

## Goal
All no-minimum specs (4 specs, 2 waves) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: no-minimum (platform minimum deposit floor — £1 clamp)
- Wave: 2 of 2
- Phase: COMPLETE
- Specs in scope: docs/shaping/no-minimum/specs/ (01–04)
- Wave 1 specs: 01 (floor constant + derive clamp), 04 (tripwire docs) — sequential (same file)
- Wave 2 specs: 02 (appointment clamp), 03 (floor unit tests) — parallel

## Backlog
- Waves remaining: none
- Blocked specs: none

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-07 | — | SHAPE | — | Specs pre-existing from mental models analysis (12 models, all converge). Shape doc, slices doc created. 0 spikes (all code paths verified from analysis). Single shape (dual-point floor clamp), 3 alternatives rejected. |
| 2026-07-07 | 1 | IMPLEMENT | — | 2 sequential slices (same file): `tier-pricing.ts` — exported `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100`, `const` → `let` in `derivePaymentRequirement`, floor clamp for `amountCents > 0 && < 100`, tripwire JSDoc comment. `pnpm check` clean. 0 deviations. |
| 2026-07-07 | 2 | IMPLEMENT | — | 2 parallel slices: `appointments.ts` (import + `clampedDepositCents` const before policy snapshot) + `tier-pricing.test.ts` (9 new floor tests, 22 total). `pnpm check` clean. 0 deviations. |
| 2026-07-07 | 1–2 | VERIFY | — | 16/16 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met. |
| 2026-07-07 | 1–2 | DRIFT AUDIT | — | 1 divergence: test file path (EVOLUTION, not shortcut). Spec 03 updated. 0 shortcuts. |
| 2026-07-07 | 1–2 | RETRO | — | 0 new patterns. 0 friction. 1 evolution / 0 shortcut. Loop COMPLETE. |

## Prior features
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
- Shape: docs/shaping/no-minimum/shape/no-minimum-shape.md
- Slices: docs/shaping/no-minimum/shape/no-minimum-slices.md
- Specs: docs/shaping/no-minimum/specs/ (01–04)
- Build order: docs/shaping/no-minimum/specs/_build-order.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-06-30_17-50-28_no_minimum_deposit_floor/analysis-report.md
