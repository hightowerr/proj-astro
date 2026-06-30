# Stripe Connect — Build Order

## Dependency Graph

```
01 schema ──┬── 05 api-create-account ── 06 api-refresh ─┐
            ├── 07 api-status ───────────────────────────┼── 10 ui-settings ── 11 nav-link
            ├── 08 api-dashboard ────────────────────────┘
            ├── 09 webhook (also needs 04)
            ├── 12 payment-destination ── 13 refund-reverse
            ├── 14 guard-booking-page
            ├── 15 guard-dashboard-warning (also needs 17)
            ├── 16 email-connect-abandoned (also needs 05)
            └── 17 connect-prompt-timing (also needs 10, 15)

02 migration (parallel with 01, applied together)

03 currency-gbp (independent)

04 env-webhook-secret ── 09 webhook
```

## Phased Build Order

### Phase 1 — Foundation (no dependencies, all parallel)

| Spec | Description | Files |
|------|-------------|-------|
| 01 | Schema: Connect columns | `src/lib/schema.ts` |
| 02 | Migration: Connect columns | `drizzle/0035_stripe_connect.sql` |
| 03 | Currency: USD to GBP | `src/lib/queries/appointments.ts`, `src/components/booking/booking-form.tsx` |
| 04 | Env: Connect webhook secret | `src/lib/env.ts`, `env.example` |

### Phase 2 — API Routes + Core Logic (depends on Phase 1)

| Spec | Description | Files |
|------|-------------|-------|
| 05 | API: Create Connect account | `src/app/api/settings/stripe-connect/create-account/route.ts` (new) |
| 07 | API: Connect status | `src/app/api/settings/stripe-connect/status/route.ts` (new) |
| 08 | API: Connect dashboard | `src/app/api/settings/stripe-connect/dashboard/route.ts` (new) |
| 09 | Webhook: account.updated | `src/app/api/stripe/connect-webhook/route.ts` (new) |
| 12 | Payment: Destination charges + fee visibility | `src/lib/queries/appointments.ts` |
| 14 | Guard: Booking page + deposit-skipped signal | `src/app/book/[slug]/page.tsx` |

### Phase 3 — UI + Dependent Features (depends on Phase 2)

| Spec | Description | Files |
|------|-------------|-------|
| 06 | API: Refresh Connect link | `src/app/api/settings/stripe-connect/refresh/route.ts` (new) |
| 10 | UI: Stripe Connect settings (5 states) | `src/app/app/settings/stripe-connect/page.tsx` (new), `src/components/settings/stripe-connect-card.tsx` (new) |
| 13 | Refund: Reverse transfer | `src/lib/stripe-refund.ts` |
| 15 | Guard: Dashboard Connect card (4-state) | `src/app/app/dashboard/page.tsx` |
| 17 | Connect prompt timing (gate logic) | Dashboard + nav integration |

### Phase 4 — Polish + Re-engagement (depends on Phase 3)

| Spec | Description | Files |
|------|-------------|-------|
| 11 | Nav: Settings link + indicator dot | `src/components/app/app-nav.tsx` |
| 16 | Email: Abandoned onboarding (24h) | Cron job / background worker, Resend template |

## Critical Path

```
01 schema → 05 api-create-account → 10 ui-settings → 11 nav-link
```

Longest sequential chain: **4 specs across 4 phases**.

Secondary critical paths:
```
01 schema → 12 payment-destination → 13 refund-reverse
01 schema → 05 api-create-account → 16 email-connect-abandoned
```

## Design Files

Design briefs and interactive HTML mocks live in `design/`:

| Brief | Mock file | Screenshots |
|-------|-----------|-------------|
| `design-00-overview.md` | — | — |
| `design-01-settings-stripe-connect.md` | `Payments Stripe Connect.dc.html` | `screenshots/connected.png` |
| `design-02-dashboard-connect-card.md` | `Dashboard Connect Card.dc.html` | — |
| `design-03-nav-payments-indicator.md` | `App Navigation.dc.html` | — |
| `design-04-booking-deposit-states.md` | `Booking Deposit States.dc.html` | — |
| `design-05-appointment-fee-breakdown.md` | `Appointment Fee Breakdown.dc.html` | `screenshots/mobile.png`, `screenshots/mobile2.png` |
| `design-06-email-connect-reengagement.md` | `Email Connect Reengagement.dc.html` | — |

Mocks are interactive HTML components (`.dc.html`) with state toggles — open directly in a browser for live preview.

## UX-Driven Changes Summary

| Spec | Change | Psychology Principle | Design ref |
|------|--------|---------------------|------------|
| 05 | Transition state with 1700ms minimum display time | Labor Illusion (Wise) | Brief 01 |
| 10 | 5 visual states (not_started → redirecting → pending → verifying → connected), reframed copy, progress indicator with al-pop/al-ring animations, next-step bridge, celebrate mode | The Promised Land, Framing, Labor Illusion, Post-Purchase Reassurance, Peak-End Rule, Successful Transitions, Goal Gradient | Brief 01 |
| 11 | Indicator dot (8px, amber, glow ring) on nav + hamburger; highlighted drawer state; aria-label with setup status | Wayfinding, Feedback Loops | Brief 03 |
| 12 | 5-state payment card (connect/waived/legacy/skipped/policy) with Stripe Connect badge, ledger layout, right-aligned mono amounts | System 1/System 2 (Blinkist), Feedback Loops | Brief 05 |
| 14 | Customer-facing UX: CTA label changes, confirmation screen variants, reassurance text, no Stripe messaging to customers | Cognitive Load, Trust | Brief 04 |
| 15 | 4-state dashboard card (Tier 1 navy, Tier 2 amber, Tier 2b pending with progress badge, connected green banner); placed above SummaryCards; not dismissible | Habituation, Banner Blindness, Loss Aversion, User-Driven Prompts, Goal Gradient | Brief 02 |
| 16 | Full email layout: logo, headline sizing, gradient-CTA button, dark mode tokens, responsive (600px/392px), plain text fallback, template key | Zeigarnik Effect (Duolingo), Goal Gradient | Brief 06 |
| 17 | Prompt timing gate with 4-state progressive urgency | User-Driven Prompts (Hopper), Endowment Effect (Trello), Reactance | Brief 02 |

## Post-Implementation Checklist

1. Set live Stripe keys in Vercel (Production env only)
2. Register Connect webhook: `https://showup.dev/api/stripe/connect-webhook` for `account.updated`
3. Complete kicksnare Express onboarding via `/app/settings/stripe-connect`
4. Make one real booking with a real card (small deposit)
5. Verify transfer appears in connected account balance
6. Verify appointment detail shows deposit / platform fee / net payout breakdown
7. Cancel and verify reverse transfer + application fee refund
8. Verify dashboard warning shows booking count when Connect is incomplete
9. Wait 24h (or manually trigger cron) and verify re-engagement email sends for pending status
10. Run `pnpm vitest` to confirm existing tests pass
