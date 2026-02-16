# V2: Manual Offer (Single Customer)

**Goal:** Manually trigger offer to first eligible customer

**Appetite:** 0.5 day (Day 1 afternoon)

**Demo:** POST to `/api/jobs/offer-loop` → first eligible customer receives SMS

---

## Scope

### In Scope
- `/api/jobs/offer-loop` POST endpoint
- `INTERNAL_SECRET` authentication
- `getEligibleCustomers()` - basic filtering (sms_opt_in, valid phone)
- `sendOffer()` - create slot_offer + send SMS
- Environment variables: `APP_URL`, `INTERNAL_SECRET`

### Out of Scope
- Redis cooldowns (V4)
- Automatic trigger from cancellation (V5)
- Expiry cron job (V5)
- Lock acquisition (V4)

---

## Implementation Steps

### Step 1: Environment Variables

**File:** `env.example`

Add:
```env
# Internal API Authentication
INTERNAL_SECRET=change_me_to_random_string

# Application URL (for internal service calls)
APP_URL=http://localhost:3000
```

**File:** `.env`

Set actual values:
```env
INTERNAL_SECRET=<generate random string>
APP_URL=http://localhost:3000
```

---

### Step 2: Eligibility Filter

**File:** `src/lib/slot-recovery.ts`

Add functions:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { customers } from "@/lib/schema";

interface EligibleCustomer {
  id: string;
  phone: string;
  name: string;
}

/**
 * Get eligible customers for a slot opening.
 *
 * Filters:
 * - sms_opt_in = true
 * - phone is not null
 * - Not already booked for overlapping time
 *
 * Orders by: most recent settled booking (deterministic)
 *
 * TODO V4: Check Redis cooldowns
 */
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

  // TODO V4: Filter out customers in cooldown
  // const eligible: EligibleCustomer[] = [];
  // for (const customer of candidates) {
  //   const inCooldown = await isInCooldown(customer.id);
  //   if (!inCooldown) {
  //     eligible.push(customer);
  //   }
  // }
  // return eligible;

  return candidates;
}
```

---

### Step 3: Send Offer Function

**File:** `src/lib/slot-recovery.ts`

Add:

```typescript
import { slotOffers } from "@/lib/schema";
import { sendSMS } from "@/lib/messages";

/**
 * Send an offer SMS to a customer for a slot opening.
 *
 * Creates slot_offer record with status='sent' and expires_at.
 */
export async function sendOffer(
  slotOpening: typeof slotOpenings.$inferSelect,
  customer: EligibleCustomer
): Promise<void> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Format time for SMS
  const timeStr = slotOpening.startsAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const message = `A slot opened: ${timeStr}. Reply YES to book. Deposit required.`;

  // Send SMS
  await sendSMS(customer.phone, message);

  // Create slot_offer record
  await db.insert(slotOffers).values({
    slotOpeningId: slotOpening.id,
    customerId: customer.id,
    channel: "sms",
    status: "sent",
    expiresAt,
  });

  console.log(`Sent offer to customer ${customer.id} (${customer.phone}) for slot ${slotOpening.id}`);
}
```

---

### Step 4: Offer Loop Endpoint

**File:** `src/app/api/jobs/offer-loop/route.ts` (new file)

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slotOpenings } from "@/lib/schema";
import {
  getEligibleCustomers,
  sendOffer,
} from "@/lib/slot-recovery";

export const runtime = "nodejs";

/**
 * Offer loop job: send offer to next eligible customer for a slot opening.
 *
 * Triggered from:
 * - Cancellation (V5)
 * - Expiry cron (V5)
 * - Payment failure (V6)
 *
 * Authentication: x-internal-secret header
 */
export async function POST(req: Request) {
  // Authenticate
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json(
      { error: "INTERNAL_SECRET not configured" },
      { status: 500 }
    );
  }

  const provided = req.headers.get("x-internal-secret");
  if (!provided || provided !== internalSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slotOpeningId } = body;

  if (!slotOpeningId) {
    return Response.json(
      { error: "slotOpeningId required" },
      { status: 400 }
    );
  }

  // Load slot opening
  const slotOpening = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slotOpeningId),
  });

  if (!slotOpening) {
    return Response.json(
      { error: "Slot opening not found" },
      { status: 404 }
    );
  }

  // Idempotent: skip if not open
  if (slotOpening.status !== "open") {
    return Response.json({
      success: true,
      skipped: true,
      reason: `slot_status_${slotOpening.status}`,
    });
  }

  // Get eligible customers
  const eligibleCustomers = await getEligibleCustomers(slotOpening);

  if (eligibleCustomers.length === 0) {
    // No eligible customers - mark slot expired
    await db
      .update(slotOpenings)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(slotOpenings.id, slotOpeningId));

    return Response.json({
      success: true,
      completed: true,
      reason: "no_eligible_customers",
    });
  }

  // Send offer to first customer
  const firstCustomer = eligibleCustomers[0];
  await sendOffer(slotOpening, firstCustomer);

  return Response.json({
    success: true,
    customerId: firstCustomer.id,
    customerPhone: firstCustomer.phone,
  });
}
```

