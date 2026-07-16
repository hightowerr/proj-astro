# Architecture Context

## 1. One-Line Summary

A multi-tenant appointment booking and no-show risk management system for service businesses, built on Next.js 16 with PostgreSQL, Stripe payments, Twilio SMS, and automated slot recovery via cron jobs.

## 2. Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) | Server/client rendering, API routes, cron endpoints |
| Runtime | React 19.2.4 | UI with Server Components by default |
| Language | TypeScript 5.9.3 (strict mode) | All source code |
| ORM | Drizzle 0.44.7 + postgres.js 3.4.8 | Schema, queries, migrations |
| Database | PostgreSQL 18 (pgvector image) | Primary data store; advisory locks for job concurrency |
| Auth | Better Auth 1.4.18 | Email/password, session management, rate limiting |
| Payments | Stripe 16.12.0 (API v2024-06-20) | Payment intents, refunds, webhook processing, Connect Express (destination charges) |
| SMS | Twilio (REST API, no SDK) | Reminders, confirmations, slot recovery offers, inbound handling |
| Email | Resend 6.4.1 | Transactional email delivery |
| Cache/Locks | Upstash Redis 1.36.1 | Session caching, distributed locks, offer cooldowns |
| Calendar | Google Calendar API | OAuth sync, conflict detection, event caching |
| Storage | Vercel Blob 2.0.1 | File uploads (optional) |
| AI | OpenRouter via Vercel AI SDK 5.x | Chat assistant (optional) |
| Styling | Tailwind CSS 4.1.18 + CSS custom properties | Atelier Light design system tokens |
| Components | shadcn/ui (New York style) + Radix primitives | UI component library |
| Testing | Vitest 4.0.18 + Playwright 1.58.2 | Unit + E2E |
| No CMS | — | Content is developer-managed in code |

