# Polar Subscription — Shape

## Requirements

Analyzed all 15 specs (00–14) together. Requirements extracted from the specs and BUILD-ORDER.md.

| ID | Requirement | Source specs |
|----|------------|-------------|
| R0 | Polar SDK and Better Auth plugin installed and configured (server + client) | 02, 03, 04 |
| R1 | Shops table tracks subscription status via 4-state enum: `trialing`, `active`, `past_due`, `canceled` | 01 |
| R2 | Webhook events are idempotent — dedup table + timestamp guard prevent reprocessing | 01, 05 |
| R3 | New shops start with `trialing` status and a 14-day trial window | 06 |
| R4 | Dashboard access gated by subscription status — `requireShopAuth()` replaces `requireAuth()` | 07 |
| R5 | Canceled merchants cannot accept new bookings — public booking page shows "unavailable" | 08 |
| R6 | Expired trial or canceled status redirects merchant to a paywall page with checkout CTA | 09 |
| R7 | Post-checkout interstitial polls for `active` status before redirecting to dashboard | 10 |
| R8 | Past-due merchants see an in-app banner with "Update payment method" CTA | 11 |
| R9 | 8-email onboarding drip during 14-day trial, gated by setup progress | 12 |
| R10 | Paywall page reconciles with Polar API before rendering — corrects missed webhooks | 13 |
| R11 | Grace period emails for payment failure, recovery, and subscription end | 14 |

## Shape: Single Shape (no alternatives)

This feature has one viable shape. The Polar Better Auth plugin dictates the integration pattern. Stripe Connect is already implemented — Polar is a separate billing engine for the subscription layer only.

### Architecture additions

- **Polar** becomes a new external component (billing engine for subscriptions).
- **`requireShopAuth()`** becomes the primary auth function for all dashboard routes.
- **No `middleware.ts`** — gating stays in-route per existing invariant #11.
- **Webhook pattern** reuses the existing Stripe dedup pattern (transaction wraps dedup insert + state update).

### Key decisions

1. **`createCustomerOnSignUp: true`** — spike finding. Ensures Polar customer exists before checkout.
2. **4-state enum, not 5** — no `expired` state. Trial expiry is dynamic: `trialing` AND `now > trialEndsAt`.
3. **No middleware gating** — `requireShopAuth()` is a function call, not middleware. Matches existing `requireAuth()` pattern.
4. **Polar manages payment retries** — platform does not implement retry logic. `past_due` is informational.
5. **Fail-open for active merchants** — if DB is unreachable, `requireShopAuth()` lets merchants in and logs the error.
6. **Fail-closed for public bookings** — if DB is unreachable, booking page shows "unavailable."

## Fit Check

| R | Fit | Notes |
|---|-----|-------|
| R0 | PASS | Better Auth plugin pattern is documented. Two packages to install. |
| R1 | PASS | 4 columns + 1 enum + 1 dedup table. Single migration. |
| R2 | PASS | Reuses existing Stripe webhook dedup pattern exactly. |
| R3 | PASS | One-line addition to shop creation flow. Fallback handles existing shops. |
| R4 | PASS | New function in session.ts. Mechanical replacement across dashboard routes. |
| R5 | PASS | Inline check in booking page. Design prototype exists. |
| R6 | PASS | New page at `/app/billing/subscribe`. Design prototype exists. Two variants. |
| R7 | PASS | Client component with polling. Design prototype exists. Two states. |
| R8 | PASS | Layout-level conditional banner. Design prototype exists. |
| R9 | PASS | Hooks into existing `resolve-outcomes` cron. Follows existing email patterns. |
| R10 | PASS | Server-side Polar API call before rendering paywall. |
| R11 | PASS | Deferred calls from webhook handler. Follows existing email patterns. |

No conflicts with existing architecture. No unknowns remaining after spike.

## Signals applied

- **design-prototype-as-source-of-truth** — 4 UI design prototypes exist for specs 08, 09, 10, 11.
- **foundation-first-slicing** — schema + env + plugin before any consumer.
- **spike-before-shape** — spike 00 resolved before finalizing shape.
- **modifier-over-enum** — `isPastDue` boolean flag on `requireShopAuth()` return, not a separate state machine.
