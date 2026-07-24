# Feature Loop Contract

## Goal
Polar subscription lifecycle: 4-state subscription enum, Polar Better Auth plugin, webhook handler with dedup, trial initialization, dashboard auth gating via `requireShopAuth()`, booking soft lock, paywall page, checkout interstitial, past-due banner, onboarding drip (8 emails), reconciliation, grace period emails. 14 implementation specs, 5 waves.

## Current state
- Feature: polar-subscription
- Surface: fullstack
- Wave: 5 of 5
- Phase: COMPLETE
- Specs in scope: docs/shaping/polar-subscription/ (01–14)
- Build order: docs/shaping/polar-subscription/BUILD-ORDER.md
- Shape: docs/shaping/polar-subscription/shape/polar-subscription-shape.md
- Slices: docs/shaping/polar-subscription/shape/polar-subscription-slices.md
- Design prototypes: docs/shaping/polar-subscription/design/ (4 UI + 11 email HTML mockups)
- Spike: docs/shaping/polar-subscription/shape/spike-polar-checkout-customer.md (resolved — `createCustomerOnSignUp: true`)

## Backlog
- Waves remaining: none (all implemented and verified)
- Blocked specs: none

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-21 | — | SHAPE | — | 14 specs + BUILD-ORDER pre-written. 4 UI design prototypes + 11 email prototypes. Spike resolved (createCustomerOnSignUp: true). Shape doc, slices doc, 3 wave-1 slice plans created. 5 waves defined. |
| 2026-07-21 | 1 | IMPLEMENT | — | 3 slices: 01 (schema — enum, 4 columns, dedup table, migration 0041), 02 (env vars — POLAR_ACCESS_TOKEN + POLAR_WEBHOOK_SECRET), 03 (server plugin — @polar-sh/better-auth + @polar-sh/sdk, 6 webhook stubs). `pnpm check` clean. 0 deviations. |
| 2026-07-21 | 1 | VERIFY | — | Independent verifier (fresh session). 21/21 PASS, 0 FAIL, 0 BLOCKED, 0 trajectory flags. |
| 2026-07-21 | 1 | DRIFT AUDIT | — | 1 divergence (EVOLUTION): spec 03 `createCustomerOnSignUp: false` → `true` per spike finding. Spec updated. 0 shortcuts. |
| 2026-07-21 | 1 | RETRO | — | No new patterns (foundation-first-slicing reapplied). No friction. Evolution/shortcut: 1/0 (0%). Wave 1 complete. |
| 2026-07-21 | 2 | IMPLEMENT | — | 3 slices: 04 (client plugin — `polarClient()` in auth-client.ts), 05 (webhook handler — 3 state-changing callbacks with dedup+timestamp guard, 3 no-op loggers), 06 (trial init — `subscriptionStatus: 'trialing'` + `trialEndsAt` at shop creation). `pnpm check` clean. 0 deviations. Worktrees timed out (8K+ files) — implemented directly. |
| 2026-07-21 | 2 | VERIFY | — | Independent verifier (fresh session). 19/19 PASS, 0 FAIL, 0 BLOCKED, 0 trajectory flags. |
| 2026-07-21 | 2 | DRIFT+RETRO | — | 0 divergences. No new patterns. Friction: worktree timeout (known). Wave 2 complete. |
| 2026-07-21 | 3 | IMPLEMENT | — | 4 slices: 07 (requireShopAuth — new function + 24 route replacements), 08 (booking soft lock — canceled check + unavailable card), 09 (paywall page — 2 variants + pricing toggle + checkout CTA), 12 (onboarding drip — 8 emails + resolve-outcomes hook). `pnpm check` clean. 0 deviations. |
| 2026-07-22 | 3 | VERIFY | — | Independent verifier. 41/44 PASS, 3 BLOCKED (2 design prototype, 1 messageLog schema). 2 fixes applied (phantom phone section, 5 stale test mocks). Re-verified PASS. 0 trajectory flags. |
| 2026-07-23 | 3 | DRIFT+RETRO | — | 0 divergences against remaining specs (10, 11, 13, 14). messageLog incompatibility noted — drips use messageDedup (EVOLUTION, not shortcut). Wave 3 complete. |
| 2026-07-23 | 4 | IMPLEMENT | — | 3 slices: 10 (checkout interstitial — polling client component, 2 states, server action), 11 (past-due banner — amber dismissible banner + customerPortal CTA, layout integration), 13 (reconciliation — Polar API check + DB heal on paywall page). `pnpm check` clean. 0 deviations. |
| 2026-07-23 | 5 | IMPLEMENT | — | 1 slice: 14 (grace period emails — 3 deferred emails from webhook callbacks: payment-failed, payment-recovered, subscription-ended. sendBillingEmail helper, messageDedup, outside transaction). `pnpm check` clean. 0 deviations. |
| 2026-07-23 | 4–5 | VERIFY | — | Independent verifier (fresh session). 31/33 PASS, 2 BLOCKED (design prototypes). 0 trajectory flags. |
| 2026-07-23 | ALL | DRIFT AUDIT | — | 2 divergences total, both EVOLUTION: (1) createCustomerOnSignUp false→true per spike, (2) messageLog→messageDedup for drip dedup (schema incompatibility). 0 shortcuts. |
| 2026-07-23 | ALL | RETRO | — | Architecture context updated (Polar component, requireShopAuth, subscription lifecycle, 5 new invariants, env vars). Code standards updated (3 new domain rules). Progress tracker updated. Loop COMPLETE. |

