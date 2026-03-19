# Spike A3: Redis Lock Pattern with Upstash

**Components:**
- A2.2: Redis cooldown check
- A4.2: Acquire Redis lock
- A4.5: Release Redis lock
- A7.4: Redis setup

**Goal:** Learn how to use Upstash Redis for slot locking and customer cooldowns, with safe concurrency patterns.

---

## Questions

| # | Question |
|---|----------|
| **A3-Q1** | How do we set up Upstash Redis client in Next.js? |
| **A3-Q2** | What's the lock acquisition pattern to prevent double booking? |
| **A3-Q3** | How do we safely release locks? |
| **A3-Q4** | How do we implement cooldowns with TTL keys? |

---

## Findings

### Q1: Upstash Redis Setup

**Package:** `@upstash/redis` (official Upstash client)

**Why this client?**
- ✅ REST-based (works in serverless/edge environments)
- ✅ No persistent connections (perfect for Next.js API routes)
- ✅ Built for Vercel/serverless platforms
- ✅ Automatic retries and error handling

**Installation:**
```bash
pnpm add @upstash/redis
```

**Client setup:**

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
```

**Environment:** Already configured in `env.example`:
```
UPSTASH_REDIS_REST_URL="https://<your-upstash>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<token>"
```

---

### Q2: Lock Acquisition Pattern

**Pattern:** SET NX EX (Set if Not eXists, with EXpiry)

**Purpose:** Prevent concurrent YES replies from booking the same slot twice.

**Implementation:**

```typescript
// src/lib/redis.ts

export interface LockResult {
  acquired: boolean;
  lockId: string | null;
}

/**
 * Acquire a distributed lock with automatic expiry.
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

  // Generate unique lock ID to ensure we only release our own locks
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  // SET NX EX: Set if Not eXists, with EXpiry
  const result = await redis.set(key, lockId, {
    nx: true,  // Only set if key doesn't exist
    ex: ttlSeconds,  // Expire after N seconds (safety net)
  });

  return {
    acquired: result === 'OK',
    lockId: result === 'OK' ? lockId : null,
  };
}
```

**Key pattern:**
```
slot_lock:{shopId}:{startsAt}
```

**Example:**
```
slot_lock:01234567-89ab-cdef-0123-456789abcdef:2024-01-15T10:00:00.000Z
```

**Why unique lockId?**
- Prevents releasing someone else's lock
- Ensures only the lock owner can release it
- Critical for safety in concurrent scenarios

**TTL (Time To Live):**
- Default: 30 seconds
- Safety net: If holder crashes, lock auto-expires
- Should be longer than expected operation time (~5 seconds)

---

### Q3: Lock Release Pattern

**Pattern:** DEL with ownership check (Lua script for atomicity)

**Purpose:** Safely release lock ONLY if we still own it.

**Implementation:**

```typescript
// src/lib/redis.ts

/**
 * Release a distributed lock if we still own it.
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
  // Only delete if the value matches our lockId
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
```

**Why Lua script?**
- **Atomicity:** Check and delete happen as one operation
- **Safety:** Can't accidentally delete someone else's lock
- **Race condition prevention:** No window between GET and DEL

**Scenarios:**

| Scenario | Behavior |
|----------|----------|
| Lock exists, we own it | ✅ Delete, return true |
| Lock exists, someone else owns it | ❌ Don't delete, return false |
| Lock doesn't exist (expired) | ❌ Don't delete, return false |
| Lock expired, someone else acquired it | ❌ Don't delete, return false |

---

### Q4: Cooldown Pattern

**Purpose:** Prevent spamming customers with offers (e.g., max 1 offer per 24 hours).

**Pattern:** TTL key with SETEX

**Implementation:**

```typescript
// src/lib/redis.ts

/**
 * Set a cooldown for a customer.
 *
 * @param customerId - Customer UUID
 * @param durationSeconds - Cooldown duration (default: 86400 = 24 hours)
 */
