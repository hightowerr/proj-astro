# ShowUp

A B2B SaaS platform that protects service businesses from no-show revenue loss through automated scoring, tier-based deposit policies, and slot recovery. Two distinct customer lifecycles: the merchant (SaaS subscriber) and the end-customer (appointment booker).

## Merchant Lifecycle

**Merchant**:
The salon owner, barber, PT, or service provider who subscribes to ShowUp Pro. The paying user of the SaaS.
_Avoid_: User (ambiguous with end-customer), client, provider

**Trial**:
A 14-day period of full access beginning at shop creation, no credit card required. ShowUp-managed — no Polar involvement during the trial. Tracked via `trialEndsAt` on the shop (set at shop creation as `createdAt + 14 days`). Polar only enters the picture when the merchant clicks "Subscribe" on the paywall.
_Avoid_: Free tier, freemium, Polar trial (Polar has native trials but ShowUp doesn't use them)

**Soft Lock**:
The state a shop enters when `subscriptionStatus = 'canceled'`. Only `canceled` triggers soft lock — `past_due` does not. New bookings are blocked (booking page shows "temporarily unavailable"). Config changes blocked. Existing appointments complete their full lifecycle — reminders, confirmations, outcomes, deposits, refunds, and scoring all continue. Dashboard redirects to paywall via `requireShopAuth()`. All background jobs run uninterrupted for in-flight appointments.
_Avoid_: Hard lock, account freeze, deactivation

**Subscription Status**:
The merchant's billing state, stored on the `shops` table. One of: `trialing`, `active`, `past_due`, `canceled`. Mirrors Polar's state machine exactly. `trialing` is ShowUp-managed (no Polar involvement); the other three are Polar-driven via webhooks. Gated by `requireShopAuth()` on all dashboard routes.
_Avoid_: Plan status, account status, `expired` (not a Polar state — use `canceled`), `cancelled` (British spelling — Polar uses American)

**Past Due**:
A subscription state triggered when the merchant's payment method fails on renewal. Polar manages the retry window (4 retries over 21 days). Full dashboard access with an in-app banner ("Your payment failed — update your card"). Booking page stays live. If all retries fail, Polar revokes the subscription → `canceled` (soft lock activates). ShowUp does not manage its own grace period.
_Avoid_: Payment failed (that's the event, not the state), grace period (Polar owns it)

**Reactivation**:
When a soft-locked merchant subscribes (or resubscribes). Merchant goes through Polar checkout again — no special reactivation flow. Polar fires `onSubscriptionActive`, webhook sets `subscriptionStatus = 'active'`, booking page goes live immediately. All data preserved: customers, scores, history, policies, Stripe Connect, calendar connection. No re-onboarding required. Polar reuses the existing customer record (matched via `externalId` = Better Auth user ID).
_Avoid_: Resubscribe (the action), restore

**Canceled**:
Terminal subscription state. Covers two distinct scenarios: (1) trial expired without subscribing (`polarCustomerId = NULL`), and (2) actual subscription ended — either merchant-initiated cancellation after period end, or Polar revocation after failed payment retries (`polarCustomerId` present). Both result in soft lock. Distinguishable by the presence of `polarCustomerId`.
_Avoid_: Expired (not a Polar state), deactivated

## End-Customer Lifecycle

**End-Customer**:
The person who books an appointment at a merchant's shop. Identified by phone number and email, scoped to a single shop in the current model. No login, no account — managed via one-time manage link tokens.
_Avoid_: Customer (ambiguous without qualifier when discussing both lifecycles), user, client

**Platform Identity**:
A platform-wide customer record keyed on phone number, independent of any shop. Silently created on first booking (day one). Not exposed to end-customers until cross-vertical scoring is activated. Shop-level `customers` rows link to it via `platformCustomerId` FK. Legal basis: legitimate interest (fraud prevention, service quality) for Phase 1; explicit consent for Phase 2 (score portability).
_Avoid_: Customer account, user account, profile

**Reliability Score**:
A 0-100 integer measuring an end-customer's attendance reliability. Currently shop-scoped (180-day rolling window). Long-term: aggregated cross-shop via platform identity. Drives tier assignment and deposit amounts.
_Avoid_: Trust score, reputation score, credit score

## Billing & Payments

**Polar**:
The billing engine for merchant SaaS subscriptions. Integrates with Better Auth via plugin system. Handles checkout, customer portal, subscription lifecycle, and webhooks. Polar customer created at checkout time (not at signup). `polarCustomerId` stored on `shops` table. Separate from Stripe (which handles appointment deposit payments via Connect).
_Avoid_: Stripe Billing (that's a different product, not used)

**Stripe Connect**:
Handles appointment deposit payments between end-customers and merchants. Express accounts, GBP, card payments + transfers. Stays active even when merchant is soft-locked — existing deposits settle normally, refunds still work. New payment intents blocked by soft lock (no new bookings).
_Avoid_: Stripe (too generic — Stripe is also the parent company of Connect)

## Messaging

**Onboarding Drip**:
A 7-email sequence sent during the 14-day trial, guiding merchants through setup. Hybrid trigger: time-driven schedule (day 1, 3, 5, 7, 10, 12, 14) with completion gates (skip if step already done). Piggybacked on the existing `resolve-outcomes` cron job. Email only, via Resend.
_Avoid_: Marketing emails, nurture sequence, campaign

**Merchant Transactional Message**:
Email-only messages to merchants about their SaaS subscription state: welcome, trial warning (day 12), trial expired (day 14), payment failed, subscription canceled, subscription renewed. Sent via Resend. Not SMS. Trial warning and trial expired ship with the drip in Phase 2; payment failed and renewal receipt are Phase 3.
_Avoid_: Notification (too vague), alert
