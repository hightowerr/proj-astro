# Booking System — Handoff

A shop-owner booking and appointment management system. Shop owners configure services, set deposit policies, and manage availability; customers book appointments and pay a deposit at booking time. The system automatically resolves financial outcomes after appointments end, handles cancellation-driven refunds against configurable cutoffs, and recovers cancelled slots by SMS-offering them to eligible customers in tier order.

---

## Stack Snapshot

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 — App Router, React Server Components, Server Actions |
| Runtime | React 19, Node ≥ 20.9 |
| Database | PostgreSQL via Drizzle ORM (migrations in `drizzle/`) |
| Auth | Better Auth (email/password) with Upstash Redis session cache |
| Payments | Stripe (payment intents, webhooks, idempotent refunds) |
| SMS | Twilio |
| Email | Resend |
| Storage | Vercel Blob (falls back to local if `BLOB_READ_WRITE_TOKEN` unset) |
| Cache / Locks | Upstash Redis |
| Styling | Tailwind CSS v4 + Atelier Light design tokens (`--al-*`) |
| UI Components | shadcn/ui (Radix UI primitives) + Material Symbols (Google Fonts) |
| Animation | framer-motion |
| Hosting | Vercel (implied by Blob storage and `NEXT_PUBLIC_APP_URL` convention) |

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp env.example .env
# Fill in: POSTGRES_URL, BETTER_AUTH_SECRET, STRIPE_*, TWILIO_*, RESEND_API_KEY,
#          UPSTASH_REDIS_REST_URL/TOKEN, NEXT_PUBLIC_APP_URL, CRON_SECRET

# 3. Run database migrations
pnpm db:migrate

# 4. Start development server (Turbopack)
pnpm dev

# 5. Run checks before committing
pnpm check          # lint + typecheck
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E tests
```

Required environment variables are documented in `CLAUDE.md → Required Environment Variables` and in `env.example`.

---

## Architecture Context

- **Technical decisions and bet scope:** [`docs/shaping/services-page/ship-report.md`](../docs/shaping/services-page/ship-report.md)
- **Services page shaping doc:** [`docs/shaping/services-page/shaping.md`](../docs/shaping/services-page/shaping.md)
- **Design system tokens:** [`docs/design-system/design-system.md`](../docs/design-system/design-system.md)
- **Design principles (Stitch):** [`docs/shaping/services-page/stitch_reminder_system_prd (10)/DESIGN.md`](<../docs/shaping/services-page/stitch_reminder_system_prd (10)/DESIGN.md>)
- **Implementation rules:** [`CLAUDE.md`](../CLAUDE.md)