## 3. System Boundary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Production)                        │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │  Public Pages │   │  Dashboard (Auth) │   │  Cron Jobs (/jobs) │  │
│  │  /book/[slug] │   │  /app/*           │   │  x-cron-secret     │  │
│  │  /manage/[tk] │   │  requireAuth()    │   │  advisory locks    │  │
│  └──────┬───────┘   └────────┬──────────┘   └─────────┬──────────┘  │
│         │                    │                         │             │
│         └────────────┬───────┴─────────────────────────┘             │
│                      ▼                                               │
│            ┌──────────────────┐                                      │
│            │  API Routes      │                                      │
│            │  /api/*          │                                      │
│            └────────┬─────────┘                                      │
│                     │                                                │
└─────────────────────┼────────────────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┬──────────────┬──────────────┐
        ▼             ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │PostgreSQL│  │  Stripe   │  │  Twilio   │  │  Resend   │  │  Redis   │
  │ (Drizzle)│  │ Payments  │  │   SMS     │  │  Email    │  │ Upstash  │
  └──────────┘  │ Webhooks  │  │ Inbound   │  └──────────┘  │ Locks    │
                └──────────┘  └──────────┘                  └──────────┘
                                                      ┌──────────┐
                                                      │  Google   │
                                                      │ Calendar  │
                                                      └──────────┘
```

**Static/cached:** Landing page (`/`), public booking pages.
**Dynamic/server-side:** All `/api/*` routes, dashboard, manage links, cron jobs.
**Webhooks (inbound):** Stripe (`/api/stripe/webhook`), Twilio (`/api/twilio/inbound`).

## 4. Non-Obvious Routes

| Route | Behavior | Why it's non-obvious | Source |
|-------|----------|---------------------|--------|
| `src/proxy.ts` | Redirects to `/login` if no session cookie | Not `middleware.ts` — uses custom proxy pattern per CLAUDE.md | `src/proxy.ts` |
| `/api/auth/sign-out-orphan` | Clears session when user row deleted from DB | Handles stale sessions where DB user is gone | `src/app/api/auth/sign-out-orphan/route.ts` |
| `/api/jobs/offer-loop` | Uses `x-internal-secret` (not `x-cron-secret`) | Called internally by other jobs, not by Vercel Cron | `src/app/api/jobs/offer-loop/route.ts` |
| `/manage/[token]/*` | Token-based auth, no session required | Customer self-service via hashed manage token | `src/app/api/manage/[token]/cancel/route.ts` |
| `/api/stripe/webhook` | Stripe signature validation, dedup via `processedStripeEvents` | Idempotent; triggers calendar sync + SMS + offer loop on payment success | `src/app/api/stripe/webhook/route.ts` |
| `/api/stripe/connect-webhook` | Connect-specific webhook, separate signing secret (`STRIPE_CONNECT_WEBHOOK_SECRET`) | Handles `account.updated` for Connect onboarding status sync | `src/app/api/stripe/connect-webhook/route.ts` |
| `/api/settings/stripe-connect/*` | Connect account lifecycle (create, status, dashboard, refresh) | Express account creation, Account Link generation, status polling | `src/app/api/settings/stripe-connect/*/route.ts` |
| `/api/twilio/inbound` | HMAC-SHA1 signature validation, returns TwiML XML | "YES" accepts slot offer; "STOP" opts out of SMS | `src/app/api/twilio/inbound/route.ts` |
| `/app/app/page.tsx` | Shows `OnboardingFlow` if shop is null, else `AtelierDashboard` | Conditional rendering based on shop existence | `src/app/app/page.tsx` |
| All `/api/jobs/*` | PostgreSQL advisory locks prevent concurrent execution | Each job has a unique lock ID; overlap = skip | `src/app/api/jobs/*/route.ts` |

### Cron Schedule

| Job | Schedule | Lock ID | Purpose |
|-----|----------|---------|---------|
| `resolve-outcomes` | Daily 00:00 UTC | 482173 | Settle financial outcomes for ended appointments |
| `expire-offers` | Daily 01:00 UTC | 482174 | Expire unanswered slot recovery offers |
| `recompute-scores` | Daily 02:00 UTC | 482175 | Recalculate customer tier scores |
| `recompute-no-show-stats` | Daily 02:00 UTC | 482177 | Update no-show frequency stats |
| `send-email-reminders` | Daily 02:00 UTC | 202603171 | Send email reminders via Resend |
| `send-reminders` | Daily 03:00 UTC | 482178 | Send SMS reminders for high-risk appointments |
| `send-confirmations` | Daily 03:05 UTC | 482179 | Send confirmation request SMS/email |
| `expire-confirmations` | Daily 03:10 UTC | 482180 | Cancel unconfirmed appointments |
| `scan-calendar-conflicts` | Daily 04:00 UTC | 987654321 | Google Calendar overlap detection |
| `connect-reengagement` | Daily 05:00 UTC | 482181 | Email shop owners who abandoned Connect onboarding (24–48h window) |
| `expire-pending-recoveries` | On-demand | 482176 | Cancel abandoned slot-recovery bookings |

## 5. Content Model

| Content type | Source of truth | Rendering | Editable without code change |
|-------------|----------------|-----------|------------------------------|
| Appointments | `appointments` table | Server Components + API | Yes (DB mutations via API) |
| Customers | `customers` + `customerScores` + `customerNoShowStats` tables | Dashboard Server Components | Yes (scores recomputed by cron) |
| Policies | `shopPolicies` + `policyVersions` tables | Applied at booking time | Yes (owner edits via settings UI) |
| Event types | `eventTypes` table | Booking page + settings | Yes (owner CRUD via dashboard) |
| Shop config | `shops` + `bookingSettings` + `shopHours` tables | Booking page availability | Yes (owner settings) |
| Message templates | `messageTemplates` table | Rendered at send time | Yes (DB-managed templates) |
| Landing page | Hardcoded JSX in `src/app/page.tsx` | Static RSC | No — intentionally locked to code |
| Design tokens | CSS custom properties in `globals.css` | Tailwind utilities | No — design system is code-managed |

## 6. State Machines & Lifecycles

### Appointment Status

```
pending ──→ booked ──→ ended
  │            │
  │            ▼
  └────→ cancelled
```

| Transition | Trigger | Side Effects |
|-----------|---------|-------------|
| `pending → booked` | Stripe `payment_intent.succeeded` webhook, or no payment required | SMS confirmation sent, calendar event synced |
| `pending → cancelled` | Customer cancellation before payment | Payment intent cancelled if exists |
| `booked → cancelled` | Customer self-service via `/manage/[token]/cancel` | Refund check (before/after cutoff), slot opening created, calendar event deleted |
| `booked → ended` | Cron `resolve-outcomes` after `endsAt + graceMinutes` | `financialOutcome` resolved, no-show recorded if voided |

### Financial Outcome

```
unresolved ──→ settled    (payment captured, appointment kept)
           ──→ voided     (no-show or no payment)
           ──→ refunded   (cancelled before cutoff with refund)
