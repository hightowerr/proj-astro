# Stripe Connect — Shaping Document

## Frame

### Source

17 implementation specs (`docs/shaping/stripe-connect/01-17`), 7 design briefs with interactive HTML mocks (`docs/shaping/stripe-connect/design/`), pre-existing build order with dependency graph (`_build-order.md`).

### Problem

- Customer booking deposits currently go to the **platform Stripe account**, not the shop owner's bank account. This is a placeholder — the product can't launch commercially until deposits route to merchants.
- Shop owners have no self-service way to connect their Stripe account. There's no UI, no onboarding flow, no status visibility.
- When deposits eventually route to merchants, the platform has no revenue mechanism (no fee collection).
- No guardrails exist to prevent deposits being attempted when a shop owner hasn't connected Stripe (currently hardcoded `paymentsEnabled={true}`).

### Outcome

- Customer deposits route directly to the shop owner's connected Stripe Express account on every booking.
- Platform collects a 50p flat fee per transaction as application fee revenue.
- Shop owners complete Stripe Express onboarding via a guided, psychology-informed flow within the app.
- Booking page dynamically enables/disables deposits based on Connect status (no broken payment states).
- Shop owner dashboard communicates Connect status with escalating urgency tied to real booking data.
- Refunds correctly reverse transfers and return platform fees.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| **R0** | Customer deposits route to the shop owner's connected Stripe Express account, not the platform account | Core goal |
| **R1** | Platform collects a 50p flat application fee per booking deposit | Must-have |
| **R2** | Shop owners complete Stripe Express onboarding via a guided in-app flow with progress feedback, return-from-Stripe reassurance, and completion celebration | Must-have |
| **R3** | Booking page only collects deposits when `stripeOnboardingStatus === "complete"` — otherwise books without payment, no broken states, no Stripe messaging to customers | Must-have |
| **R4** | Dashboard shows escalating, non-dismissible Connect prompts tied to real booking count — gated behind services + availability setup, with nav indicator dot | Must-have |
| **R5** | Refunds for Connect payments reverse the transfer and return the application fee; pre-Connect refunds work unchanged | Must-have |
| **R6** | Appointment detail shows fee breakdown (deposit / platform fee / payout) for Connect payments, distinguishes "no deposit (Stripe not connected)" from "no deposit (policy)" | Must-have |
| **R7** | Single re-engagement email sent 24–48h after abandoned onboarding, gated behind services + availability setup | Nice-to-have |
| **R8** | Connect webhook updates onboarding status; polling fallback for immediate post-Stripe-return verification | Must-have |

**R-to-spec mapping:**

| R | Primary specs | Design briefs |
|---|--------------|---------------|
| R0 | 01, 02, 12 | — |
| R1 | 12 | Brief 05 |
| R2 | 05, 06, 07, 08, 10 | Brief 01 |
| R3 | 03, 14 | Brief 04 |
| R4 | 11, 15, 17 | Briefs 02, 03 |
| R5 | 13 | — |
| R6 | 12 (fee visibility), 14 (deposit-skipped signal) | Brief 05 |
| R7 | 16 | Brief 06 |
| R8 | 04, 07, 09 | Brief 01 (State 2b) |

---

## A: Stripe Connect Express with destination charges (pre-selected)

