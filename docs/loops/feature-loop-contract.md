# Feature Loop Contract

## Goal
Payouts-not-surfaced: surface live `payoutsEnabled` status on Stripe Connect settings page. 3 specs, 1 wave.

## Current state
- Feature: payouts-not-surfaced
- Wave: 1 of 1
- Phase: COMPLETE
- Specs in scope: docs/shaping/payouts-not-surfaced/ (P1, P2, P3)
- Build order: 3 specs, 2 phases, linear critical path (P1 → P2 → P3)

## Backlog
- Waves remaining: none (1 wave, all specs implemented)
- Blocked specs: none
- Design review: design prototype reviewed — `Payments Stripe Connect.html` provides exact tokens and copy

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| 2026-07-13 | — | SHAPE | — | 10 specs created from current-issues.md analysis. BUILD-ORDER + DESIGN-BRIEF written. Mock-ups received and approved. Verified 35 occurrences across 15 files (original estimate was 28/14). Shape doc, slices doc, wave-1 plan created. No spikes needed. |
| 2026-07-13 | 1 | IMPLEMENT | — | Single sweep: 25 replacements across 13 files. `pnpm check` clean. 4 deviations (all EVOLUTION): (1) `features-carousel.tsx` had `astro.app/book` URL not in spec → fixed to `showup.dev/book`, (2) `page.tsx` had 2 feature card descriptions with "Astro" not in spec → fixed, (3) `shop-details-step.tsx` had `astro.com/book/` demo URL not in spec → fixed to `showup.dev/book/`. Post-sweep grep confirms 0 "Astro"/"ASTRO" in Wave 1 scope. |
| 2026-07-14 | 1 | VERIFY+DRIFT+RETRO | — | Verification: 12/12 PASS (independent agent). Drift audit: 0 conflicts with Wave 2 specs. All remaining spec line numbers verified accurate. P4 spec inaccuracy noted (auth-origins.test.ts fixture URLs). 4 evolution / 0 shortcuts (0%). Retro: architecture updates applied (ui-context.md brand names, code-standards.md brand convention). No new patterns, no friction. |
| 2026-07-14 | 2 | IMPLEMENT | — | 3 specs implemented: P3-app-copy (2 tooltip replacements), P3-email-rebrand (5 string replacements + typography fix: headline letter-spacing, body max-width, footer font-size/color + brand footer "SHOWUP · Stop losing money to no-shows."), P4-internal-docs (7 replacements in project-overview.md). `pnpm check` clean. Post-sweep grep: 0 "Astro" in src/ except auth-origins.test.ts fixture URLs (excluded). |
| 2026-07-14 | 2 | VERIFY+DRIFT+RETRO | — | Verification: 20/20 PASS (independent agent). Drift: 0 divergences. Retro: current-issues.md rebrand + typography fix marked RESOLVED. Loop COMPLETE. |
| 2026-07-15 | 1 | SHAPE | — | payouts-not-surfaced: 3 specs (P1, P2, P3) + build-order aligned with design prototype (`Payments Stripe Connect.html`). 6 discrepancies fixed (label text, info box tokens, copy). No spikes needed. |
| 2026-07-15 | 1 | IMPLEMENT | — | 3 specs implemented sequentially (P1→P2→P3). P1: server-side `stripe.accounts.retrieve()` + prop. P2: conditional status row (green/neutral dot). P3: info box with design prototype tokens. `pnpm check` clean after each slice. 0 deviations. Modified files (2): `stripe-connect/page.tsx`, `stripe-connect-card.tsx`. |
| 2026-07-16 | 1 | VERIFY+DRIFT+RETRO | — | Verification: 14/14 PASS (independent agent). 4 Playwright + 10 code review. Drift: 0 divergences — all 3 specs match implementation exactly. Retro: architecture updates applied (invariant #18: no DB persistence for volatile Stripe flags; ui-context.md: ConnectedView info box pattern). 0 patterns, 0 friction. Loop COMPLETE. |

## Dependency graph
```
P0 (metadata) ──────────────────┐
P1-site-header ─────────────────┤
P1-auth-brand ──────────────────┤
P1-booking-nav ─────────────────┼──► [PR #1: P0+P1+P2] ──► P3-app-copy
P1-site-footer ─────────────────┤                      ──► P3-email-rebrand (+ typography fix)
P2-auth-cta ────────────────────┤                      ──► P4-internal-docs
P2-landing-copy ────────────────┘
```

## Critical path
Phase 1 (any spec) → P3-email-rebrand + typography fix (2 phases; email is bottleneck due to cross-dep)
Shortest path to brand consistency: Wave 1 alone (one PR, 21 replacements)

## Architecture context updates (apply in RETRO)
Queued in `docs/shaping/rebrand/BUILD-ORDER.md`:
1. project-overview.md: "Astro" → "ShowUp", "Astro Pro" → "ShowUp Pro" (7 replacements — this IS spec P4)
2. current-issues.md: mark "Full rebrand" resolved after Wave 1 ships
3. ui-context.md: product display name "ShowUp", uppercase "SHOWUP", plan name "ShowUp Pro"
4. code-standards.md: add brand name convention

## Prior features
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
- Specs: docs/shaping/rebrand/ (P0, P1×4, P2×2, P3×2, P4)
- Build order: docs/shaping/rebrand/BUILD-ORDER.md
- Design brief: docs/shaping/rebrand/DESIGN-BRIEF.md
- Mock-ups: docs/shaping/rebrand/Rebrand Mockups.html
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
- Mental models: mcp-go/Mental Models/WorkSpace/26-07-07_07-28-58_astro_to_showup_dev_rebrand/analysis-report.md
