# 01 — Dashboard: Pre-Migration Query Fallback

## Summary

Add a fallback clause to the dashboard's unprotected-bookings count query so pre-migration appointments (where `depositSkipped` is NULL because the column didn't exist at creation time) are correctly counted. This fixes Kicksnare seeing Tier 1 (navy, "deposits aren't enabled yet") when Tier 2 (amber, "N bookings without deposit protection") is correct.

## Root cause

`depositSkipped` is a write-time signal added in migration `0036_deposit_skipped.sql` with no default and no backfill. All pre-migration appointments have `depositSkipped = null`. The current query counts only `depositSkipped = "connect_not_complete"`, returning 0 for pre-migration bookings.

## Prerequisites

- Depends on: nothing (independent)

## Changes

**File:** `src/app/app/dashboard/page.tsx`

### 1. Import `isNull` from drizzle-orm

Add `isNull` to the existing drizzle-orm import (line 2):

```ts
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
```

Also add `or` if not already imported.

### 2. Add fallback clause to unprotected count query

Replace the WHERE clause in the `unprotectedCountResult` query (lines 67-76):

**Before:**
```ts
.where(
  and(
    eq(appointments.shopId, shop.id),
    eq(appointments.depositSkipped, "connect_not_complete"),
    eq(appointments.status, "booked")
  )
)
```

**After:**
```ts
.where(
  and(
    eq(appointments.shopId, shop.id),
    eq(appointments.status, "booked"),
    // Pre-migration fallback: depositSkipped IS NULL + paymentStatus = 'unpaid'
    // captures bookings created before the column existed.
    // Becomes inert once all pre-migration merchants complete Connect.
    or(
      eq(appointments.depositSkipped, "connect_not_complete"),
      and(
        isNull(appointments.depositSkipped),
        eq(appointments.paymentStatus, "unpaid")
      )
    )
  )
)
```

### Why this is safe

Post-migration bookings with `depositSkipped IS NULL` always have `paymentStatus = "pending"` or `"paid"` (the `createAppointment()` code at `queries/appointments.ts:918-929` sets `depositSkipped` for every free-booking path). The combination `NULL + unpaid` is exclusively pre-migration records — zero overcounting risk.

### Self-expiring

When Kicksnare completes Connect onboarding, the entire connect card disappears (gated on `stripeOnboardingStatus !== "complete"`). The fallback clause becomes inert — no cleanup needed.

## Acceptance

- Dashboard shows correct count of unprotected bookings (pre-migration + post-migration combined)
- Kicksnare sees Tier 2 amber card (not Tier 1 navy) when they have pre-migration bookings
- `pnpm check` passes (0 TS errors, 0 lint errors)
- No schema changes, no migration files