The specs describe a single coherent shape. Alternative architectures (Stripe Connect Standard, Custom, or direct charges) were evaluated and rejected in the specs — rationale is documented in spec 12 ("Why destination charges").

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | **Schema + migration**: 3 columns on `shops` (`stripeAccountId`, `stripeOnboardingStatus` enum, `stripeAccountCreatedAt`), partial unique index, pgEnum | |
| **A2** | **Currency default**: USD → GBP in 3 locations (`appointments.ts` x2, `booking-form.tsx` x1) | |
| **A3** | **Env**: `STRIPE_CONNECT_WEBHOOK_SECRET` in env schema (optional dev, warn if missing) | |
| **A4** | **Create account API**: POST route creates Express account (`type: "express"`, `country: "GB"`, MCC 7241), persists `stripeAccountId`, returns Account Link URL. Idempotent (re-creates link for pending shops) | |
| **A5** | **Refresh link API**: GET route re-creates expired Account Links. Used as Stripe's `refresh_url` | |
| **A6** | **Status API**: GET route retrieves account from Stripe, returns `charges_enabled` / `payouts_enabled` / `details_submitted`. Updates local status if stale | |
| **A7** | **Dashboard link API**: GET route creates single-use Express Dashboard login link | |
| **A8** | **Connect webhook**: Separate endpoint for `account.updated` events, own signing secret, dedup via `processedStripeEvents`. Sets status to `complete` or reverts to `pending` on capability revocation | |
| **A9** | **Settings page (5 states)**: not_started → redirecting (1700ms) → pending (progress indicator) → verifying (pulsing dot, auto-poll 5s/12 max) → connected (al-pop celebration, account details card, next-step bridge) | |
| **A10** | **Nav link + indicator dot**: "Payments" in settings nav, 8px amber dot with glow ring when Connect incomplete, dot on hamburger in mobile, gated behind services + availability | |
| **A11** | **Destination charges**: `transfer_data.destination` + `application_fee_amount: 50` + `on_behalf_of` on PaymentIntents for connected shops. Fee waived if amount ≤ 50p | |
| **A12** | **Refund reverse**: `reverse_transfer: true` + `refund_application_fee: true` on Connect refunds. Checks `transfer_data` existence to avoid errors on pre-Connect payments | |
| **A13** | **Booking page guard**: `paymentsEnabled` driven by `stripeOnboardingStatus`. CTA changes ("Book & Pay" vs "Confirm booking"), confirmation copy adapts, `depositSkipped` metadata signals reason | |
| **A14** | **Dashboard Connect card (4-state)**: Tier 1 (navy, informational), Tier 2 (amber, loss-quantifying with booking count), Tier 2b (amber, pending with progress badge), Connected (green confirmation, then removed). Non-dismissible. Above SummaryCards | |
| **A15** | **Payment card (5-state)**: connect (ledger layout), waived, legacy, skipped (with connect CTA), policy. Right-aligned mono amounts | |
| **A16** | **Re-engagement email**: Resend template, sent once 24–48h after `stripeAccountCreatedAt` if still pending + services/availability configured. Cron job with advisory lock | |
| **A17** | **Prompt timing gate**: All prompts (dashboard card, nav dot, email) gated behind two `findFirst` queries — `eventTypes` (has active service) + `shopHours` (has availability). `shopHours` auto-seeded on creation so effectively gates on `hasServices`. No new column needed. No blocking modals | |

---

## Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Customer deposits route to shop owner's connected Stripe Express account | Core goal | ✅ |
| R1 | Platform collects 50p flat application fee per booking deposit | Must-have | ✅ |
| R2 | Guided onboarding with progress feedback, reassurance, celebration | Must-have | ✅ |
| R3 | Booking page deposits gated on Connect status, no broken states, no Stripe messaging to customers | Must-have | ✅ |
| R4 | Escalating dashboard prompts tied to real booking count, gated behind setup, nav indicator | Must-have | ✅ |
| R5 | Refunds reverse transfers and return fees; pre-Connect refunds unchanged | Must-have | ✅ |
| R6 | Fee breakdown per appointment; distinguish "not connected" from "policy" deposit skip | Must-have | ✅ |
| R7 | Single re-engagement email 24–48h after abandoned onboarding | Nice-to-have | ✅ |
| R8 | Webhook-driven status sync with polling fallback | Must-have | ✅ |

**Notes:**
- All requirements satisfied. A17 flag resolved by spike — `availabilityConfigured` derived from `shopHours.findFirst()` + `eventTypes.findFirst()`, no new column needed. See `spike-availability-gate.md`.

---

## Architecture Mapping — Conflicts & Alignments

