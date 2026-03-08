# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Booking/appointment management system with automated financial outcomes, refunds, and policy-driven resolution. Next.js 16, PostgreSQL, Stripe, Twilio SMS.

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

## Critical Rules

1. **Always run after changes:** `pnpm lint && pnpm typecheck`
2. **Never start dev server** - ask user for output
3. **Database changes:** Use `db:generate` then `db:migrate` (never `db:push` in production)
4. **Resolver safety:** Filter by `status='booked'` in WHERE clause
5. **Next.js 16:** No `src/middleware.ts` (use `src/proxy.ts` only)
6. **Next.js 16:** No `dynamic(..., {ssr: false})` in `page.tsx`/`layout.tsx` (use client wrapper)

## Documentation

- `docs/shaping/` - Implementation plans
- `docs/requirements/` - Vertical slice pitches
- `README.md` - Setup, API keys, deployment