---

### Step 5: Update V1 Hook (Optional for V2)

**File:** `src/lib/slot-recovery.ts`

Uncomment the TODO in `createSlotOpeningFromCancellation()`:

```typescript
// Trigger offer loop (V2)
await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-secret': process.env.INTERNAL_SECRET!,
  },
  body: JSON.stringify({ slotOpeningId: slotOpening.id }),
});
```

**Note:** This can be deferred to V5 if you want to test V2 manually first.

---

### Step 6: Unit Tests

**File:** `src/app/api/jobs/offer-loop/route.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { slotOpenings, customers, slotOffers } from '@/lib/schema';
import { POST } from './route';

describe('POST /api/jobs/offer-loop', () => {
  beforeEach(async () => {
    await db.delete(slotOffers);
    await db.delete(slotOpenings);
  });

  it('returns 401 without valid INTERNAL_SECRET', async () => {
    const req = new Request('http://localhost:3000/api/jobs/offer-loop', {
      method: 'POST',
      headers: { 'x-internal-secret': 'wrong_secret' },
      body: JSON.stringify({ slotOpeningId: 'test-id' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 400 without slotOpeningId', async () => {
    const req = new Request('http://localhost:3000/api/jobs/offer-loop', {
      method: 'POST',
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('sends offer to first eligible customer', async () => {
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
      id: 'test-customer',
      shopId: 'test-shop',
      phone: '+1234567890',
      name: 'Test Customer',
      smsOptIn: true,
    });

    const req = new Request('http://localhost:3000/api/jobs/offer-loop', {
      method: 'POST',
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.customerId).toBe('test-customer');

    // Verify slot_offer created
    const offer = await db.query.slotOffers.findFirst({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
    });

    expect(offer).toBeDefined();
    expect(offer?.status).toBe('sent');
    expect(offer?.customerId).toBe('test-customer');
  });

  it('marks slot expired if no eligible customers', async () => {
    const [slot] = await db.insert(slotOpenings).values({
      shopId: 'test-shop',
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      sourceAppointmentId: 'test-appt',
      status: 'open',
    }).returning();

    // No customers seeded

    const req = new Request('http://localhost:3000/api/jobs/offer-loop', {
      method: 'POST',
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.reason).toBe('no_eligible_customers');

    // Verify slot marked expired
    const updated = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.id, slot.id),
    });

    expect(updated?.status).toBe('expired');
  });

  it('skips if slot not open (idempotent)', async () => {
    const [slot] = await db.insert(slotOpenings).values({
      shopId: 'test-shop',
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      sourceAppointmentId: 'test-appt',
      status: 'filled', // Already filled
    }).returning();

    const req = new Request('http://localhost:3000/api/jobs/offer-loop', {
      method: 'POST',
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.skipped).toBe(true);
    expect(data.reason).toBe('slot_status_filled');
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Set environment variables:**
   ```bash
   # In .env
   INTERNAL_SECRET=test_secret_123
   APP_URL=http://localhost:3000
   ```

2. **Create test data:**
   ```bash
   pnpm db:studio
   # Create slot_opening (status='open')
   # Create customer (sms_opt_in=true, phone=+1234567890)
   ```

3. **Trigger offer loop:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/offer-loop \
     -H "Content-Type: application/json" \
     -H "x-internal-secret: test_secret_123" \
     -d '{"slotOpeningId": "<uuid>"}'
   ```

4. **Verify:**
   - Customer receives SMS
   - slot_offer record created with status='sent'
   - expires_at set to ~15 minutes from now

5. **Test edge cases:**
   - No eligible customers → slot marked 'expired'
   - Slot already filled → skipped (idempotent)
   - Wrong secret → 401 Unauthorized

### Automated Testing

```bash
pnpm test src/app/api/jobs/offer-loop
```

---

## Acceptance Criteria

- ✅ Endpoint authenticates with `x-internal-secret` header
- ✅ Loads slot_opening, returns 404 if not found
- ✅ Skips if slot status != 'open' (idempotent)
- ✅ Queries eligible customers (sms_opt_in, valid phone)
- ✅ Sends SMS to first eligible customer
- ✅ Creates slot_offer record with status='sent', expires_at
- ✅ Marks slot 'expired' if no eligible customers
- ✅ Returns structured response (success, customerId, or reason)
- ✅ Unit tests pass

---

## Dependencies

**Required:**
- V1: `slot_openings` and `slot_offers` tables exist
- Twilio: `sendSMS()` function works (from Slice 2)
- Environment: `INTERNAL_SECRET`, `APP_URL` set

**Provides to:**
- V3: Offers are sent, customers can reply YES
- V5: Endpoint ready to be triggered from cancellation/expiry

---

## Rollback Plan

If V2 needs to be reverted:
1. Don't call the endpoint (no harm if it exists)
2. Keep V1 hook commented out (manual triggering only)

---

## Notes

- TODO comments left for V4 (Redis cooldowns) and ordering by recent booking
- Random ordering is temporary - V4 will add proper ordering
- 15-minute expiry is hardcoded - could be made configurable later
- SMS message is simple - can be improved in polish phase
