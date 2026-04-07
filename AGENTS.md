# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Booking/appointment management system with automated financial outcomes, refunds, and policy-driven resolution. Next.js 16, PostgreSQL, Stripe, Twilio SMS.

## Required Environment Variables

**Setup**: Copy `env.example` to `.env` and fill in values.

**Core**:
- `POSTGRES_URL` - PostgreSQL connection string
  ```
  # Example for local development:
  POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev
  ```
- `BETTER_AUTH_SECRET` - Better Auth session secret
- `CRON_SECRET` - Authenticates cron job requests
- `NEXT_PUBLIC_APP_URL` - Public app URL for links/redirects

**Stripe** (from https://dashboard.stripe.com):
- `STRIPE_SECRET_KEY` - Secret key for API calls
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key for client
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

**Twilio** (from https://console.twilio.com):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Optional: `TWILIO_TEST_MODE=true` for E2E tests (uses magic numbers)

**Email** (from https://resend.com):
- `RESEND_API_KEY` - Resend email API key
- `EMAIL_FROM_ADDRESS` - Sender address for outgoing emails

**Upstash Redis** (from https://console.upstash.com):
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**AI** (optional, for chat feature):
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENROUTER_MODEL` - Model to use (default: `openai/gpt-5-mini`)

**Storage** (optional):
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage (falls back to local if unset)

**Google Calendar** (optional, for conflict detection):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `CALENDAR_ENCRYPTION_KEY` - Base64-encoded 32-byte key (`openssl rand -base64 32`)

## UI Design System

When Creating new pages or components always reference the design system in `docs/design-system/`

## Credentials

playwright credentials:[tester1@example.com] / [tester1@example.com]

## Commands

### Development
```bash
pnpm dev          # Start dev server (ask user first)
pnpm build        # Build for production
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check
pnpm check        # Both lint and typecheck (run after changes)
```

### Testing
```bash
pnpm test                    # All unit tests (Vitest)
pnpm test <file>             # Specific test file
pnpm test:e2e                # All E2E tests (Playwright)
pnpm test:e2e <spec-file>    # Specific E2E spec
```

### Database
```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Run pending migrations
pnpm db:studio    # Open database GUI
```

### Running Scripts
Scripts in `scripts/` directory need environment variables. Always use:
```bash
pnpm tsx --env-file=.env scripts/<script-name>.ts
```

### Chromebook
```bash
sudo docker compose up
```

## Architecture

### Booking Lifecycle
```
Customer books → appointment + payment + token + SMS
Customer cancels → before cutoff: refund | after cutoff: deposit retained
Appointment ends → resolver auto-resolves outcome
Outcomes: settled | voided | refunded | unresolved
```

### Key Abstractions

**Policy Snapshots** (`src/lib/schema.ts` → `policyVersions`)
Appointments capture policy at booking time. Never join to `shopPolicies` (current), always use `policyVersions` (snapshot).

**Outcome Resolution** (`src/app/api/jobs/resolve-outcomes/route.ts`)
Resolver job auto-determines outcomes after appointments end.

**CRITICAL:** Resolver MUST skip cancelled appointments:
```typescript
.where(and(
  eq(appointments.status, "booked"),  // REQUIRED
  eq(appointments.financialOutcome, "unresolved"),
  sql`${appointments.endsAt} <= now() - ...`
))
```

**Token-Based Manage Links** (`src/lib/manage-tokens.ts`)
Secure tokenized links (SHA256 hash, 90-day expiry). Raw tokens shown only once.

**Idempotent Refunds** (`src/lib/stripe-refund.ts`)
1. Check `payment.stripeRefundId` exists
2. Stripe idempotency key: `refund-${appointmentId}`
3. Handle "already refunded" errors

**Tier System** (`src/lib/scoring.ts`)
- `top`: score ≥ 80 and voidedLast90Days = 0
- `risk`: score < 40 or voidedLast90Days ≥ 2
- `neutral`: everything else (default)

Pricing: `src/lib/tier-pricing.ts`, `src/lib/queries/appointments.ts`
Slot recovery priority: `top` → `neutral/null` → `risk` (see `src/lib/slot-recovery.ts`)

## Dashboard & Confirmation

**Dashboard Queries** (`src/lib/queries/dashboard.ts`):
- Summary cards: total appointments, confirmed, attention required
- Attention required: appointments needing confirmation or action
- All appointments table with filters

**Confirmation System** (`src/lib/confirmation.ts`):
- `confirmationStatus`: `pending`, `confirmed`, `needs_attention`
- Manual confirmation by shop owner via dashboard
- Integrated with no-show prediction risk levels

**Dashboard Route** (`/app/dashboard`):
- Protected route requiring shop owner authentication
- Real-time appointment status tracking
- Tier distribution charts and analytics

## Critical Rules

1. **Always run after changes:** `pnpm lint && pnpm typecheck`
2. **Never start dev server** - ask user for output
3. **Database changes:** Use `db:generate` then `db:migrate` (never `db:push` in production)
4. **Resolver safety:** Filter by `status='booked'` in WHERE clause
5. **Next.js 16:** No `src/middleware.ts` (use `src/proxy.ts` only)
6. **Next.js 16:** No `dynamic(..., {ssr: false})` in `page.tsx`/`layout.tsx` (use client wrapper)
7. **Phone validation:** Always use `libphonenumber-js` for parsing/formatting phone numbers
8. **Refunds:** Check `payment.stripeRefundId` exists before refunding to prevent duplicates
9. **SMS testing:** Always set `smsOptIn: true` in customer data for test bookings. The consent check happens before Twilio, so `TWILIO_TEST_MODE` alone won't fix "consent_missing" errors.

## Cron Jobs & Background Processing

**CRON_SECRET Required**: All cron jobs require `x-cron-secret` header authentication.

**Key Jobs** (`src/app/api/jobs/`):
- `resolve-outcomes` - Auto-resolve financial outcomes after appointments end
- `offer-loop` - Process slot recovery offers in tier-sorted order
- `expire-offers` - Expire unclaimed slot offers
- `expire-pending-recoveries` - Expire pending slot recovery records
- `recompute-scores` - Recalculate customer tier scores
- `recompute-no-show-stats` - Update no-show prediction statistics
- `send-reminders` - Send appointment SMS reminders
- `send-email-reminders` - Send appointment email reminders (via Resend)
- `send-confirmations` - Send confirmation requests to customers
- `expire-confirmations` - Expire stale confirmation requests
- `scan-calendar-conflicts` - Detect calendar conflicts with Google Calendar

**PostgreSQL Advisory Locks**: Jobs use `pg_try_advisory_lock` to prevent concurrent execution. Lock IDs configurable via environment or query params (non-production only).

**Redis-Based Locks**: Slot recovery uses Redis locks (`acquireLock`/`releaseLock`) with cooldown periods to prevent duplicate offers.

## Customer Identification & Contact

**Phone Numbers**: Primary customer identifier. Uses `libphonenumber-js` for validation/formatting. Mobile numbers required for SMS.

**Manage Tokens** (`src/lib/manage-tokens.ts`):
- SHA256-hashed tokens for customer self-service links
- 90-day expiry from creation
- Raw tokens shown only once (at booking confirmation)
- URL pattern: `/manage/{token}`

**Twilio SMS**:
- Production: Real SMS delivery via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Test mode: Set `TWILIO_TEST_MODE=true` for magic test numbers (no charges, no delivery)

**Email** (`src/lib/email.ts`):
- Transactional emails via Resend (`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`)
- Templates rendered server-side; `send-email-reminders` cron job drives delivery

## Payment & Refund Flow

**Stripe Integration** (`src/lib/stripe.ts`, `src/lib/stripe-refund.ts`):
- Payment intents created at booking time
- Webhooks handle payment status updates (`/api/stripe/webhook`)
- Idempotent refunds use `refund-${appointmentId}` as idempotency key
- Refund amount capped at original payment amount

**Payment Policy Snapshots**:
- Each appointment references `policyVersions.id` (frozen snapshot)
- Policies include: deposit amount, cancel cutoff, refund eligibility
- Tier overrides: different deposit amounts per tier (`top`/`neutral`/`risk`)

## Slot Recovery System

**Automatic Recovery** (`src/lib/slot-recovery.ts`):
- Triggered on cancellation (if payment succeeded and slot is future)
- Creates `slotOpening` record
- Offer loop queries eligible customers sorted by tier
- Tier priority: `top` → `neutral`/`null` → `risk`
- Prevents duplicate offers via Redis locks and cooldown periods

**Offer Lifecycle**:
- `pending` → customer receives SMS with booking link
- `accepted` → customer books the slot
- `expired` → offer expires after TTL
- `superseded` → slot filled by different customer

## No-Show Prediction

**Statistics** (`customerNoShowStats` table):
- Tracks voided/settled counts, last activity
- Updated by `recompute-no-show-stats` cron job
- Risk levels: `low`, `medium`, `high`

**Prediction Logic** (`src/lib/confirmation.ts`):
- Based on historical voided vs settled ratio
- Influences UI indicators and business decisions

## Database Conventions

**UUID vs Text IDs**:
- ALWAYS use `uuid().primaryKey().defaultRandom()` for new tables
- EXCEPT Better Auth tables (`user`, `session`, `account`, `verification`) which use `text("id")`

**Timestamps**:
- Use `timestamp("created_at").defaultNow().notNull()`
- Use `timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()`

**Schema Changes**:
1. Modify `src/lib/schema.ts`
2. Run `pnpm db:generate` (creates migration in `drizzle/`)
3. Review generated SQL in `drizzle/NNNN_*.sql`
4. Run `pnpm db:migrate` (applies migration)

**NEVER** use `db:push` in production (schema sync bypasses migrations).

## Google Calendar Integration

**Conflict Detection** (`/api/jobs/scan-calendar-conflicts`):
- Caches Google Calendar events in database
- Scans for overlaps between appointments and calendar events
- Alerts shop owners to potential double-bookings

**Event Caching** (`calendarEventCache` table):
- Stores Google Calendar events with TTL
- Reduces API calls to Google Calendar
- Refreshes on-demand or via scheduled job

## Documentation

- `docs/shaping/` - Implementation plans
- `docs/requirements/` - Vertical slice pitches
- `README.md` - Setup, API keys, deployment
