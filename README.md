# Astro - Booking & Appointment Management System

A booking and appointment management system with automated financial outcomes, policy-driven refunds, and AI-powered reliability scoring.

Built with Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL, Upstash Redis, Stripe, and Twilio.

## Features

- **Authentication** - Better Auth with Google OAuth
- **Payments & Refunds** - Stripe with idempotent refunds and policy-driven deposit retention
- **SMS & Email Notifications** - Twilio for SMS (confirmations, reminders, slot recovery); Resend for transactional emails
- **Policy Engine** - Versioned policy snapshots ensuring historical accuracy per appointment
- **Tier & Scoring** - Customer reliability scoring (0-100) with dynamic tiering (`top`, `neutral`, `risk`)
- **Slot Recovery** - Automated offer loop that fills cancelled slots, prioritizing high-tier customers
- **Calendar Integration** - Google Calendar conflict detection and event caching
- **No-Show Prediction** - Risk levels based on historical attendance patterns
- **Owner Dashboard** - Protected dashboard with appointment tables, summary cards, customer analytics, and tier distribution charts
- **AI Chat** - OpenRouter-powered assistant for shop owners

## Prerequisites

- Node.js 20.x+
- pnpm
- PostgreSQL (local via Docker or hosted)
- Upstash Redis

## Quick Setup

**1. Clone and install**

```bash
git clone <repository-url>
cd proj-astro
pnpm install
```

**2. Environment**

```bash
cp env.example .env
```

See [docs/context/env-setup.md](./docs/context/env-setup.md) for the full variable reference. Key ones:

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis for locks and slot recovery |
| `CRON_SECRET` | Authenticates background jobs |
| `RESEND_API_KEY` | Email delivery |

**3. Database**

```bash
# Option A: Local PostgreSQL via Docker
sudo docker compose up -d

# Option B: Use a hosted Postgres URL in .env

# Then run migrations
pnpm db:migrate
```

**4. Start dev server**

```bash
pnpm dev
```

## Architecture

### Booking Lifecycle

1. **Book** - Customer selects a slot, payment captured, SMS confirmation sent, manage link generated.
2. **Cancel** - Before cutoff: full refund. After cutoff: deposit retained per policy snapshot.
3. **Resolve** - The `resolve-outcomes` job auto-determines the final outcome (`settled`, `voided`, `refunded`).

### Key Abstractions

- **Policy Snapshots** - Every appointment captures the active `policyVersion` at booking time. Refund logic always uses the snapshot, never the current policy.
- **Slot Recovery** - Cancellations create a `slotOpening` that triggers an automated SMS offer loop, prioritizing `top` tier customers first.
- **Advisory Locks** - Background jobs use `pg_try_advisory_lock`; slot recovery uses Upstash Redis locks to prevent duplicate offers.

## Background Jobs

All jobs are API routes requiring the `x-cron-secret` header.

| Route | Purpose |
|---|---|
| `/api/jobs/resolve-outcomes` | Finalize financial outcomes after appointments end |
| `/api/jobs/offer-loop` | Process slot recovery offers |
| `/api/jobs/expire-offers` | Expire unclaimed slot offers |
| `/api/jobs/expire-pending-recoveries` | Clean up stale pending recoveries |
| `/api/jobs/expire-confirmations` | Expire unconfirmed bookings |
| `/api/jobs/recompute-scores` | Recalculate customer reliability scores |
| `/api/jobs/recompute-no-show-stats` | Update no-show prediction statistics |
| `/api/jobs/send-reminders` | Send SMS appointment reminders |
| `/api/jobs/send-email-reminders` | Send email appointment reminders |
| `/api/jobs/send-confirmations` | Send booking confirmation messages |
| `/api/jobs/scan-calendar-conflicts` | Sync Google Calendar and flag overlaps |

## Testing

```bash
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
```

Set `TWILIO_TEST_MODE=true` for E2E to use Twilio magic numbers and avoid real charges.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Build for production (runs migrations first) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm check` | Lint + typecheck |
| `pnpm format` | Prettier format |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Documentation

- [Product & Business Rules](./docs/context/product-rules.md) - Booking lifecycle, tiers, slot recovery, refund logic
- [Backend Architecture](./docs/context/backend-architecture.md) - Database conventions, cron jobs, identity, calendar
- [Environment Setup](./docs/context/env-setup.md) - All required and optional environment variables
- [Design System](./docs/design-system/design-system.md) - UI component guidelines and tokens
- [Brand Guidelines](./docs/design-system/DESIGN.md) - Visual identity and design direction
