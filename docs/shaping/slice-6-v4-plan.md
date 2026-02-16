# V4: Redis Locks (Concurrency Safety)

**Goal:** Prevent double booking under concurrent YES replies

**Appetite:** 0.5 day (Day 2 morning)

**Demo:** Two customers reply YES simultaneously → exactly one booking created, loser gets "slot taken" message

---

## Scope

### In Scope
- Install `@upstash/redis` package
- `src/lib/redis.ts` with lock functions
- Update `acceptOffer()` to use locks
- Add "slot taken" SMS (U3)
- Add cooldown functions
- Update eligibility filter to check cooldowns
- Integration test for concurrent YES replies

### Out of Scope
- Expiry cron (V5)
- Automatic triggering (V5)
- Payment failure handling (V6)

---

## Implementation Steps

### Step 1: Install Redis Client

```bash
pnpm add @upstash/redis
```

**Verify environment variables exist:**

**File:** `env.example` (should already have from project setup)
```env
UPSTASH_REDIS_REST_URL="https://<your-upstash>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<token>"
```

---

### Step 2: Redis Client Setup

**File:** `src/lib/redis.ts` (new file)

```typescript
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

// ============================================================================
// Lock Functions
// ============================================================================

export interface LockResult {
  acquired: boolean;
  lockId: string | null;
}

/**
 * Acquire a distributed lock with automatic expiry.
 *
 * Uses SET NX EX pattern: Set if Not eXists, with EXpiry.
 *
 * @param key - Lock key (e.g., "slot_lock:shop123:2024-01-15T10:00:00Z")
 * @param ttlSeconds - Lock expiry in seconds (default: 30)
 * @returns Lock result with lockId if acquired
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = 30
): Promise<LockResult> {
  const redis = getRedisClient();

  // Generate unique lock ID
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  // SET NX EX: Set if Not eXists, with EXpiry
  const result = await redis.set(key, lockId, {
    nx: true,  // Only set if key doesn't exist
    ex: ttlSeconds,  // Expire after N seconds
  });

  return {
    acquired: result === 'OK',
    lockId: result === 'OK' ? lockId : null,
  };
}

/**
 * Release a distributed lock if we still own it.
 *
 * Uses Lua script for atomic check-and-delete.
 *
 * @param key - Lock key
 * @param lockId - Lock ID returned from acquireLock
 * @returns True if lock was released, false if we didn't own it
 */
export async function releaseLock(
  key: string,
  lockId: string
): Promise<boolean> {
  const redis = getRedisClient();

  // Lua script for atomic check-and-delete
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const result = await redis.eval(
    luaScript,
    [key],      // KEYS[1]
    [lockId]    // ARGV[1]
  ) as number;

  return result === 1;
}

// ============================================================================
// Cooldown Functions
// ============================================================================

/**
 * Set a cooldown for a customer.
 *
 * Prevents spamming customers with repeated offers.
 *
 * @param customerId - Customer UUID
 * @param durationSeconds - Cooldown duration (default: 86400 = 24 hours)
 */
export async function setCooldown(
  customerId: string,
  durationSeconds: number = 86400
): Promise<void> {
  const redis = getRedisClient();
  const key = `offer_cooldown:${customerId}`;

  // SETEX: Set with expiry
  await redis.setex(key, durationSeconds, '1');
}

/**
 * Check if a customer is in cooldown.
 *
 * @param customerId - Customer UUID
 * @returns True if customer is in cooldown, false otherwise
 */
export async function isInCooldown(customerId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `offer_cooldown:${customerId}`;

  const value = await redis.get(key);
  return value !== null;
}

/**
 * Get remaining cooldown time in seconds.
 *
 * @param customerId - Customer UUID
 * @returns Remaining seconds, or 0 if not in cooldown
 */
export async function getCooldownTTL(customerId: string): Promise<number> {
  const redis = getRedisClient();
  const key = `offer_cooldown:${customerId}`;

  const ttl = await redis.ttl(key);
  return ttl > 0 ? ttl : 0;
}
```

---

### Step 3: Update Accept Offer with Locks

