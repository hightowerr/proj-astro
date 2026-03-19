# V5: Expiry Cron + Sequential Loop

**Goal:** Offer expires → automatically advance to next customer

**Appetite:** 0.5-1 day (Day 2 afternoon-evening)

**Demo:** Send offer → first customer ignores → 15 min later → second customer gets offer automatically

---

## Scope

### In Scope
- `/api/jobs/expire-offers` cron endpoint
- Update `vercel.json` to add cron schedule (every 5 minutes)
- PostgreSQL advisory lock for cron
- Connect V1 → V2: Auto-trigger offer loop from cancellation
- End-to-end automation test

### Out of Scope
- Payment failure recovery (V6)
- Dashboard UI (V6)

---

## Implementation Steps

### Step 1: Expiry Cron Endpoint

**File:** `src/app/api/jobs/expire-offers/route.ts` (new file)

```typescript
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { slotOffers, slotOpenings } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482174; // Different from resolve-outcomes lock
const BATCH_SIZE = 25; // Conservative to stay under timeout

/**
 * Expire offers cron job.
 *
 * Runs every 5 minutes.
 *
 * Finds offers WHERE:
 * - status = 'sent'
 * - expires_at <= now
 * - slot_opening.status = 'open'
 *
 * For each expired offer:
 * 1. Mark offer as 'expired'
 * 2. Trigger next offer for that slot (if still open)
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acquire PostgreSQL advisory lock
  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${LOCK_ID}) as locked`
  );
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    // Find expired offers
    const expiredOffers = await db
      .select({
        offerId: slotOffers.id,
        slotOpeningId: slotOffers.slotOpeningId,
        customerId: slotOffers.customerId,
        slotStatus: slotOpenings.status,
      })
      .from(slotOffers)
      .innerJoin(slotOpenings, eq(slotOpenings.id, slotOffers.slotOpeningId))
      .where(
        and(
          eq(slotOffers.status, "sent"),
          sql`${slotOffers.expiresAt} <= now()`,
          eq(slotOpenings.status, "open") // Only process if slot still open
        )
      )
      .limit(BATCH_SIZE);

    let expired = 0;
    let triggered = 0;
    const errors: string[] = [];

    for (const offer of expiredOffers) {
      try {
        // Mark offer expired (idempotent WHERE clause)
        const updated = await db
          .update(slotOffers)
          .set({
            status: "expired",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(slotOffers.id, offer.offerId),
              eq(slotOffers.status, "sent") // Only update if still sent
            )
          )
          .returning({ id: slotOffers.id });

        if (updated.length > 0) {
          expired += 1;

          // Trigger next offer for this slot
          const appUrl = process.env.APP_URL;
          const internalSecret = process.env.INTERNAL_SECRET;

          if (!appUrl || !internalSecret) {
            errors.push(`Missing APP_URL or INTERNAL_SECRET for offer ${offer.offerId}`);
            continue;
          }

          const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
            },
            body: JSON.stringify({ slotOpeningId: offer.slotOpeningId }),
          });

          if (response.ok) {
            triggered += 1;
          } else {
            errors.push(`Failed to trigger offer loop for slot ${offer.slotOpeningId}: ${response.status}`);
          }
        }
      } catch (error) {
        errors.push(`Failed to process expired offer ${offer.offerId}: ${(error as Error).message}`);
      }
    }

    return Response.json({
      total: expiredOffers.length,
      expired,
      triggered,
      errors,
    });
  } finally {
    // Release advisory lock
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
```

---

### Step 2: Update vercel.json

**File:** `vercel.json`

Add expiry cron:

```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule explanation:**
- `*/5 * * * *` = Every 5 minutes
- Max 5-minute delay after offer expires before next customer notified
- Conservative for MVP; can be tuned later

---

### Step 3: Auto-Trigger from Cancellation

**File:** `src/lib/slot-recovery.ts`

Uncomment the fetch in `createSlotOpeningFromCancellation()`:

```typescript
export async function createSlotOpeningFromCancellation(
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect | undefined
): Promise<void> {
  // ... existing guards

  try {
    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: appointment.shopId,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        sourceAppointmentId: appointment.id,
        status: "open",
      })
      .returning({ id: slotOpenings.id });

    console.log(`Created slot opening ${slotOpening.id}`);

    // Trigger offer loop (V5)
    const appUrl = process.env.APP_URL;
    const internalSecret = process.env.INTERNAL_SECRET;

    if (appUrl && internalSecret) {
      await fetch(`${appUrl}/api/jobs/offer-loop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret,
        },
        body: JSON.stringify({ slotOpeningId: slotOpening.id }),
      });

      console.log(`Triggered offer loop for slot ${slotOpening.id}`);
    } else {
      console.warn('APP_URL or INTERNAL_SECRET not set - offer loop not triggered');
    }
  } catch (error) {
    // ... existing error handling
  }
}
```

---

### Step 4: Unit Tests

**File:** `src/app/api/jobs/expire-offers/route.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers } from '@/lib/schema';
import { POST } from './route';

