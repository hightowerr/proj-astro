# V3: Accept Offer (Without Locks)

**Goal:** Customer replies YES → creates booking

**Appetite:** 0.5 day (Day 1 evening)

**Demo:** Customer receives offer (V2) → replies "YES" → booking + payment created → confirmation SMS sent

**Risk:** No concurrency safety yet - two simultaneous YES replies could double book. V4 will fix with Redis locks.

---

## Scope

### In Scope
- Update `/api/twilio/inbound` to handle YES replies
- `findLatestOpenOffer()` - match phone to offer
- `acceptOffer()` - WITHOUT locks (simplified for V3)
- Create booking + payment intent (reuse Slice 2 logic)
- Send confirmation SMS
- Update slot_opening and slot_offer status

### Out of Scope
- Redis locks (V4)
- Cooldowns (V4)
- "Slot taken" message for losers (V4)
- Concurrent YES handling (V4)

---

## Implementation Steps

### Step 1: Find Latest Open Offer

**File:** `src/lib/slot-recovery.ts`

Add function:

```typescript
import { desc } from "drizzle-orm";

interface OpenOffer {
  offer: typeof slotOffers.$inferSelect;
  slotOpening: typeof slotOpenings.$inferSelect;
  customer: {
    id: string;
    phone: string;
    name: string;
  };
}

/**
 * Find the latest open offer for a phone number.
 *
 * Returns the most recent offer WHERE:
 * - customer.phone matches
 * - slot_offer.status = 'sent'
 * - slot_opening.status = 'open'
 *
 * @param phone - Customer phone number (E.164 format)
 * @returns Open offer or null if none found
 */
export async function findLatestOpenOffer(
  phone: string
): Promise<OpenOffer | null> {
  const result = await db
    .select({
      offer: slotOffers,
      slotOpening: slotOpenings,
      customer: {
        id: customers.id,
        phone: customers.phone,
        name: customers.name,
      },
    })
    .from(slotOffers)
    .innerJoin(slotOpenings, eq(slotOpenings.id, slotOffers.slotOpeningId))
    .innerJoin(customers, eq(customers.id, slotOffers.customerId))
    .where(
      and(
        eq(customers.phone, phone),
        eq(slotOffers.status, "sent"),
        eq(slotOpenings.status, "open")
      )
    )
    .orderBy(desc(slotOffers.sentAt))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
}
```

---

### Step 2: Accept Offer (Simplified)

**File:** `src/lib/slot-recovery.ts`

Add function:

```typescript
import { createBooking } from "@/lib/booking";

/**
 * Accept an offer and create booking.
 *
 * V3: Simplified version without Redis locks.
 * V4: Will add lock acquisition/release for concurrency safety.
 *
 * Steps:
 * 1. Create booking + payment intent
 * 2. Update slot_opening status='filled'
 * 3. Update slot_offer status='accepted'
 * 4. Send confirmation SMS
 *
 * @returns Booking ID and payment URL
 */
export async function acceptOffer(
  openOffer: OpenOffer
): Promise<{ bookingId: string; paymentUrl: string }> {
  const { offer, slotOpening, customer } = openOffer;

  // TODO V4: Acquire Redis lock here
  // const lockKey = `slot_lock:${slotOpening.shopId}:${slotOpening.startsAt.toISOString()}`;
  // const lock = await acquireLock(lockKey, 30);
  // if (!lock.acquired) {
  //   throw new Error('Slot already taken');
  // }

  try {
    // Re-check slot still open (might have changed)
    const freshSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.id, slotOpening.id),
    });

    if (!freshSlot || freshSlot.status !== "open") {
      throw new Error("Slot no longer available");
    }

    // Create booking + payment (reuse Slice 2 logic)
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

    // TODO V4: Set cooldown for customer
    // await setCooldown(customer.id, 86400); // 24 hours

    return {
      bookingId: booking.id,
      paymentUrl,
    };
  } finally {
    // TODO V4: Release lock here
    // if (lock.lockId) {
    //   await releaseLock(lockKey, lock.lockId);
    // }
  }
}
```