**File:** `src/lib/slot-recovery.ts`

Update `acceptOffer()`:

```typescript
import { acquireLock, releaseLock, setCooldown } from "@/lib/redis";

/**
 * Accept an offer and create booking.
 *
 * V4: Added Redis locks for concurrency safety.
 *
 * Steps:
 * 1. Acquire lock
 * 2. Re-check slot still open
 * 3. Create booking + payment intent
 * 4. Update slot_opening status='filled'
 * 5. Update slot_offer status='accepted'
 * 6. Send confirmation SMS
 * 7. Set cooldown
 * 8. Release lock
 */
export async function acceptOffer(
  openOffer: OpenOffer
): Promise<{ bookingId: string; paymentUrl: string }> {
  const { offer, slotOpening, customer } = openOffer;

  // Acquire lock
  const lockKey = `slot_lock:${slotOpening.shopId}:${slotOpening.startsAt.toISOString()}`;
  const lock = await acquireLock(lockKey, 30);

  if (!lock.acquired) {
    throw new Error('SLOT_TAKEN'); // Special error code for caller to detect
  }

  try {
    // Re-check slot still open (might have changed while acquiring lock)
    const freshSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.id, slotOpening.id),
    });

    if (!freshSlot || freshSlot.status !== "open") {
      throw new Error('SLOT_NO_LONGER_AVAILABLE');
    }

    // Create booking + payment
    const booking = await createBooking({
      shopId: slotOpening.shopId,
      customerId: customer.id,
      startsAt: slotOpening.startsAt,
      endsAt: slotOpening.endsAt,
      source: "slot_recovery",
      sourceSlotOpeningId: slotOpening.id,
    });

    // Update slot_opening
    await db
      .update(slotOpenings)
      .set({
        status: "filled",
        updatedAt: new Date(),
      })
      .where(eq(slotOpenings.id, slotOpening.id));

    // Update slot_offer
    await db
      .update(slotOffers)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(slotOffers.id, offer.id));

    // Send confirmation SMS
    const paymentUrl = `${process.env.APP_URL}/pay/${booking.paymentId}`;
    const message = `Booking confirmed! Complete payment: ${paymentUrl}`;
    await sendSMS(customer.phone, message);

    // Set cooldown (24 hours)
    await setCooldown(customer.id, 86400);

    console.log(`Slot recovery booking created: ${booking.id} for customer ${customer.id}`);

    return {
      bookingId: booking.id,
      paymentUrl,
    };
  } finally {
    // Always release lock (even on error)
    if (lock.lockId) {
      await releaseLock(lockKey, lock.lockId);
    }
  }
}
```

---

### Step 4: Update Inbound SMS Handler

**File:** `src/app/api/twilio/inbound/route.ts`

Update YES handling to catch lock failure:

```typescript
// Handle YES replies for slot recovery
if (body === "YES") {
  try {
    const openOffer = await findLatestOpenOffer(from);

    if (!openOffer) {
      await sendSMS(from, "No active offers found. Please contact us.");
      return new Response(null, { status: 200 });
    }

    // Accept offer and create booking
    const { bookingId, paymentUrl } = await acceptOffer(openOffer);

    console.log(`Slot recovery booking created: ${bookingId}`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Failed to accept offer:", error);

    // Special handling for lock failure (slot taken)
    if (error instanceof Error && error.message === 'SLOT_TAKEN') {
      await sendSMS(from, "Sorry, this slot has just been taken by another customer.");
    } else {
      await sendSMS(from, "Sorry, something went wrong. Please contact us.");
    }

    return new Response(null, { status: 200 });
  }
}
```

---

### Step 5: Update Eligibility Filter with Cooldowns

**File:** `src/lib/slot-recovery.ts`

Update `getEligibleCustomers()`:

