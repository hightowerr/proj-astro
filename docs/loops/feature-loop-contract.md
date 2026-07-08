# Feature Loop Contract

## Goal
All connect-guard specs (5 specs, 2 waves + 1 deferred) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.
Financial safety (correct deposit routing) ships by end of Wave 2.

## Current state
- Feature: connect-guard (slot recovery Connect guard bypass — money routing + SMS fix)
- Wave: 2 of 2
- Phase: COMPLETE
- Specs in scope: docs/shaping/connect-guard/ (P0, F1, F2, F3, T1)
- Wave 1 specs: P0 (query gap), F2 (SMS branching), T1 (tripwire comment) — IMPLEMENTED
- Wave 2 specs: F1 (money routing) — IMPLEMENTED
- Wave 2 (cont): F3 (SMS cross-dep) — IMPLEMENTED (external dep `sendBookingConfirmationSMS` already shipped with confirmation-SMS feature)

## Backlog
- Waves remaining: 0
- Blocked specs: none
- Design review pending: F2 SMS copy (free-path text) — designer sign-off needed

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-08 | — | SHAPE | — | Specs derived from mental models analysis (12 models, all converge). 5 specs created, build order defined, 3 phases. 0 spikes needed (all code paths verified from analysis). 4 alternatives rejected (enforce in createAppointment, block offers for non-Connect, reopen slot, change default to required). |
| 2026-07-08 | 1 | IMPLEMENT | — | 3 parallel slices: P0 (query gap — added `stripeOnboardingStatus` + `name` to `findLatestOpenOffer` shop select + `OpenOffer` interface), F2 (SMS branching — branched on `booking.paymentRequired`, date/time formatting, `Reply STOP` compliance), T1 (tripwire comment on `appointments.ts:828`). `pnpm check` clean after each slice. 1 deviation: P0 also added `name` field (needed by F2). |
| 2026-07-08 | 2 | IMPLEMENT | — | 1 slice: F1 (money routing — replaced `paymentsEnabled: true` with `shop.stripeOnboardingStatus === "complete"`). `pnpm check` clean. 0 deviations. |
| 2026-07-08 | 2 | IMPLEMENT | — | 1 slice: F3 (SMS cross-dep — added `sendBookingConfirmationSMS` call for `!paymentRequired` branch, fire-and-forget with try/catch, `messageDedup` prevents double-send). External dep already shipped (confirmation-SMS feature). `pnpm check` clean. 0 deviations. |
| 2026-07-08 | 1–2 | VERIFY | — | 19/19 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met. |
| 2026-07-08 | 1–2 | DRIFT AUDIT | — | 1 divergence: P0 added `name` field (EVOLUTION — needed by F2 SMS copy). 0 shortcuts. Spec P0 updated. |
| 2026-07-08 | 1–2 | RETRO | — | Architecture context updates applied: invariant #17 (paymentsEnabled derivation), slot recovery flow steps 5b/5c, product rule (Connect guard). Issue marked RESOLVED. 0 new patterns. 0 friction. Loop COMPLETE. |

## Dependency graph
```
T1 (tripwire) ──────────────────────────── (independent)

P0 (query gap) ──► F1 (money routing) ──┐
                                         ├──► F3 (SMS cross-dep) [deferred]
              F2 (SMS branching) ────────┘
```

## Critical path
P0 → F1 → F3 (3 specs sequential; F3 also blocked on external issue)
Shortest path to financial safety: P0 → F1 (2 specs)

## Architecture context updates (apply in RETRO)
Queued in `docs/shaping/connect-guard/BUILD-ORDER.md`:
1. architecture-context.md: new invariant (#16 — paymentsEnabled derivation), slot recovery flow update, SMS branching note
2. current-issues.md: mark "Slot recovery bypasses Connect guard" resolved
3. product-rules.md: slot recovery follows same Connect guard as standard bookings
4. progress-tracker.md: mark connect-guard complete, note F3 deferred

## Prior features
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
- Specs: docs/shaping/connect-guard/ (P0, F1, F2, F3, T1)
- Build order: docs/shaping/connect-guard/BUILD-ORDER.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-06-30_22-28-37_slot_recovery_bypasses_connect_guard/analysis-report.md