## Dependency graph
```
01-schema ─┬─► 05-webhook ◄── 03-server    03-server ◄── 02-env
           │        │                          │
           ├─► 06-trial                    04-client ◄───┘
           │        │
           ├─► 08-booking-lock             09-paywall ◄── 04-client
           │                                   │         ◄── 07-auth
           └─► 07-auth ◄── 06-trial            │
                   │                       10-interstitial ◄── 05-webhook
                   │                                        ◄── 09-paywall
                   ├─► 11-banner
                   └─► 12-drip ◄── 06-trial

13-reconciliation ◄── 03-server, 09-paywall
14-grace-emails ◄── 05-webhook, 12-drip
```

## Waves
| Wave | Specs | Strategy | Key files |
|------|-------|----------|-----------|
| 1 | 01, 02, 03 | 01+02 parallel, 03 after 02 | schema.ts, env.ts, auth.ts, polar.ts (new) |
| 2 | 04, 05, 06 | All parallel | auth-client.ts, auth.ts (webhook logic), shop creation |
| 3 | 07, 08, 09, 12 | 07+08+12 parallel, 09 after 07 | session.ts, book/[slug]/page.tsx, billing/subscribe (new), onboarding-drips.ts (new) |
| 4 | 10, 11, 13 | All parallel | billing/processing (new), past-due-banner.tsx (new), billing/subscribe/page.tsx |
| 5 | 14 | Sequential | Auth.ts webhook deferred calls |

## Critical path
```
02-env → 03-server → 04-client → 09-paywall → 10-interstitial
  (also: 01-schema → 06-trial → 07-auth → 09-paywall)
```
5 sequential steps. Both chains converge at 09-paywall.

## Architecture context updates (apply in RETRO)
Queued in `docs/shaping/polar-subscription/BUILD-ORDER.md`:
1. architecture-context.md: Add Polar as billing engine. Add `requireShopAuth()` auth pattern. Add Polar webhook route. Add env vars.
2. code-standards.md: Document webhook handler pattern (dedup + timestamp guard). Document `requireShopAuth()` vs `requireAuth()` convention.
3. progress-tracker.md: Add polar-subscription feature entry.
4. project-overview.md: Update features list with subscription management.

## Prior features
### configurable-durations — COMPLETE
| Date | Wave | Phase | Notes |
|------|------|-------|-------|
| 2026-07-18 | 1–3 | ALL | 45/45 PASS. 2 evolution / 0 shortcut. Loop COMPLETE. |

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
- Specs: docs/shaping/polar-subscription/ (01–14)
- Build order: docs/shaping/polar-subscription/BUILD-ORDER.md
- Design prototypes: docs/shaping/polar-subscription/design/
- Shape: docs/shaping/polar-subscription/shape/polar-subscription-shape.md
- Slices: docs/shaping/polar-subscription/shape/polar-subscription-slices.md
- Spike: docs/shaping/polar-subscription/shape/spike-polar-checkout-customer.md
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
