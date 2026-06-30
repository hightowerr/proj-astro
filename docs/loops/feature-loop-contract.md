# Feature Loop Contract

## Goal
All Stripe Connect specs (17 specs across 4 phases) are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: stripe-connect
- Wave: ALL (1–4)
- Phase: COMPLETE + POST-LOOP DESIGN REVIEW
- Verify: 72 PASS / 2 FAIL (LOW)
- Drift: 20 evolution / 23 shortcut — all 23 shortcuts fixed
- Retro: 3 patterns, 2 friction signals logged
- Design review: 13 questions grilled, 10 issues logged, 2 parked to roadmap

## Retro summary
- **Patterns extracted (3):** design-enriched-specs, spike-before-shape, parallel-wave-implementation
- **Friction logged (2):** agent-skips-visual-polish (AGENT), env-validation-bypass (CODEBASE)
- **Drift analysis:** 20 evolutions accepted. 23 shortcuts → all fixed.
- **Key learning:** Agents implement business logic faithfully but treat visual polish as optional.

## Post-loop design review (grill-with-docs)
13 questions grilled against specs + codebase. Surfaced:

**Design decisions made:**
- Add `suspended` onboarding status for Stripe capability revocation (distinct from `pending`)
- 50p flat fee is deliberate for v1, revisit with volume data
- Platform absorbs Stripe processing fee on refunds (not surfaced to merchants)
- £1 minimum deposit floor enforced at platform level (`topDepositWaived` bypasses)
- Re-engagement email window anchored to later of `stripeAccountCreatedAt` or first service created date

**Issues logged to current-issues.md (10):**
1. Refund state missing from payment card (need 6th state)
2. In-flight payments during Connect suspension
3. Platform webhook unaware of Connect transfers (`transfer.created`/`transfer.failed`)
4. Slot recovery bypasses Connect guard (hardcoded `paymentsEnabled: true`)
5. No minimum deposit floor
6. Webhook event type misconfiguration can silently drop events
7. Auto-poll timeout has no fallback state
8. Stripe receipt emails may duplicate app confirmations
9. Free bookings get no confirmation SMS
10. MCC hardcoded to 7241
11. Re-engagement email assumes owner reached Stripe
12. Payouts-not-enabled not surfaced in Connected state
13. Re-engagement email window anchored incorrectly
14. Disputes attributed to merchant with no visibility
15. Kicksnare migration: pre-Connect appointments have no depositSkipped signal

**Parked to roadmap.md (2):**
1. Multi-currency / international expansion
2. Partial refunds with Connect
3. Multi-shop / multi-owner support

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-06-28 | — | SHAPE | — | 9 R's, 17 parts, 3 spikes, 13 slices across 4 waves |
| 2026-06-28 | 1–4 | IMPLEMENT | — | 13 slices, 10 new files, 9 modified. Typecheck clean |
| 2026-06-28 | ALL | VERIFY Rev 1 | — | 54 PASS / 20 FAIL. 18 fixed between Rev 1-2 |
| 2026-06-29 | ALL | VERIFY Rev 2 | — | 72 PASS / 2 FAIL (LOW) |
| 2026-06-29 | ALL | DRIFT AUDIT | — | 20 evolution / 23 shortcut — all 23 fixed |
| 2026-06-29 | ALL | RETRO | — | 3 patterns, 2 friction. Loop COMPLETE |
| 2026-06-30 | — | DESIGN REVIEW | — | 13 questions grilled, 15 issues logged, 3 roadmap items parked |

## References
- Drift: docs/signals/drift/stripe-connect-wave-all.md
- Verify: docs/shaping/stripe-connect/shape/wave-all-verify.md
- Patterns: docs/signals/patterns/ (design-enriched-specs, spike-before-shape, parallel-wave-implementation)
- Friction: docs/signals/friction/ (agent-skips-visual-polish, env-validation-bypass)
- Shaping: docs/shaping/stripe-connect/shape/
- Specs: docs/shaping/stripe-connect/
- Issues: docs/context/current-issues.md
- Roadmap: docs/context/roadmap.md
