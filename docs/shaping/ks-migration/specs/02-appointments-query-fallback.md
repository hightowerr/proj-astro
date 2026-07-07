# 02 — Appointments: Pre-Migration Query Fallback

## Summary

Add the same fallback clause to the appointments page's unprotected-bookings count query. This fixes the amber inline banner ("N bookings have no deposit. Connect Stripe") not appearing when pre-migration appointments exist.

## Root cause

Same as spec 01 — `depositSkipped` is a write-time signal with no backfill. The appointments page query (lines 117-126) counts only `depositSkipped = "connect_not_complete"`, missing all pre-migration records.

## Prerequisites

- Depends on: nothing (independent of spec 01 — identical fix, different file)

## Changes

**File:** `src/app/app/appointments/page.tsx`

### 1. Import `isNull` and `or` from drizzle-orm

Add `isNull` and `or` to the existing drizzle-orm import:

```ts
import { and, eq, isNull, or, sql } from "drizzle-orm";
```

### 2. Add fallback clause to unprotected count query

Replace the WHERE clause in the `unprotectedResult` query (lines 119-124):

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

Same safety argument as spec 01 — the combination `depositSkipped IS NULL + paymentStatus = 'unpaid'` is exclusively pre-migration records.

### Self-expiring

Same as spec 01 — the inline banner is gated on `stripeOnboardingStatus !== "complete"`. Completing Connect hides the banner entirely.

## Acceptance

- Appointments page shows correct count of unprotected bookings in the amber inline banner
- Banner appears when pre-migration bookings exist (previously hidden because count was 0)
- `pnpm check` passes (0 TS errors, 0 lint errors)
- No schema changes, no migration files
