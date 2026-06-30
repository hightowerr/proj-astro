# Stripe Connect — Slices

Derived from `_build-order.md` dependency graph, validated against `architecture-context.md` and spike findings.

---

## Wave Structure

4 waves, 17 specs. Each wave's specs can run in parallel (no inter-dependencies within a wave). Waves are sequential.

```
Wave 1 (Foundation)     →  Wave 2 (API + Core)      →  Wave 3 (UI + Dependent)  →  Wave 4 (Polish)
01, 02, 03, 04             05, 07, 08, 09, 12, 14      06, 10, 13, 15, 17          11, 16
schema, migration,         create-account, status,      refresh-link, settings,     nav-link,
currency, env              dashboard-link, webhook,     refund, dashboard-card,     email
                           payment-routing, guard        prompt-timing
```

Critical path: `01 → 05 → 10 → 11` (4 specs across 4 phases)

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **W1-S1: Schema + Migration**<br>⏳ PENDING<br><br>• `shops` table: 3 new columns<br>• pgEnum `stripe_onboarding_status`<br>• Partial unique index<br>• SQL migration file<br><br>*Demo: `drizzle-kit push` succeeds, types updated* | **W1-S2: Currency + Env**<br>⏳ PENDING<br><br>• USD → GBP in 3 locations<br>• `STRIPE_CONNECT_WEBHOOK_SECRET` env var<br>• env.ts Zod schema update<br>• env.example update<br><br>*Demo: New shop defaults to GBP, app starts with/without env var* | **W2-S1: Account Lifecycle APIs**<br>⏳ PENDING<br><br>• POST create-account (Express, GB, MCC 7241)<br>• GET status (retrieve + sync)<br>• GET dashboard (login link)<br>• Idempotent re-creation for pending shops<br><br>*Demo: API creates Express account on Stripe, returns Account Link URL* |
| **W2-S2: Webhook + Env Wire-up**<br>⏳ PENDING<br><br>• Connect webhook endpoint<br>• `account.updated` handler<br>• Dedup via `processedStripeEvents`<br>• Status sync (complete ↔ pending)<br><br>*Demo: Webhook fires on account update, DB status changes* | **W2-S3: Payment Routing**<br>⏳ PENDING<br><br>• `transfer_data.destination` on PaymentIntents<br>• `application_fee_amount: 50`<br>• `on_behalf_of` for merchant receipts<br>• Fee waiver for ≤50p amounts<br><br>*Demo: PaymentIntent in Stripe shows transfer to connected account + 50p fee* | **W2-S4: Booking Guard**<br>⏳ PENDING<br><br>• `paymentsEnabled` driven by `stripeOnboardingStatus`<br>• 3 locations in page.tsx<br>• `depositSkipped` metadata signal<br>• CTA label: "Book & Pay" vs "Confirm booking"<br><br>*Demo: Unconnected shop shows free booking flow; connected shop shows payment* |
| **W3-S1: Settings Page (5 states)**<br>⏳ PENDING<br><br>• Page shell ("Payments")<br>• not_started → redirecting (1700ms)<br>• pending (progress indicator)<br>• verifying (pulsing dot, auto-poll)<br>• connected (al-pop, bridge link)<br><br>*Demo: Full onboarding flow through all 5 states* | **W3-S2: Refresh Link API**<br>⏳ PENDING<br><br>• GET refresh route<br>• Re-creates expired Account Links<br>• Redirect to Stripe onboarding<br>• Error handling (no account)<br><br>*Demo: Expired link redirects through refresh to Stripe* | **W3-S3: Refund Reverse**<br>⏳ PENDING<br><br>• `reverse_transfer: true` for Connect refunds<br>• `refund_application_fee: true`<br>• Retrieve PaymentIntent to check `transfer_data`<br>• Pre-Connect refunds unchanged<br><br>*Demo: Refund reverses transfer in Stripe, fee returned* |
| **W3-S4: Dashboard Card + Timing**<br>⏳ PENDING<br><br>• 4-state card (Tier 1/2/2b/connected)<br>• Placement above SummaryCards<br>• Booking count query<br>• Gate: `hasServices AND hasAvailability`<br>• Non-dismissible<br><br>*Demo: Dashboard shows correct tier based on shop state* | **W3-S5: Fee Breakdown**<br>⏳ PENDING<br><br>• 5-state payment card on appointment detail<br>• connect/waived/legacy/skipped/policy<br>• Right-aligned mono ledger layout<br>• Deposit-skipped signal display<br><br>*Demo: Appointment detail shows fee breakdown or deposit-skipped notice* | **W4-S1: Nav Link + Indicator**<br>⏳ PENDING<br><br>• "Payments" in settings nav<br>• 8px amber dot with glow ring<br>• Dot on hamburger (mobile)<br>• Gated behind services + availability<br>• aria-label with status<br><br>*Demo: Nav shows "Payments" with dot when Connect incomplete* |
| **W4-S2: Re-engagement Email**<br>⏳ PENDING<br><br>• Cron job with advisory lock<br>• Query pending shops 24–48h old<br>• Inline HTML email via Resend<br>• `connectReengagementSentAt` tracking<br>• Gate: services + availability<br><br>*Demo: Email sent for pending shop, not sent for completed/recent/gated* | | |