---

### Step 3: Update Inbound SMS Handler

**File:** `src/app/api/twilio/inbound/route.ts`

Update the POST handler to handle YES replies:

```typescript
import { findLatestOpenOffer, acceptOffer } from "@/lib/slot-recovery";

export async function POST(request: Request) {
  // ... existing Twilio signature verification

  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string)?.trim().toUpperCase();

  // Handle YES replies for slot recovery
  if (body === "YES") {
    try {
      const openOffer = await findLatestOpenOffer(from);

      if (!openOffer) {
        // No open offer found
        await sendSMS(from, "No active offers found. Please contact us.");
        return new Response(null, { status: 200 });
      }

      // Accept offer and create booking
      const { bookingId, paymentUrl } = await acceptOffer(openOffer);

      console.log(`Slot recovery booking created: ${bookingId} for customer ${openOffer.customer.id}`);

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Failed to accept offer:", error);

      // TODO V4: Send "slot taken" message here
      await sendSMS(from, "Sorry, something went wrong. Please try again or contact us.");

      return new Response(null, { status: 200 });
    }
  }

  // ... existing SMS handler logic (booking confirmations, etc.)

  return new Response(null, { status: 200 });
}
```

---

### Step 4: Update Booking Creation

**File:** `src/lib/booking.ts`

Update `createBooking()` to support slot recovery source:

```typescript
export interface CreateBookingInput {
  shopId: string;
  customerId: string;
  startsAt: Date;
  endsAt: Date;
  source: "web" | "slot_recovery"; // Add slot_recovery
  sourceSlotOpeningId?: string; // Add optional reference
}

export async function createBooking(input: CreateBookingInput) {
  // ... existing booking creation logic

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: input.shopId,
      customerId: input.customerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "booked",
      paymentRequired: true,
      source: input.source, // Include source
      sourceSlotOpeningId: input.sourceSlotOpeningId, // Include reference
      // ... other fields
    })
    .returning();

  // ... rest of booking creation (payment intent, etc.)

  return {
    id: appointment.id,
    paymentId: payment.id,
    paymentUrl: `${process.env.APP_URL}/pay/${payment.id}`,
  };
}
```

**Schema update:**

**File:** `src/lib/schema.ts`

Add to `appointments` table:
```typescript
export const appointments = pgTable('appointments', {
  // ... existing columns
  source: text('source').$type<'web' | 'slot_recovery'>(),
  sourceSlotOpeningId: uuid('source_slot_opening_id').references(() => slotOpenings.id),
  // ... existing columns
});
```

**Migration:**

**File:** `drizzle/0011_appointment_source.sql`

```sql
ALTER TABLE appointments ADD COLUMN source TEXT;
ALTER TABLE appointments ADD COLUMN source_slot_opening_id UUID REFERENCES slot_openings(id);

CREATE INDEX idx_appointments_source_slot ON appointments(source_slot_opening_id);
```

---

### Step 5: Integration Test