```typescript
import { isInCooldown } from "@/lib/redis";

export async function getEligibleCustomers(
  slotOpening: typeof slotOpenings.$inferSelect
): Promise<EligibleCustomer[]> {
  // Basic query: SMS opt-in, valid phone
  const candidates = await db
    .select({
      id: customers.id,
      phone: customers.phone,
      name: customers.name,
    })
    .from(customers)
    .where(
      and(
        eq(customers.shopId, slotOpening.shopId),
        eq(customers.smsOptIn, true),
        sql`${customers.phone} IS NOT NULL AND ${customers.phone} != ''`
      )
    )
    .orderBy(sql`random()`) // TODO: Order by most recent settled booking
    .limit(50);

  // Filter out customers in cooldown
  const eligible: EligibleCustomer[] = [];
  for (const customer of candidates) {
    const inCooldown = await isInCooldown(customer.id);
    if (!inCooldown) {
      eligible.push(customer);
    }
  }

  return eligible;
}
```

---

### Step 6: Unit Tests for Redis

**File:** `src/lib/__tests__/redis.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import {
  acquireLock,
  releaseLock,
  setCooldown,
  isInCooldown,
  getCooldownTTL,
} from '@/lib/redis';

describe('Redis locks', () => {
  it('acquires lock successfully', async () => {
    const key = `test-lock-${Date.now()}`;
    const lock = await acquireLock(key, 5);

    expect(lock.acquired).toBe(true);
    expect(lock.lockId).toBeTruthy();

    // Cleanup
    await releaseLock(key, lock.lockId!);
  });

  it('fails to acquire held lock', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock1 = await acquireLock(key, 5);
    expect(lock1.acquired).toBe(true);

    const lock2 = await acquireLock(key, 5);
    expect(lock2.acquired).toBe(false);
    expect(lock2.lockId).toBeNull();

    // Cleanup
    await releaseLock(key, lock1.lockId!);
  });

  it('releases lock if owned', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock = await acquireLock(key, 5);
    const released = await releaseLock(key, lock.lockId!);

    expect(released).toBe(true);

    // Can acquire again after release
    const lock2 = await acquireLock(key, 5);
    expect(lock2.acquired).toBe(true);

    await releaseLock(key, lock2.lockId!);
  });

  it('fails to release if not owned', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock = await acquireLock(key, 5);
    const released = await releaseLock(key, 'wrong-lock-id');

    expect(released).toBe(false);

    // Cleanup
    await releaseLock(key, lock.lockId!);
  });
});

describe('Redis cooldowns', () => {
  it('sets and checks cooldown', async () => {
    const customerId = `test-customer-${Date.now()}`;

    await setCooldown(customerId, 5); // 5 seconds

    const inCooldown = await isInCooldown(customerId);
    expect(inCooldown).toBe(true);

    const ttl = await getCooldownTTL(customerId);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(5);
  });

  it('returns false if not in cooldown', async () => {
    const customerId = `test-customer-${Date.now()}-nocooldown`;

    const inCooldown = await isInCooldown(customerId);
    expect(inCooldown).toBe(false);

    const ttl = await getCooldownTTL(customerId);
    expect(ttl).toBe(0);
  });
});
```

---

### Step 7: Integration Test for Concurrent YES