export async function setCooldown(
  customerId: string,
  durationSeconds: number = 86400  // 24 hours
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

**Key pattern:**
```
offer_cooldown:{customerId}
```

**Example:**
```
offer_cooldown:01234567-89ab-cdef-0123-456789abcdef
```

**TTL behavior:**
- Key exists → Customer in cooldown
- Key doesn't exist → Customer available for offers
- TTL auto-decrements → No manual cleanup needed

**Usage in eligibility filter (A2.2):**

```typescript
// src/lib/slot-recovery.ts

async function getEligibleCustomers(
  slotOpening: SlotOpening
): Promise<Customer[]> {
  // 1. Query customers with basic filters
  const candidates = await db.query.customers.findMany({
    where: (table, { eq }) => and(
      eq(table.shopId, slotOpening.shopId),
      eq(table.smsOptIn, true),
      // ... other filters
    ),
  });

  // 2. Check Redis cooldowns
  const eligible: Customer[] = [];
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

## Complete Usage Example

**Accept offer flow (A4 - Inbound SMS handler):**

```typescript
// src/app/api/twilio/inbound/route.ts

import { acquireLock, releaseLock, setCooldown } from '@/lib/redis';

export async function POST(req: Request) {
  // ... parse SMS, identify customer, find slot_opening

  const lockKey = `slot_lock:${slotOpening.shopId}:${slotOpening.startsAt}`;

  // Acquire lock
  const lock = await acquireLock(lockKey, 30);

  if (!lock.acquired) {
    // Someone else is processing this slot
    await sendSMS(customer.phone, "Sorry, this slot has just been taken.");
    return Response.json({ success: false, reason: 'lock_failed' });
  }

  try {
    // Check slot still open (might have changed while acquiring lock)
    const freshSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.id, slotOpening.id),
    });

    if (freshSlot?.status !== 'open') {
      await sendSMS(customer.phone, "Sorry, this slot has just been taken.");
      return Response.json({ success: false, reason: 'slot_taken' });
    }

    // Create booking + payment
    const booking = await createBookingWithPayment(slotOpening, customer);

    // Update slot opening
    await db.update(slotOpenings)
      .set({ status: 'filled', updatedAt: new Date() })
      .where(eq(slotOpenings.id, slotOpening.id));

    // Update offer
    await db.update(slotOffers)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(slotOffers.id, offer.id));

    // Set cooldown (prevent customer from getting more offers soon)
    await setCooldown(customer.id, 86400); // 24 hours

    // Send confirmation
    await sendSMS(customer.phone, `Booking confirmed! Pay here: ${booking.paymentUrl}`);

    return Response.json({ success: true, bookingId: booking.id });

  } finally {
    // Always release lock (even if error)
    if (lock.lockId) {
      await releaseLock(lockKey, lock.lockId);
    }
  }
}
```

---

## Lock Safety Analysis

### Scenario 1: Two concurrent YES replies
**Timeline:**
```
T0: Customer A replies YES, acquires lock → OK
T0: Customer B replies YES, tries to acquire same lock → FAIL (key exists)
T1: A creates booking, releases lock
T2: B receives "slot taken" SMS
```

✅ **Result:** Only A books the slot. B gets immediate feedback.

---

### Scenario 2: Lock holder crashes
**Timeline:**
```
T0: Customer A replies YES, acquires lock (TTL=30s)
T1: API crashes before releasing lock
T30: Lock expires automatically
T31: Customer B replies YES, acquires lock → OK
```

✅ **Result:** Lock auto-expires, doesn't poison the slot.

---

### Scenario 3: Lock expires while holder is working
**Timeline:**
```
T0: Customer A replies YES, acquires lock (TTL=30s)
T29: A finishes work, tries to release lock
T30: Lock expired 1 second ago, B acquired it
T29: A's release fails (lockId doesn't match) → safe
```

✅ **Result:** A can't accidentally delete B's lock. Lua script prevents this.

---

### Scenario 4: Payment failure after booking created
**Timeline:**
```
T0: Customer A replies YES, acquires lock
T1: Booking created, slot marked 'filled'
T2: Stripe payment fails
T3: Payment webhook reopens slot
T4: Trigger offer loop for next customer
```

✅ **Result:** Lock already released at T2. New offer loop can acquire lock for next customer.

---

## Performance Considerations

**Upstash Redis REST API:**
- Latency: ~50-150ms per operation (HTTP request to Upstash)
- Throughput: Effectively unlimited (serverless, auto-scales)
- Pricing: $0.20 per 100K commands (Upstash free tier: 10K commands/day)

**Lock operations per slot opening:**
- 1 × acquire lock (SET NX EX): ~100ms
- 1 × release lock (EVAL): ~100ms
- **Total: ~200ms overhead per booking attempt**

**Cooldown operations per offer sent:**
- 1 × check cooldown (GET): ~50ms per customer
- 1 × set cooldown (SETEX): ~50ms (after offer accepted)

**Estimated usage for 100 slot openings/month:**
- 100 lock acquires + 100 lock releases = 200 commands
- 500 cooldown checks (5 customers per slot) = 500 commands
- 100 cooldown sets = 100 commands
- **Total: ~800 commands/month** (well within free tier)

---

## Error Handling

### Lock acquisition timeout
If acquiring lock takes >10 seconds (network issue), fail gracefully:

```typescript
const lockPromise = acquireLock(lockKey);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Lock timeout')), 10000)
);