**File:** `tests/e2e/slot-recovery.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers, appointments } from '@/lib/schema';

test.describe('Slot Recovery E2E', () => {
  test('customer accepts offer via SMS', async ({ page }) => {
    // Setup: Create slot opening
    const [slot] = await db.insert(slotOpenings).values({
      shopId: 'test-shop',
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      sourceAppointmentId: 'cancelled-appt',
      status: 'open',
    }).returning();

    // Setup: Create customer
    const [customer] = await db.insert(customers).values({
      shopId: 'test-shop',
      phone: '+15555551234',
      name: 'Test Customer',
      email: 'test@example.com',
      smsOptIn: true,
    }).returning();

    // Setup: Create offer
    await db.insert(slotOffers).values({
      slotOpeningId: slot.id,
      customerId: customer.id,
      channel: 'sms',
      status: 'sent',
      expiresAt: new Date(Date.now() + 900000), // 15 min
    });

    // Simulate SMS reply: YES
    const response = await fetch('http://localhost:3000/api/twilio/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: '+15555551234',
        Body: 'YES',
      }),
    });

    expect(response.status).toBe(200);

    // Verify: Booking created
    const booking = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.sourceSlotOpeningId, slot.id),
    });

    expect(booking).toBeDefined();
    expect(booking?.status).toBe('booked');

    // Verify: Slot marked filled
    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.id, slot.id),
    });

    expect(updatedSlot?.status).toBe('filled');

    // Verify: Offer marked accepted
    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { and, eq }) => and(
        eq(table.slotOpeningId, slot.id),
        eq(table.customerId, customer.id)
      ),
    });

    expect(updatedOffer?.status).toBe('accepted');
    expect(updatedOffer?.acceptedAt).toBeTruthy();
  });

  test('customer replies YES with no open offer', async ({ page }) => {
    // Simulate SMS reply without prior offer
    const response = await fetch('http://localhost:3000/api/twilio/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: '+15555559999',
        Body: 'YES',
      }),
    });

    expect(response.status).toBe(200);

    // Verify: No booking created
    const bookings = await db.query.appointments.findMany({
      where: (table, { isNotNull }) => isNotNull(table.sourceSlotOpeningId),
    });

    expect(bookings).toHaveLength(0);
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Send offer (V2):**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/offer-loop \
     -H "x-internal-secret: $INTERNAL_SECRET" \
     -d '{"slotOpeningId": "<uuid>"}'
   ```

2. **Simulate YES reply:**
   ```bash
   # Use Twilio test credentials or ngrok for webhook
   curl -X POST http://localhost:3000/api/twilio/inbound \
     -d "From=%2B15555551234&Body=YES"
   ```

3. **Verify:**
   - Booking created in DB
   - Payment intent created
   - slot_opening status='filled'
   - slot_offer status='accepted'
   - Confirmation SMS sent

4. **Test edge cases:**
   - Reply YES with no offer → "No active offers" message
   - Reply YES after slot filled → Error handling

### Automated Testing

```bash
pnpm test:e2e tests/e2e/slot-recovery.spec.ts
```

---

## Acceptance Criteria

- ✅ Migration adds `source` and `source_slot_opening_id` to appointments
- ✅ `findLatestOpenOffer()` matches phone to most recent open offer
- ✅ `acceptOffer()` creates booking + payment intent
- ✅ Booking references slot_opening via `source_slot_opening_id`
- ✅ slot_opening status updated to 'filled'
- ✅ slot_offer status updated to 'accepted' with acceptedAt timestamp
- ✅ Confirmation SMS sent with payment link
- ✅ Inbound SMS handler processes "YES" (case insensitive)
- ✅ No open offer → helpful error message
- ✅ E2E test passes

---

## Known Limitations (Fixed in V4)

⚠️ **Race Condition Risk:**
- Two customers reply YES simultaneously → both might create bookings
- No lock prevents concurrent access to same slot
- Acceptable for V3 testing, critical fix in V4

⚠️ **No Cooldown:**
- Same customer could get multiple offers immediately
- V4 will add cooldowns after acceptance

⚠️ **No "Slot Taken" Message:**
- Loser gets generic error message
- V4 will detect lock failure and send specific message

---

## Dependencies

**Required:**
- V2: Offers are being sent, customers have slot_offer records
- Slice 2: `createBooking()` function exists and works
- Twilio: Inbound webhook configured

**Provides to:**
- V4: Basic acceptance flow works, ready for locks
- V6: End-to-end booking creation from recovery

---

## Rollback Plan

If V3 needs to be reverted:
1. Comment out YES handling in inbound SMS route
2. Keep schema changes (harmless)
3. V2 still works for sending offers

---

## Notes

- TODO comments left for V4 (locks, cooldowns, "slot taken" message)
- Payment URL assumes `/pay/{paymentId}` route exists
- Confirmation SMS message is simple - can be improved
- `acceptOffer()` has try/finally structure ready for lock release in V4
