# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **booking/appointment management system** with automated financial outcomes, refunds, and policy-driven resolution. Built with Next.js 16, PostgreSQL, Stripe, and Twilio SMS.

**See README.md for setup instructions, API keys, and deployment.**

## Commands

### Development (DON'T start dev server yourself - ask user)
```bash
pnpm dev          # Start dev server
pnpm build        # Build for production (runs db:migrate first)
pnpm start        # Start production server
```

### Code Quality (CRITICAL - Always run after changes)
```bash
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm check        # Both lint and typecheck together
```

### Testing
```bash
# Unit tests (Vitest)
pnpm test                    # Run all unit tests
pnpm test:unit:ui            # Open Vitest UI
pnpm test:unit:coverage      # Generate coverage report
pnpm test <file>             # Run specific test file

# E2E tests (Playwright)
pnpm test:e2e                # Run all E2E tests
pnpm test:e2e:ui             # Open Playwright UI
pnpm test:e2e:headed         # Run with browser visible
pnpm test:e2e <spec-file>    # Run specific spec

# Resolver tests
pnpm test:resolve-outcomes   # Test resolver job endpoint
```

### Database
```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Run pending migrations
pnpm db:push      # Push schema to DB (dev only, skips migrations)
pnpm db:studio    # Open Drizzle Studio (database GUI)
pnpm db:reset     # Drop all tables and push schema
```

### Resolver (Cron Job)
```bash
# Manually trigger outcome resolver
curl -X POST http://localhost:3000/api/jobs/resolve-outcomes \
  -H "x-cron-secret: $CRON_SECRET"
```

## High-Level Architecture

### Booking Lifecycle

```
1. Customer books → Creates appointment + Stripe payment intent + manage token + SMS
2. Customer cancels → Before cutoff: full refund | After cutoff: deposit retained
3. Appointment ends → Resolver job auto-resolves financial outcome
4. Financial outcomes: settled | voided | refunded | unresolved
```

### Key Abstractions

#### 1. Policy Versions (Immutable Snapshots)
Appointments capture the **policy at booking time** to prevent retroactive changes.

```typescript
// src/lib/schema.ts → policyVersions table
{
  cancelCutoffMinutes: 1440,      // 24 hours
  refundBeforeCutoff: true,
  resolutionGraceMinutes: 30,
  paymentMode: "deposit"
}
```

**Critical:** Never join to `shopPolicies` (current policy). Always use `policyVersions` (snapshot).

#### 2. Financial Outcome Resolution
Resolver job (`src/app/api/jobs/resolve-outcomes/route.ts`) automatically determines outcomes after appointments end.

```typescript
// src/lib/outcomes.ts
function resolveFinancialOutcome(input: {
  paymentRequired: boolean;
  paymentStatus: string | null;
}): { financialOutcome: "settled" | "voided"; resolutionReason: string }
```

**CRITICAL SAFETY RULE:** Resolver MUST skip cancelled appointments:
```typescript
.where(and(
  eq(appointments.status, "booked"),           // ← REQUIRED
  eq(appointments.financialOutcome, "unresolved"),
  sql`${appointments.endsAt} <= now() - ...`
))
```

#### 3. Token-Based Manage Links
Customers manage bookings via secure tokenized links (no account required).

```typescript
// src/lib/manage-tokens.ts
const rawToken = generateToken();           // 32 bytes random
const tokenHash = hashToken(rawToken);      // SHA256 (only hash stored)
```

**Security:** Raw tokens shown only once. Tokens expire after 90 days.

#### 4. Idempotent Refund Processing
Refunds prevent double-refunding via three safeguards:

```typescript
// src/lib/stripe-refund.ts
1. Check if payment.stripeRefundId already exists
2. Use Stripe idempotency key: `refund-${appointmentId}`
3. Handle "already refunded" errors gracefully
```

#### 5. Cancellation Eligibility
Determines refund eligibility based on cutoff time:

```typescript
// src/lib/cancellation.ts
const cutoffTime = addMinutes(appointmentStartsAt, -cancelCutoffMinutes);
const isEligibleForRefund =
  refundBeforeCutoff &&
  isBefore(now, cutoffTime) &&
  paymentStatus === "succeeded" &&
  appointmentStatus === "booked";
```

**Time handling:** All times in UTC. Cutoff calculated in UTC. Display in shop timezone.

### Data Flow: Cancel Before Cutoff

```
User clicks "Cancel" on /manage/{token}
  ↓
POST /api/manage/[token]/cancel
  ↓ validateToken(token) → appointmentId
  ↓ Load appointment + policy + payment
  ↓ calculateCancellationEligibility(...)
  ↓
if (isEligibleForRefund) {
  processRefund() → Stripe API + DB update
  └─> appointments: status=cancelled, financialOutcome=refunded
  └─> payments: refundedAmountCents, stripeRefundId
} else {
  └─> appointments: status=cancelled, financialOutcome=settled
}
```

## Critical Constraints

1. **Resolver Safety:** Resolver MUST NOT overwrite cancellation outcomes
   - Filter by `status='booked'` in WHERE clause
   - See: `docs/shaping/slice-5-v5-implementation-plan.md`

2. **Policy Immutability:** Policy changes never affect existing appointments
   - Always use `policyVersions` (snapshot), not `shopPolicies` (current)

3. **Idempotency Everywhere:**
   - Refunds use Stripe idempotency keys
   - Resolver uses conditional WHERE clauses
   - DB updates check status before changing

4. **Timezone Handling:**
   - Store all timestamps in UTC (`timestamptz`)
   - Cutoff calculations in UTC
   - Display times in shop timezone

## File Organization

```
src/
├── app/api/
│   ├── appointments/route.ts          # List appointments
│   ├── bookings/create/route.ts       # Create booking + payment
│   ├── jobs/resolve-outcomes/route.ts # Scheduled resolver (CRITICAL)
│   ├── manage/[token]/cancel/route.ts # Cancellation API
│   └── stripe/webhook/route.ts        # Stripe webhook handler
├── app/
│   ├── app/appointments/page.tsx      # Business dashboard
│   └── manage/[token]/page.tsx        # Customer manage page
├── components/
│   ├── booking/booking-form.tsx       # Customer booking UI
│   └── manage/manage-booking-view.tsx # Manage booking UI
└── lib/
    ├── booking.ts                      # Booking creation logic
    ├── cancellation.ts                 # Eligibility calculation
    ├── manage-tokens.ts                # Token generation/validation
    ├── outcomes.ts                     # Resolution logic (CRITICAL)
    ├── stripe-refund.ts                # Idempotent refund processing
    └── __tests__/                      # Unit tests
```

## Critical Rules

### 1. ALWAYS Run Code Quality Checks
After ANY code change:
```bash
pnpm lint && pnpm typecheck
```

### 2. NEVER Start Dev Server
If you need dev server output, ask the user to provide it.

### 3. Database Schema Changes
```bash
pnpm db:generate  # Generate migration
# Review generated SQL in drizzle/
pnpm db:migrate   # Run migration
```
Never use `db:push` in production. Use migrations.

### 4. Resolver Safety (CRITICAL)
The resolver job MUST:
1. Filter by `status='booked'` in WHERE clause
2. Never overwrite cancelled appointments
3. Be idempotent (use conditional WHERE in UPDATE)

See: `docs/shaping/slice-5-v5-implementation-plan.md`

## Documentation

- **Shaping docs:** `docs/shaping/` - Implementation plans with breadboards
- **Requirements:** `docs/requirements/` - Vertical slice pitches
- **README.md:** Setup, API keys, deployment, service configuration
