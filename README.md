# Booking & Appointment Management System

A high-performance booking and appointment management system with automated financial outcomes, policy-driven refunds, and AI-powered reliability scoring.

## 🚀 Features

- **🔐 Authentication**: Better Auth with Google OAuth integration.
- **💳 Payments & Refunds**: Stripe integration with idempotent refunds and policy-driven deposit retention.
- **📱 SMS Notifications**: Twilio integration for booking confirmations, reminders, and slot recovery offers.
- **⚖️ Policy Engine**: Versioned policy snapshots ensuring historical accuracy for every appointment.
- **🎯 Tier & Scoring System**: Customer reliability scoring (0-100) with dynamic tiering (`top`, `neutral`, `risk`).
- **♻️ Slot Recovery**: Automated offer loop that fills cancelled slots by prioritizing high-tier customers.
- **📅 Calendar Integration**: Google Calendar conflict detection and event caching.
- **🤖 No-Show Prediction**: Predictive risk levels based on historical attendance patterns.
- **⚡ Modern Stack**: Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL, Upstash Redis.

## 📋 Prerequisites

- **Node.js**: Version 20.x or higher
- **pnpm**: Recommended package manager
- **PostgreSQL**: Local or hosted (e.g., Vercel Postgres)
- **Redis**: Upstash Redis for locking and slot recovery

## 🛠️ Quick Setup

**1. Clone the repository**

```bash
git clone <repository-url>
cd proj-astro
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Environment Setup**

Copy the example environment file and fill in the values:

```bash
cp env.example .env
```

Key variables required:
- `POSTGRES_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Random 32-character string
- `STRIPE_SECRET_KEY`: Stripe API secret
- `TWILIO_ACCOUNT_SID` / `AUTH_TOKEN`: Twilio credentials
- `UPSTASH_REDIS_REST_URL` / `TOKEN`: Upstash Redis credentials
- `CRON_SECRET`: Secret for authenticating background jobs

**4. Database Setup**

```bash
pnpm db:migrate
```

**5. Start Development Server**

```bash
pnpm dev
```

## 🏗️ Architecture

### Booking Lifecycle
1. **Booking**: Customer selects a slot → Appointment created → Payment intent → SMS confirmation.
2. **Cancellation**: If before cutoff: full refund. If after: deposit retained based on policy snapshot.
3. **Resolution**: Post-appointment, the `resolve-outcomes` job auto-determines if the appointment was `settled`, `voided`, or `refunded`.

### Key Abstractions
- **Policy Snapshots**: Every appointment captures the active `policyVersion` at booking time to prevent retro-active policy changes affecting existing bookings.
- **Slot Recovery**: Cancellations trigger a `slotOpening` which initiates an automated offer loop, prioritizing `top` tier customers via SMS.
- **Advisory Locks**: Background jobs use PostgreSQL advisory locks to prevent concurrent execution.

## ⚙️ Background Jobs (Cron)

All jobs require the `x-cron-secret` header.

- `/api/jobs/resolve-outcomes`: Finalizes financial outcomes after appointments end.
- `/api/jobs/offer-loop`: Processes slot recovery offers.
- `/api/jobs/recompute-scores`: Recalculates customer reliability scores.
- `/api/jobs/scan-calendar-conflicts`: Syncs with Google Calendar to detect overlaps.

## 🧪 Testing

```bash
pnpm test          # Run unit tests (Vitest)
pnpm test:e2e      # Run E2E tests (Playwright)
```

**E2E Note**: Set `TWILIO_TEST_MODE=true` to use Twilio magic numbers and avoid real charges during tests.

## 🔧 Available Scripts

- `pnpm dev`: Start dev server
- `pnpm build`: Build for production
- `pnpm lint`: Run ESLint
- `pnpm typecheck`: TypeScript check
- `pnpm db:generate`: Generate migrations
- `pnpm db:migrate`: Apply migrations
- `pnpm db:studio`: Open database GUI

## 📖 Documentation for Stakeholders

- **[Astro: The Autonomous Appointment System (Bet)](./docs/BET-README.md)**: Product overview and successful delivery of Slices 0-8.
- **[Sanity CMS Content Guidelines](./docs/SANITY-GUIDELINES.md)**: How to manage landing page content for non-technical stakeholders.
- **[Marketing "How to Edit" Guide](./docs/MARKETING-EDIT-GUIDE.md)**: A quick guide for the marketing team to manage copy, pricing, and policies.
- **[Performance Audit](./docs/PERFORMANCE-AUDIT.md)**: Estimated Lighthouse scores and bundle size analysis.

---

**Happy booking! 🚀**
