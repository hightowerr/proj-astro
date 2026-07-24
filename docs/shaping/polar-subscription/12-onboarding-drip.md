# 12 — Onboarding Drip

## Summary
8-email sequence during the 14-day trial. Time-driven schedule with completion gates. Piggybacked on `resolve-outcomes` cron, runs after advisory lock release.

## Prerequisites
- **01-schema-migration** — needs `subscriptionStatus` to query trialing shops
- **06-trial-initialization** — shops must have `trialEndsAt` set

## Changes

### `src/lib/onboarding-drips.ts` (new file)
- `processOnboardingDrips()` function:
  1. Query shops WHERE `subscriptionStatus = 'trialing'`
  2. For each shop, calculate `trialDay = daysSince(shop.createdAt)`
  3. Check completion gates per drip:
     - Day 1: welcome — always send
     - Day 3: "Connect Stripe" — skip if `stripeOnboardingStatus = 'complete'`
     - Day 5: "Create services" — skip if shop has event types
     - Day 7: "Set policies" — skip if shop policies exist
     - Day 10: "Share your link" — skip if shop has appointments
     - Day 12: "2 days left" — always send (trial warning, not onboarding)
     - Day 13: "Last call" — always send (final trial warning)
     - Day 14: "Trial expired" — always send (trial expired notice)
  4. Dedup via `messageLog` — check if this drip already sent for this shop
  5. Send via Resend
  6. Log to `messageLog`

### `src/app/api/jobs/resolve-outcomes/route.ts`
- After advisory lock release, add: `await processOnboardingDrips()`
- Drip runs outside the lock — failures don't affect outcome resolution

### Email content reference

All emails reference these values:

| Field | Value |
|-------|-------|
| Plan name | ShowUp Pro |
| Monthly price | $49/month |
| Annual price | ~$39/month (20% discount) |
| Trial length | 14 days, no credit card required |
| Upgrade URL | `/app/billing/subscribe` (paywall with Subscribe CTA) |

**What happens at trial expiry:** Immediate soft lock. No grace period. `requireShopAuth()` redirects merchant to `/app/billing/subscribe`. Public booking page shows "Online booking is temporarily unavailable." There is no persisted `expired` state — expiry is detected dynamically (`now > trialEndsAt` while status is still `trialing`).

### Email content per day

| Day | Subject | Label | Heading | Body summary | CTA label | CTA URL |
|-----|---------|-------|---------|-------------|-----------|---------|
| 1 | Welcome to ShowUp | WELCOME TO SHOWUP | Stop losing money to no-shows. | 14-day trial started, no card required. Includes 3-step setup list (Connect Stripe, Add services, Set deposit policy). | Connect your Stripe account | `/app/settings/stripe-connect` |
| 3 | Finish your Stripe setup | STEP 1 OF 3 | One step from taking deposits. | ShowUp needs Stripe to send deposit money. Connect once, every deposit/refund/payout handled. "Held after each booking. Settled after the visit." | Finish Stripe setup | `/app/settings/stripe-connect` |
| 5 | Add your first service | STEP 2 OF 3 | Give clients something to book. | Booking page is live but catalog is empty. Add services (name, duration, price). "Start with your three most-booked services." | Add your first service | `/app/settings/services` |
| 7 | Set your deposit policy | STEP 3 OF 3 | Your money, your rules. | ShowUp buckets customers by reliability (Top, Neutral, Risk). Suggests starting point: 0% Top, 25% Neutral, 100% Risk. "Two minutes. Adjustable any time." | Set your deposit policy | `/app/settings/payment-policy` |
| 10 | Share your booking page | YOU'RE SET UP | Open the doors. | Setup complete. "Put your booking link in your Instagram bio, your Google Business profile, and your voicemail." | Share your booking page | `/app` |
| 12 | Your trial ends in 2 days | TRIAL ENDS IN 2 DAYS | Two days left of protection. | Trial ends on {{trialEndDate}}. After that, booking page pauses and deposits stop. Pricing: $49/mo or $39/mo annual. "One covered no-show pays for the month." | Subscribe to ShowUp Pro | `/app/billing/subscribe` |
| 13 | Last day of your trial | TRIAL ENDS TOMORROW | Last call. | Last day — trial ends **tomorrow**. Booking page shows "temporarily unavailable", deposits stop, cancelled slots stay empty. Pricing: $49/mo or $39/mo annual. "One click now, zero interruption tomorrow." | Subscribe to ShowUp Pro | `/app/billing/subscribe` |
| 14 | Your trial has ended | TRIAL EXPIRED | Your shop is paused. | 14-day trial ended today. Booking page shows "Online booking is temporarily unavailable", no new deposits. "**Nothing has been deleted.** Your services, policies, and customer scores are exactly as you left them." Pricing: $49/mo or $39/mo annual. | Reactivate your shop | `/app/billing/subscribe` |

Days 1–10 push setup progress (each CTA matches the next completion gate). Days 12–14 push conversion.

Template variables: `{{firstName}}`, `{{trialEndDate}}`, `{{shopName}}`

Footer: "You're receiving this because you started a ShowUp trial for {{shopName}}. Unsubscribe · Email preferences. ShowUp Ltd · 18 Percy Street, London W1T 1DX"

### Email templates
- 8 templates via Resend (can be plain text initially, styled later)

### Design
- Prototypes: [`design/emails/`](design/emails/)
  - [`day-01-welcome.html`](design/emails/day-01-welcome.html)
  - [`day-03-connect-stripe.html`](design/emails/day-03-connect-stripe.html)
  - [`day-05-create-services.html`](design/emails/day-05-create-services.html)
  - [`day-07-set-policies.html`](design/emails/day-07-set-policies.html)
  - [`day-10-share-link.html`](design/emails/day-10-share-link.html)
  - [`day-12-trial-warning.html`](design/emails/day-12-trial-warning.html)
  - [`day-13-last-chance.html`](design/emails/day-13-last-chance.html)
  - [`day-14-trial-expired.html`](design/emails/day-14-trial-expired.html)

### Pages impacted
- None (email only)