```

| Outcome | Condition | Recorded in |
|---------|-----------|------------|
| `settled` | `paymentRequired && paymentStatus == "succeeded"` | `appointments.financialOutcome` |
| `voided` | `!paymentRequired` or `paymentStatus != "succeeded"` | `appointments.financialOutcome` + `customerNoShowStats` |
| `refunded` | `refundedAmountCents > 0` or `stripeRefundId` exists | `appointments.financialOutcome` + `payments` |

### Slot Recovery

```
SlotOpening:  open ──→ filled (offer accepted)
                   ──→ expired (no eligible customers or all offers expired)

SlotOffer:    sent ──→ accepted (customer replies YES or books)
                   ──→ expired  (TTL ran out)
                   ──→ declined (customer opts out)
```

### Confirmation Status

```
none ──→ pending (request sent) ──→ confirmed (customer responds)
                                ──→ expired   (cron: expire-confirmations)
```

## 7. Key Flows

### Booking Creation

1. Customer submits form → `POST /api/bookings/create` (public, no auth)
2. Validate shop slug, slot time, customer phone (libphonenumber)
3. Upsert customer by (shopId, phone), load or compute tier score
4. Apply tier pricing override → determine `paymentRequired` + `amountCents`
4b. Clamp deposit to platform floor (£1) if sub-minimum after tier/event-type overrides
5. Create Stripe payment intent (if payment required) → store in `payments`
6. Insert `appointments` (status: pending) + `appointmentEvents` (type: created) in transaction
7. Generate manage token (SHA256 hash stored, raw returned once)
8. Return `clientSecret` + `manageToken` to frontend
9. Frontend captures payment via Stripe Elements
10. Stripe fires `payment_intent.succeeded` → webhook updates status to `booked`, sends SMS, syncs calendar

### Cancellation (Self-Service)

1. Customer clicks manage link → `POST /api/manage/[token]/cancel`
2. Hash token, look up `bookingManageTokens` → get `appointmentId`
3. Load appointment + payment + policy snapshot
4. **Before cutoff:** issue Stripe refund (idempotent), mark `financialOutcome: refunded`
5. **After cutoff:** retain deposit, mark `financialOutcome: settled`
6. Delete calendar event, create `slotOpenings` record → trigger offer loop

### Slot Recovery Loop

1. Cancellation creates `slotOpenings` (status: open) → calls `/api/jobs/offer-loop`
2. Query eligible customers: `smsOptIn=true`, no overlapping bookings, not in Redis cooldown, respecting tier exclusion policy
3. Order by tier priority (top→neutral→risk), then score DESC
4. Send SMS offer to first eligible customer, create `slotOffers` (status: sent)
5. Customer replies "YES" via SMS → `POST /api/twilio/inbound` → accept offer, create appointment
5b. Derive `paymentsEnabled` from `shop.stripeOnboardingStatus === "complete"`. If Connect incomplete, booking is created as free (no PaymentIntent).
5c. Recovery SMS branches on `paymentRequired`: paid bookings get payment link, free bookings get confirmation-only text.
6. If no response → cron `expire-offers` marks sent→expired → loops to next customer

### Outcome Resolution

1. Cron `resolve-outcomes` acquires advisory lock
2. Query appointments: `financialOutcome=unresolved`, `status=booked`, `endsAt <= now - graceMinutes`
3. Determine outcome: settled (payment captured) or voided (no-show)
4. If voided: increment `customerNoShowStats.noShowCount`
5. Backfill orphaned cancelled appointments with correct outcome

### Tier Scoring

1. Cron `recompute-scores` processes customers in batches of 50
2. Aggregate appointment history in 180-day recency buckets (30d, 31-90d, 90d+)
3. Score formula: `base(50) + settled*10*multiplier - voided*20*multiplier - lateCancels*10*multiplier`
4. Assign tier: `≥80 + 0 recent voids = top`, `≤39 or ≥2 recent voids = risk`, else `neutral`
5. Tier affects pricing (risk pays more, top may be waived) and slot recovery eligibility

## 8. Authorization Model

| Operation | Who | Enforcement | Location |
|-----------|-----|------------|----------|
| Create booking | Public (anyone) | None — shop identified by slug | `src/app/api/bookings/create/route.ts` |
| Cancel booking | Customer | Hashed manage token validated against `bookingManageTokens` | `src/app/api/manage/[token]/cancel/route.ts` |
| Update preferences | Customer | Same manage token | `src/app/api/manage/[token]/update-preferences/route.ts` |
| Dashboard read/write | Owner | `requireAuth()` → Better Auth session + shop ownership FK | `src/lib/session.ts`, `src/app/app/layout.tsx` |
| Cron jobs | System | `x-cron-secret` header vs `CRON_SECRET` env var | Each `src/app/api/jobs/*/route.ts` |
| Offer loop | Internal | `x-internal-secret` header vs `INTERNAL_SECRET` env var | `src/app/api/jobs/offer-loop/route.ts` |
| Stripe webhook | Stripe | `stripe-signature` header (HMAC-SHA256) | `src/app/api/stripe/webhook/route.ts` |
| Twilio inbound | Twilio | `X-Twilio-Signature` header (HMAC-SHA1) | `src/app/api/twilio/inbound/route.ts` |
| Search | Owner | `requireAuth()` + shop ownership | `src/app/api/search/route.ts` |
| Calendar connect | Owner | `requireAuth()` + shop check | `src/app/api/settings/calendar/connect/route.ts` |

## 9. Environment & Config

> Full variable list and setup instructions: see `docs/context/env-setup.md`.

| Variable | Purpose | Build/Runtime |
|----------|---------|--------------|
| `POSTGRES_URL` | Database connection | Both (build runs migrations) |
| `BETTER_AUTH_SECRET` | Session signing (32+ chars) | Runtime |
| `CRON_SECRET` | Cron job authentication | Runtime |
| `INTERNAL_SECRET` | Internal job-to-job auth | Runtime |
| `STRIPE_SECRET_KEY` | Stripe API access | Runtime |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Build + Runtime |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature validation | Runtime |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect webhook signature validation (optional) | Runtime |
| `TWILIO_ACCOUNT_SID` / `AUTH_TOKEN` / `PHONE_NUMBER` | SMS sending | Runtime |
| `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | Email sending | Runtime |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Redis cache + locks | Runtime |
| `GOOGLE_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | Calendar OAuth | Runtime |
| `CALENDAR_ENCRYPTION_KEY` | Token encryption (base64 32-byte) | Runtime |
| `NEXT_PUBLIC_APP_URL` | Public URL for links | Build + Runtime |
| `OPENROUTER_API_KEY` | AI chat (optional) | Runtime |
| `BLOB_READ_WRITE_TOKEN` | File storage (optional) | Runtime |

**Validation:** All env vars validated at startup via Zod schema in `src/lib/env.ts`. Server vars are strict; client vars prefixed `NEXT_PUBLIC_`.

## 10. Invariants

1. **Outcome resolver filters by `status='booked'`** — prevents overwriting cancelled appointments. `src/app/api/jobs/resolve-outcomes/route.ts`
2. **Check `stripeRefundId` before issuing refund** — idempotency guard against double refunds. `src/lib/stripe-refund.ts`
3. **All cron jobs require `x-cron-secret` header** — unauthenticated cron calls return 401. Each `src/app/api/jobs/*/route.ts`
4. **Each cron job acquires a PostgreSQL advisory lock** — concurrent runs skip rather than duplicate work. Lock IDs listed in §4.
5. **Policy snapshots (`policyVersions`) used at booking time** — never join to current `shopPolicies` for refund/pricing decisions. `src/lib/schema.ts`
6. **Phone numbers parsed via `libphonenumber-js`** — raw string phones are never stored. `src/lib/phone.ts`
7. **Manage tokens are hashed (SHA256)** — raw token shown only once at booking confirmation. `src/lib/manage-tokens.ts`
8. **Appointment uniqueness: `(shopId, startsAt)` where status IN (pending, booked)** — prevents double-booking. `src/lib/schema.ts`
9. **Message dedup by body hash** — prevents duplicate SMS/email sends. `src/lib/messages.ts`, `messageDedup` table
10. **Stripe webhook events deduped via `processedStripeEvents`** — prevents reprocessing. `src/app/api/stripe/webhook/route.ts`
11. **No `src/middleware.ts`** — route protection uses `src/proxy.ts` pattern. `CLAUDE.md`
12. **No `dynamic` with `ssr: false` in page/layout files.** `CLAUDE.md`
13. **`smsOptIn: true` required for test bookings.** `CLAUDE.md`
14. **Set `TWILIO_TEST_MODE=true` for E2E** — prevents real SMS charges. `src/lib/twilio.ts`
15. **MCC derived from `shop.businessType` via lookup table** — never hardcode MCC values. `src/lib/mcc-mapping.ts` exports `getMccForBusinessType()`. Every `businessTypeSchema` value must have a corresponding entry — enforced by build-time test (`src/lib/mcc-mapping.test.ts`). When adding a new business vertical, update both `businessTypes` in `business-type-step.tsx` and `MCC_BY_BUSINESS_TYPE` in `mcc-mapping.ts`.
16. **`paymentsEnabled` must be derived from Connect status** — every caller of `createAppointment()` must set `paymentsEnabled: shop.stripeOnboardingStatus === "complete"`. Never hardcode `true`. The function's default (`?? true`) is a safety net, not a correct value. Tripwire comment at `src/lib/queries/appointments.ts:828`. `src/lib/slot-recovery.ts` (acceptOffer).
17. **Platform minimum deposit floor** — deposits between 1p and 99p are clamped to 100p (£1). Enforced at two points: `finalDepositCents` in `createAppointment()` (before policy snapshot) and `derivePaymentRequirement()` in `tier-pricing.ts` (belt-and-suspenders). Zero-amount deposits (from `topDepositWaived`) bypass the floor. Constant: `PLATFORM_MINIMUM_DEPOSIT_CENTS` exported from `src/lib/tier-pricing.ts`. Tripwire: review when multi-currency ships (JPY has no subunit) or if platform fee changes from flat 50p to percentage-based.
18. **No DB persistence for volatile Stripe account flags** — `payouts_enabled` is fetched live via `stripe.accounts.retrieve()` on the settings page, not stored in the `shops` table. Stripe account flags that change without merchant action (e.g., `payouts_enabled`, `capabilities`) must be fetched live. Only `stripeOnboardingStatus` (a lifecycle stage set by webhook) is persisted. `src/app/app/settings/stripe-connect/page.tsx`.

## 11. Codebase Quality Assessment

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Separation of concerns | 4 | Clean split: `lib/` (business logic), `queries/` (data access), `api/` (thin handlers), `components/` (UI). Route handlers delegate to shared modules. |
| Dependency hygiene | 4 | 34 production deps, all justified. Twilio uses raw REST instead of SDK (lighter). No unused deps visible. Zod 4.x, React 19, Next 16 — current versions. |
| Error handling | 4 | API routes return structured error responses with status codes. Stripe refund handles already-refunded, disputed, rate-limited cases explicitly. Cron jobs log per-record errors and continue. |
| Security posture | 4 | Webhook signature validation (Stripe HMAC-SHA256, Twilio HMAC-SHA1), rate limiting on auth, hashed manage tokens, encrypted calendar tokens, security headers in `next.config.ts`. Advisory locks prevent race conditions. |
| Testability | 3 | 35+ unit tests, 10+ E2E suites with Playwright. Stripe/Twilio have mock modes. Better Auth email verification skipped in E2E. Some business logic (scoring, cancellation eligibility) is pure and testable. Coverage tooling present but unclear target. |
| Naming & readability | 4 | Files named by responsibility (`stripe-refund.ts`, `slot-recovery.ts`, `tier-pricing.ts`). Enums are explicit. Query files mirror domain concepts. New contributor can navigate by filename. |
| Configuration | 4 | Centralized in `src/lib/env.ts` with Zod validation. No magic strings — lock IDs, cooldown durations, and thresholds are constants or env vars. `drizzle.config.ts`, `next.config.ts`, `components.json` are standard. |
| Build & deploy | 4 | `build` script runs migrations then Next.js build. `build:ci` skips migrations. Docker Compose for local dev. Vercel Cron for scheduling. No manual steps documented beyond env setup. |

**Scoring anchors:** 1 = actively broken, 3 = functional with gaps, 5 = production-hardened.

### Top 3 Risks

1. **Better Auth email verification and password reset log to console** — not wired to Resend. Password reset emails don't actually reach users in production. `src/lib/auth.ts`
2. **No request-level rate limiting on public booking endpoint** — `POST /api/bookings/create` is unauthenticated with no rate limit, vulnerable to abuse. Auth routes are rate-limited but booking is not.
3. **Stripe API version pinned to `2024-06-20`** — over a year old. Webhook event shapes may drift from current Stripe behavior. `src/lib/stripe.ts`

### Top 3 Strengths

1. **Idempotent, lock-protected cron jobs** — advisory locks + event dedup tables make the entire background job system safe for concurrent deployment and retries.
2. **Tier-driven dynamic pricing** — the scoring → tier → payment override pipeline is cleanly separated across `scoring.ts`, `tier-pricing.ts`, and `cancellation.ts`, making policy changes safe.
3. **Comprehensive slot recovery loop** — SMS-based offer system with cooldowns, priority ordering, expiry handling, and acceptance flow is fully automated end-to-end.