| Area | Status | Detail |
|------|--------|--------|
| Stripe integration | ✅ Aligned | Stripe already in stack (v16.12.0). Express account creation, Account Links, and destination charges all available in the pinned API version (2024-06-20) |
| Webhook infrastructure | ✅ Aligned | `processedStripeEvents` dedup table reusable. New endpoint needed (separate signing secret for Connect events) — same pattern as existing `/api/stripe/webhook` |
| Env validation | ✅ Aligned | Zod schema in `src/lib/env.ts`. Adding optional var follows existing pattern |
| Auth | ✅ Aligned | `requireAuth()` pattern used by all settings routes. New Connect routes follow same pattern |
| PaymentIntent creation | ✅ Aligned | Existing code in `src/lib/queries/appointments.ts:1098-1116`. Spec 12 modifies in-place |
| Refund flow | ✅ Aligned | Existing code in `src/lib/stripe-refund.ts:186`. Spec 13 modifies in-place |
| Cron infrastructure | ✅ Aligned | Advisory lock pattern, Vercel Cron scheduling. New job for re-engagement email follows same pattern |
| Email | ✅ Aligned | Resend already configured. Existing email templates provide pattern to follow |
| Booking page | ✅ Aligned | `paymentsEnabled` prop already exists (hardcoded `true`). Guard simply makes it dynamic |
| Settings pages | ✅ Aligned | Billing + Calendar settings pages provide layout pattern |
| Dashboard | ✅ Aligned | SummaryCards pattern exists. New card goes above the grid |
| Nav | ✅ Aligned | Settings section in app-nav.tsx. Adding a link follows existing pattern |
| Schema / migrations | ✅ Aligned | Drizzle ORM + migration pattern. Adding columns to `shops` is standard |
| **Stripe API version** | ⚠️ Flag | Pinned to `2024-06-20` (architecture risk #3). Connect Express endpoints exist in this version but should verify no behavioral differences with newer versions |
| **`availabilityConfigured`** | ✅ Resolved | No field needed. Derived from `shopHours.findFirst()` + `eventTypes.findFirst()`. `shopHours` auto-seeded; real gate is `hasServices`. See `spike-availability-gate.md` |
| **Stripe Elements theme** | ℹ️ Known issue | Current issue: "Stripe Elements appearance still uses Deep Ledger." Not blocking Connect but the payment form will look inconsistent with AL design system |

---

## Spikes (Completed)

### Spike 1: `availabilityConfigured` source of truth

| # | Question |
|---|----------|
| **S1-Q1** | Does `availabilityConfigured` (or equivalent boolean) exist on the `shops` table in the Drizzle schema? |
| **S1-Q2** | If not, how is "availability configured" determined today? Is it derivable from `shopHours` records existing? |
| **S1-Q3** | What's the simplest gate condition for "owner has set up availability"? |

**Acceptance:** We can describe how to check if a shop has availability configured, and whether it requires a new column or a query.

### Spike 2: Email template pattern

| # | Question |
|---|----------|
| **S2-Q1** | What existing email templates exist in the codebase? Where do they live? |
| **S2-Q2** | Is there a template rendering pattern (React Email, HTML strings, Resend templates)? |
| **S2-Q3** | What's the existing cron job file structure for scheduled emails (`send-email-reminders`)? |

**Acceptance:** We can describe the exact steps to add a new transactional email template + cron job.

### Spike 3: Booking page `paymentsEnabled` threading

| # | Question |
|---|----------|
| **S3-Q1** | Confirm `paymentsEnabled={true}` appears in the 3 locations spec 14 claims (lines 79, 111, 158 of `src/app/book/[slug]/page.tsx`) |
| **S3-Q2** | Does `getShopBySlug()` use explicit column selection? If so, what columns? |
| **S3-Q3** | How does `booking-form.tsx` branch on `paymentsEnabled`? (spec claims line 759) |

**Acceptance:** We can confirm the exact change locations and whether the existing code handles `paymentsEnabled=false` gracefully.