---

## Wave Details

### Wave 1 — Foundation (2 slices, all parallel)

**W1-S1: Schema + Migration** (specs 01, 02)

| File | Change |
|------|--------|
| `src/lib/schema.ts` | Add `stripeAccountId`, `stripeOnboardingStatus` (pgEnum), `stripeAccountCreatedAt` to `shops`; partial unique index |
| `drizzle/0035_stripe_connect.sql` | CREATE TYPE, ALTER TABLE, CREATE UNIQUE INDEX |
| `drizzle/meta/_journal.json` | Add migration entry |

Acceptance:
- Migration runs cleanly on fresh and existing DBs
- `shops.$inferSelect` / `shops.$inferInsert` include new fields
- Existing shops get `stripeOnboardingStatus = 'not_started'`, null for others
- TypeScript types reflect new columns

**W1-S2: Currency + Env** (specs 03, 04)

| File | Change |
|------|--------|
| `src/lib/queries/appointments.ts:51` | `DEFAULT_PAYMENT_POLICY.currency`: USD → GBP |
| `src/lib/queries/appointments.ts:802` | `let currency = "USD"` → `"GBP"` |
| `src/components/booking/booking-form.tsx:445` | `useState("USD")` → `useState("GBP")` |
| `src/lib/env.ts` | Add `STRIPE_CONNECT_WEBHOOK_SECRET` (optional) |
| `env.example` | Add `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...` |

Acceptance:
- New shops default to GBP; existing shops retain their currency
- App starts without `STRIPE_CONNECT_WEBHOOK_SECRET` set
- `checkEnv()` warns if missing in development

---

### Wave 2 — API Routes + Core Logic (4 slices, all parallel)

**W2-S1: Account Lifecycle APIs** (specs 05, 07, 08)

| File | Change |
|------|--------|
| `src/app/api/settings/stripe-connect/create-account/route.ts` | NEW — POST, creates Express account or re-creates Account Link |
| `src/app/api/settings/stripe-connect/status/route.ts` | NEW — GET, retrieves status from Stripe, syncs local DB |
| `src/app/api/settings/stripe-connect/dashboard/route.ts` | NEW — GET, creates Express Dashboard login link |

Acceptance:
- Create: Express account created on Stripe with correct params (type: express, country: GB, MCC 7241)
- Create: Idempotent — pending shop gets new Account Link, not new account
- Create: Complete shop gets login link URL instead
- Status: Returns accurate `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`
- Status: Updates local status if stale
- Dashboard: Returns valid Express Dashboard URL for complete shops; 400 for others