try {
  const lock = await Promise.race([lockPromise, timeoutPromise]);
  // ... proceed
} catch (error) {
  return Response.json({ error: 'Service temporarily unavailable' }, { status: 503 });
}
```

### Redis unavailable
If Upstash is down, fail fast with clear error:

```typescript
try {
  const lock = await acquireLock(lockKey);
} catch (error) {
  console.error('Redis error:', error);
  // DON'T create booking without lock - fail instead
  return Response.json({ error: 'Unable to process request' }, { status: 503 });
}
```

**Critical:** Never proceed without lock. Double booking is worse than temporary unavailability.

---

## Testing Strategy

### Unit tests (mock Redis)
```typescript
// src/lib/__tests__/redis.test.ts

describe('Redis locks', () => {
  it('acquires lock if available', async () => {
    // Mock redis.set to return 'OK'
    const lock = await acquireLock('test-key');
    expect(lock.acquired).toBe(true);
    expect(lock.lockId).toBeTruthy();
  });

  it('fails to acquire if lock held', async () => {
    // Mock redis.set to return null (key exists)
    const lock = await acquireLock('test-key');
    expect(lock.acquired).toBe(false);
    expect(lock.lockId).toBeNull();
  });

  it('releases lock if owned', async () => {
    // Mock redis.eval to return 1
    const released = await releaseLock('test-key', 'lock-123');
    expect(released).toBe(true);
  });

  it('fails to release if not owned', async () => {
    // Mock redis.eval to return 0
    const released = await releaseLock('test-key', 'wrong-id');
    expect(released).toBe(false);
  });
});
```

### Integration tests (real Upstash)
```typescript
// tests/redis-locks.integration.test.ts

describe('Redis locks (integration)', () => {
  it('prevents concurrent lock acquisition', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock1 = await acquireLock(key);
    const lock2 = await acquireLock(key);

    expect(lock1.acquired).toBe(true);
    expect(lock2.acquired).toBe(false);

    await releaseLock(key, lock1.lockId!);
  });

  it('allows acquisition after release', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock1 = await acquireLock(key);
    await releaseLock(key, lock1.lockId!);

    const lock2 = await acquireLock(key);
    expect(lock2.acquired).toBe(true);

    await releaseLock(key, lock2.lockId!);
  });

  it('lock auto-expires', async () => {
    const key = `test-lock-${Date.now()}`;

    const lock1 = await acquireLock(key, 2); // 2 second TTL
    await sleep(3000); // Wait 3 seconds

    const lock2 = await acquireLock(key);
    expect(lock2.acquired).toBe(true); // Lock expired

    await releaseLock(key, lock2.lockId!);
  });
});
```

### E2E test (concurrent YES replies)
```typescript
// tests/e2e/concurrent-booking.spec.ts

test('two concurrent YES replies - only one books', async ({ page, context }) => {
  // 1. Create slot opening
  const slotOpening = await createSlotOpening();

  // 2. Simulate two concurrent SMS replies
  const response1 = fetch('/api/twilio/inbound', {
    method: 'POST',
    body: { From: customer1.phone, Body: 'YES' },
  });

  const response2 = fetch('/api/twilio/inbound', {
    method: 'POST',
    body: { From: customer2.phone, Body: 'YES' },
  });

  const [res1, res2] = await Promise.all([response1, response2]);

  // 3. Assert: exactly one succeeded, one failed
  const results = [await res1.json(), await res2.json()];
  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;

  expect(successes).toBe(1);
  expect(failures).toBe(1);

  // 4. Assert: slot opening marked 'filled'
  const freshSlot = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slotOpening.id),
  });
  expect(freshSlot?.status).toBe('filled');

  // 5. Assert: exactly one booking created
  const bookings = await db.query.appointments.findMany({
    where: (table, { eq }) => eq(table.sourceSlotOpeningId, slotOpening.id),
  });
  expect(bookings).toHaveLength(1);
});
```

---

## Acceptance

✅ Spike is complete. We can describe:

1. **Setup:** `@upstash/redis` package + `src/lib/redis.ts` client
2. **Lock acquisition:** `acquireLock()` using SET NX EX with unique lockId
3. **Lock release:** `releaseLock()` using Lua script for atomic check-and-delete
4. **Cooldowns:** `setCooldown()` / `isInCooldown()` using TTL keys
5. **Safety:** Lua script prevents releasing wrong lock, TTL prevents poisoning
6. **Performance:** ~200ms overhead per booking, ~800 commands/month usage

**Flagged unknowns resolved:**
- A2.2: Redis cooldown check ✅
- A4.2: Acquire Redis lock ✅
- A4.5: Release Redis lock ✅
- A7.4: Redis setup ✅

**All unknowns resolved: 11/11** ✅

---

## Dependencies

This spike requires:
- **Package:** `pnpm add @upstash/redis`
- **Environment:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (already in env.example)
- **File:** `src/lib/redis.ts` (new file with helper functions)