**File:** `tests/e2e/concurrent-booking.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers, appointments } from '@/lib/schema';

test('concurrent YES replies - only one books', async ({ page }) => {
  // Setup: Create slot opening
  const [slot] = await db.insert(slotOpenings).values({
    shopId: 'test-shop',
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 90000000),
    sourceAppointmentId: 'cancelled-appt',
    status: 'open',
  }).returning();

  // Setup: Create two customers
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

  // Setup: Create offers for both
  await db.insert(slotOffers).values([
    {
      slotOpeningId: slot.id,
      customerId: customer1.id,
      channel: 'sms',
      status: 'sent',
      expiresAt: new Date(Date.now() + 900000),
    },
    {
      slotOpeningId: slot.id,
      customerId: customer2.id,
      channel: 'sms',
      status: 'sent',
      expiresAt: new Date(Date.now() + 900000),
    },
  ]);

  // Simulate concurrent YES replies
  const response1 = fetch('http://localhost:3000/api/twilio/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: customer1.phone, Body: 'YES' }),
  });

  const response2 = fetch('http://localhost:3000/api/twilio/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: customer2.phone, Body: 'YES' }),
  });

  const [res1, res2] = await Promise.all([response1, response2]);

  expect(res1.status).toBe(200);
  expect(res2.status).toBe(200);

  // Verify: Exactly one booking created
  const bookings = await db.query.appointments.findMany({
    where: (table, { eq }) => eq(table.sourceSlotOpeningId, slot.id),
  });

  expect(bookings).toHaveLength(1);

  // Verify: Slot marked filled
  const updatedSlot = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slot.id),
  });

  expect(updatedSlot?.status).toBe('filled');

  // Verify: Exactly one offer accepted, one still sent
  const offers = await db.query.slotOffers.findMany({
    where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
  });

  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const sentOffers = offers.filter(o => o.status === 'sent');

  expect(acceptedOffers).toHaveLength(1);
  expect(sentOffers).toHaveLength(1);

  // Verify: Winner has cooldown set
  const winnerId = bookings[0].customerId;
  const { isInCooldown } = await import('@/lib/redis');
  const inCooldown = await isInCooldown(winnerId);

  expect(inCooldown).toBe(true);
});
```

---

## Testing Checklist

### Manual Testing

1. **Setup Upstash Redis:**
   - Get URL and token from https://console.upstash.com
   - Add to `.env`

2. **Test lock acquisition:**
   ```bash
   # Run unit tests
   pnpm test src/lib/__tests__/redis.test.ts
   ```

3. **Test concurrent YES:**
   ```bash
   # Run E2E test
   pnpm test:e2e tests/e2e/concurrent-booking.spec.ts
   ```

4. **Manual concurrent test:**
   - Send offer to 2 customers
   - Both reply YES at same time (use script)
   - Verify only one booking created

5. **Test cooldowns:**
   - Customer accepts offer
   - Verify cooldown set (query Redis or check eligibility filter skips them)

### Automated Testing

```bash
pnpm test src/lib/__tests__/redis.test.ts
pnpm test:e2e tests/e2e/concurrent-booking.spec.ts
```

---

## Acceptance Criteria

- ✅ `@upstash/redis` package installed
- ✅ Redis client configured in `src/lib/redis.ts`
- ✅ `acquireLock()` uses SET NX EX pattern
- ✅ `releaseLock()` uses Lua script for safety
- ✅ `acceptOffer()` acquires lock before booking
- ✅ Lock released in finally block (even on error)
- ✅ Lock failure throws `SLOT_TAKEN` error
- ✅ Inbound SMS handler sends "slot taken" message on lock failure
- ✅ `setCooldown()` sets 24-hour TTL key after acceptance
- ✅ `getEligibleCustomers()` filters out customers in cooldown
- ✅ Concurrent YES replies → exactly one booking
- ✅ Loser gets "slot taken" SMS
- ✅ Winner gets cooldown set
- ✅ All tests pass

---

## Dependencies

**Required:**
- V3: Acceptance flow exists without locks
- Upstash Redis account and credentials

**Provides to:**
- V5: Concurrency-safe foundation for sequential loop
- V6: Safe handling of payment failures

---

## Rollback Plan

If V4 causes issues:
1. Revert `acceptOffer()` to V3 version (comment out lock code)
2. Redis package can stay installed
3. V3 functionality still works

---

## Performance Notes

**Lock overhead:**
- Acquire: ~100ms (HTTP request to Upstash)
- Release: ~100ms
- Total: ~200ms per booking attempt

**Cooldown overhead:**
- Check per customer: ~50ms
- For 10 candidates: ~500ms total
- Acceptable for sequential offer loop

**Redis usage estimate:**
- 100 slot openings/month
- 200 lock ops + 500 cooldown checks + 100 cooldown sets
- Total: ~800 commands/month
- Well within Upstash free tier (10K/day)

---

## Notes

- Lua script ensures atomic check-and-delete for lock release
- Lock TTL (30s) is safety net if holder crashes
- Cooldown duration (24h) prevents spam but can be tuned
- "SLOT_TAKEN" error code distinguishes lock failure from other errors