**W2-S2: Webhook** (spec 09; depends on spec 04 env)

| File | Change |
|------|--------|
| `src/app/api/stripe/connect-webhook/route.ts` | NEW — `account.updated` handler with Connect-specific signing secret |

Acceptance:
- Signature verified using `STRIPE_CONNECT_WEBHOOK_SECRET`
- `charges_enabled && details_submitted` → status `complete`
- Capability revocation → status `pending`
- Dedup via `processedStripeEvents`
- Unknown `stripeAccountId` → log warning, return 200

**W2-S3: Payment Routing** (spec 12)

| File | Change |
|------|--------|
| `src/lib/queries/appointments.ts:1098-1116` | Add `transfer_data`, `application_fee_amount`, `on_behalf_of` to PaymentIntent creation |

Acceptance:
- Connected shops: PaymentIntent includes `transfer_data.destination` + `application_fee_amount: 50` + `on_behalf_of`
- Non-connected shops: PaymentIntent created without `transfer_data` (fallback)
- ≤50p deposits: fee waived
- Application fee amount stored/retrievable for appointment detail display
- Mock path unchanged

**W2-S4: Booking Guard** (spec 14)

| File | Change |
|------|--------|
| `src/app/book/[slug]/page.tsx:79,111,158` | `paymentsEnabled={true}` → `paymentsEnabled={canAcceptPayments}` where `canAcceptPayments = shop.stripeOnboardingStatus === "complete"` |

No change needed to `getShopBySlug()` — returns all columns already (spike confirmed).

Acceptance:
- Connected shops: payment form shown, "Book & Pay {amount}" CTA
- Non-connected shops: free booking, "Confirm booking" CTA, no card form
- No Stripe messaging visible to customers in either path
- `depositSkipped: "connect_not_complete"` metadata on appointments created without deposit due to Connect status
- Confirmation screen adapts copy

---

### Wave 3 — UI + Dependent Features (5 slices)

**W3-S1: Settings Page** (spec 10; depends on W2-S1 APIs)

| File | Change |
|------|--------|
| `src/app/app/settings/stripe-connect/page.tsx` | NEW — server component, auth + shop lookup |
| `src/components/settings/stripe-connect-card.tsx` | NEW — client component, 5 visual states |

Acceptance:
- 5 states render correctly (not_started, redirecting, pending, verifying, connected)
- Redirecting: spinner (30px, al-spin 0.8s), minimum 1700ms display
- Pending: 3-step progress indicator, solid/dashed connecting lines
- Verifying: pulsing dot (al-ring + al-pulsedot), auto-poll 5s/12 max, no CTA
- Connected: al-pop checkmark bounce, account details card, ghost Stripe Dashboard button, bridge link
- Celebrate mode: once per session on first transition to connected
- Responsive: vertical progress on mobile
- ARIA: progressbar, aria-live, heading hierarchy

**W3-S2: Refresh Link API** (spec 06; depends on W2-S1)

| File | Change |
|------|--------|
| `src/app/api/settings/stripe-connect/refresh/route.ts` | NEW — GET, creates fresh Account Link, redirects to Stripe |

Acceptance:
- Expired Account Link redirects user here via Stripe's `refresh_url`
- Fresh link generated and user redirected to Stripe
- No `stripeAccountId` → redirect to settings with error param

**W3-S3: Refund Reverse** (spec 13; depends on W2-S3 payment routing)

| File | Change |
|------|--------|
| `src/lib/stripe-refund.ts:186` | Add `reverse_transfer: true`, `refund_application_fee: true` for Connect payments |

Acceptance:
- Connect payment refund: includes `reverse_transfer` + `refund_application_fee`
- Pre-Connect payment refund: works unchanged (no `reverse_transfer`)
- Connected account balance debited
- 50p application fee returned to customer

**W3-S4: Dashboard Card + Timing** (specs 15, 17)