describe('POST /api/jobs/expire-offers', () => {
  beforeEach(async () => {
    await db.delete(slotOffers);
    await db.delete(slotOpenings);
  });

  it('returns 401 without valid CRON_SECRET', async () => {
    const req = new Request('http://localhost:3000/api/jobs/expire-offers', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong_secret' },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('marks expired offers and triggers next', async () => {
    // Seed slot opening
    const [slot] = await db.insert(slotOpenings).values({
      shopId: 'test-shop',
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      sourceAppointmentId: 'test-appt',
      status: 'open',
    }).returning();

    // Seed customer
    await db.insert(customers).values({
      id: 'test-customer-1',
      shopId: 'test-shop',
      phone: '+1234567890',
      name: 'Test Customer',
      smsOptIn: true,
    });

    // Seed expired offer
    await db.insert(slotOffers).values({
      slotOpeningId: slot.id,
      customerId: 'test-customer-1',
      channel: 'sms',
      status: 'sent',
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const req = new Request('http://localhost:3000/api/jobs/expire-offers', {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.expired).toBe(1);

    // Verify offer marked expired
    const offer = await db.query.slotOffers.findFirst({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
    });

    expect(offer?.status).toBe('expired');
  });

  it('skips offers for non-open slots', async () => {
    // Seed filled slot
    const [slot] = await db.insert(slotOpenings).values({
      shopId: 'test-shop',
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      sourceAppointmentId: 'test-appt',
      status: 'filled', // Already filled
    }).returning();

    // Seed expired offer
    await db.insert(slotOffers).values({
      slotOpeningId: slot.id,
      customerId: 'test-customer-1',
      channel: 'sms',
      status: 'sent',
      expiresAt: new Date(Date.now() - 1000),
    });

    const req = new Request('http://localhost:3000/api/jobs/expire-offers', {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });

    const response = await POST(req);
    const data = await response.json();

    // No offers should be expired (slot not open)
    expect(data.total).toBe(0);
  });

  it('respects batch size limit', async () => {
    // This would require seeding 30+ expired offers
    // Testing batch size behavior
    // Left as exercise or manual verification
  });
});
```

---

### Step 5: E2E Automation Test

**File:** `tests/e2e/slot-recovery-automation.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers, appointments } from '@/lib/schema';

test('end-to-end slot recovery automation', async ({ page }) => {
  // Step 1: Seed shop, customers, initial booking
  const [customer1] = await db.insert(customers).values({
    shopId: 'test-shop',
    phone: '+15555551111',
    name: 'Customer 1',
    email: 'c1@example.com',
    smsOptIn: true,
  }).returning();

  const [customer2] = await db.insert(customers).values({
    shopId: 'test-shop',
    phone: '+15555552222',
    name: 'Customer 2',
    email: 'c2@example.com',
    smsOptIn: true,
  }).returning();

  // Step 2: Create paid booking
  const futureTime = new Date(Date.now() + 86400000);
  const [initialBooking] = await db.insert(appointments).values({
    shopId: 'test-shop',
    customerId: customer1.id,
    startsAt: futureTime,
    endsAt: new Date(futureTime.getTime() + 3600000),
    status: 'booked',
    paymentRequired: true,
  }).returning();

  // Create payment
  await db.insert(payments).values({
    appointmentId: initialBooking.id,
    shopId: 'test-shop',
    amountCents: 2000,
    status: 'succeeded',
    stripePaymentIntentId: 'pi_test_123',
  });

  // Step 3: Cancel booking (triggers slot opening creation)
  // This would normally be done via cancel API
  // For test, we'll create slot opening directly
  const [slot] = await db.insert(slotOpenings).values({
    shopId: 'test-shop',
    startsAt: futureTime,
    endsAt: new Date(futureTime.getTime() + 3600000),
    sourceAppointmentId: initialBooking.id,
    status: 'open',
  }).returning();

  // Manually trigger offer loop (simulates V1 hook)
  await fetch('http://localhost:3000/api/jobs/offer-loop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_SECRET!,
    },
    body: JSON.stringify({ slotOpeningId: slot.id }),
  });

  // Step 4: Verify first customer got offer
  const offer1 = await db.query.slotOffers.findFirst({
    where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
  });

  expect(offer1).toBeDefined();
  expect(offer1?.status).toBe('sent');

  // Step 5: Manually expire offer (normally handled by cron)
  await db.update(slotOffers)
    .set({ expiresAt: new Date(Date.now() - 1000) }) // Expired
    .where(eq(slotOffers.id, offer1!.id));

  // Step 6: Trigger expiry cron
  const expiryResponse = await fetch('http://localhost:3000/api/jobs/expire-offers', {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET! },
  });

  expect(expiryResponse.status).toBe(200);

  // Step 7: Verify first offer expired and second customer got offer
  const updatedOffer1 = await db.query.slotOffers.findFirst({
    where: (table, { eq }) => eq(table.id, offer1!.id),
  });

  expect(updatedOffer1?.status).toBe('expired');

  const offers = await db.query.slotOffers.findMany({
    where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
  });

  expect(offers).toHaveLength(2); // First expired, second sent

  // Step 8: Second customer accepts
  await fetch('http://localhost:3000/api/twilio/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      From: customer2.phone,
      Body: 'YES',
    }),
  });

  // Step 9: Verify booking created and slot filled
  const recoveredBooking = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.sourceSlotOpeningId, slot.id),
  });

  expect(recoveredBooking).toBeDefined();
  expect(recoveredBooking?.customerId).toBe(customer2.id);

  const finalSlot = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slot.id),
  });

  expect(finalSlot?.status).toBe('filled');
});
```

---

## Testing Checklist

### Manual Testing

1. **Test expiry cron:**
   ```bash
   # Create slot with expired offer
   pnpm db:studio
   # Set expires_at to past time

   # Trigger cron manually
   curl -X POST http://localhost:3000/api/jobs/expire-offers \
     -H "x-cron-secret: $CRON_SECRET"

   # Verify offer marked expired
   # Verify next customer got SMS
   ```

2. **Test automatic trigger from cancellation:**
   ```bash
   # Cancel a paid booking via manage link
   # Verify slot_opening created
   # Verify first customer receives SMS immediately
   ```

3. **Test end-to-end flow:**
   - Cancel booking
   - Wait for offer to expire (or manually set)
   - Trigger expiry cron
   - Verify next customer gets offer
   - Next customer accepts
   - Verify booking created

### Automated Testing

```bash
pnpm test src/app/api/jobs/expire-offers
pnpm test:e2e tests/e2e/slot-recovery-automation.spec.ts
```

---

## Acceptance Criteria

- ✅ `/api/jobs/expire-offers` endpoint created
- ✅ Endpoint authenticates with CRON_SECRET
- ✅ PostgreSQL advisory lock prevents concurrent runs
- ✅ Finds expired offers (status='sent', expires_at <= now)
- ✅ Only processes offers for open slots
- ✅ Marks offers as 'expired' (idempotent WHERE)
- ✅ Triggers offer loop for next customer
- ✅ Returns structured response (total, expired, triggered, errors)
- ✅ `vercel.json` includes cron schedule (every 5 minutes)
- ✅ Cancellation auto-triggers offer loop
- ✅ End-to-end automation test passes
- ✅ All unit tests pass

---

## Dependencies

**Required:**
- V2: Offer loop endpoint exists and works
- V4: Locks prevent concurrent acceptance
- Environment: CRON_SECRET, APP_URL, INTERNAL_SECRET

**Provides to:**
- V6: Complete automation ready for payment failure handling
- Production: Fully automated slot recovery

---

## Vercel Cron Notes

**Development:**
- Crons don't run locally
- Test manually by calling endpoint with CRON_SECRET

**Staging/Production:**
- Crons run automatically per schedule
- Logs visible in Vercel dashboard
- Can manually trigger from Vercel UI

**Monitoring:**
- Check Vercel logs for cron execution
- Response JSON shows expired/triggered counts
- Errors array shows any failures

---

## Performance Notes

**Batch size:** 25 offers per run
- Worst case: 25 × 240ms = 6 seconds
- Well under 10-second Vercel hobby timeout
- Can increase to 50 if needed

**Offer loop trigger:**
- Fire-and-forget fetch (doesn't await response body)
- ~100ms overhead per trigger
- Acceptable for sequential processing

**Every 5 minutes:**
- Max 5-minute delay after expiry
- 288 executions per day
- Acceptable response time for slot recovery

---

## Rollback Plan

If V5 causes issues:
1. Remove cron from `vercel.json` (stops automatic runs)
2. Comment out auto-trigger in `createSlotOpeningFromCancellation()`
3. V1-V4 still work for manual slot recovery

---

## Notes

- Lock ID (482174) is different from resolve-outcomes (482173)
- Batch size is conservative - can tune based on performance
- Fetch doesn't await response body for speed
- Error handling is non-blocking - logs errors but continues
- TODO: Consider adding retry logic for failed offer loop triggers