| File | Change |
|------|--------|
| `src/app/app/dashboard/page.tsx` | Add Connect card component above SummaryCards |
| Component file (new) | 4-state card: Tier 1 (navy), Tier 2 (amber + count), Tier 2b (pending), connected (green) |

Acceptance:
- Tier 1: shown when gate conditions met + no bookings (navy, informational)
- Tier 2: shown when bookings exist without deposits (amber, count in mono)
- Tier 2b: shown when `stripeOnboardingStatus === "pending"` (amber, progress badge)
- Connected: brief green banner on first load, then removed
- NOT shown before services + availability configured (gate query: `eventTypes.findFirst` + `shopHours.findFirst`)
- Non-dismissible
- Above SummaryCards grid, full width
- Links to `/app/settings/stripe-connect`

**W3-S5: Fee Breakdown** (spec 12 UI portion; depends on W2-S3 + W2-S4 for `depositSkipped`)

| File | Change |
|------|--------|
| `src/app/app/appointments/[id]/page.tsx` (or component) | Update Payment card section with 5-state rendering |

Acceptance:
- `connect`: ledger layout (Deposit / Platform fee / Your payout) with right-aligned mono amounts, Stripe Connect badge
- `waived`: "Waived" italic for fee, full payout amount
- `legacy`: simple "Amount" display, no badge, no breakdown
- `skipped`: "No deposit collected" notice + "Connect Stripe" link (if still not connected)
- `policy`: "No deposit required" notice
- Correct state selected based on payment data + `depositSkipped` metadata

---

### Wave 4 — Polish + Re-engagement (2 slices)

**W4-S1: Nav Link + Indicator** (spec 11; depends on W3-S1 settings page + W3-S4 timing gate)

| File | Change |
|------|--------|
| `src/components/app/app-nav.tsx` | Add "Payments" link + conditional indicator dot |

Acceptance:
- "Payments" link in settings section with `credit_card` icon
- Active state: gradient background + filled icon
- 8px amber dot with glow ring when Connect incomplete AND gate conditions met
- Dot disappears when `stripeOnboardingStatus === "complete"`
- Mobile: dot on hamburger button, highlighted amber tint in drawer
- `aria-label="Payments (setup required)"` when dot visible

**W4-S2: Re-engagement Email** (spec 16; depends on W2-S1 create-account + W3-S4 timing gate)

| File | Change |
|------|--------|
| `src/app/api/jobs/connect-reengagement/route.ts` | NEW — cron job |
| Migration or schema update | `connectReengagementSentAt` on shops (or use `messageDedup`) |
| `vercel.json` | Register cron schedule (daily, e.g. 05:00 UTC) |

Acceptance:
- Email sent exactly once, 24–48h after `stripeAccountCreatedAt`, if still pending
- NOT sent if: already complete, <24h ago, >48h ago, no services/availability
- CTA generates fresh Account Link via `/api/settings/stripe-connect/refresh`
- `connectReengagementSentAt` prevents duplicates
- Advisory lock prevents concurrent execution
- Email content: "You're one step away from collecting deposits" subject, inline HTML via Resend

---

## Spike Findings Applied

| Spike | Finding | Impact on slices |
|-------|---------|-----------------|
| `spike-availability-gate.md` | `availabilityConfigured` not a field; derived from `shopHours.findFirst()`. `shopHours` auto-seeded; real gate is `eventTypes.findFirst()` | W3-S4, W4-S1, W4-S2: gate uses two `findFirst` queries, no schema change |
| `spike-email-pattern.md` | Templates are DB-stored HTML strings with `{{var}}` interpolation. Cron uses advisory lock + query + send loop pattern | W4-S2: use inline HTML via `sendEmail()` directly; new advisory lock ID; register in vercel.json |
| `spike-payments-enabled.md` | `paymentsEnabled={true}` confirmed at 3 locations. `getShopBySlug()` returns all columns. Downstream branching is clean | W2-S4: surgical 3-line change + `depositSkipped` metadata addition |
