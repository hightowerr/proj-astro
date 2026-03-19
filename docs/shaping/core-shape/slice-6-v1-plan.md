# V1: Slot Opening Creation

**Goal:** Cancellation creates slot opening automatically

**Appetite:** 0.5 day (Day 1 morning)

**Demo:** Cancel a paid booking → slot_opening appears in DB with status='open'

---

## Scope

### In Scope
- Create `slot_openings` table (migration)
- Create `slot_offers` table (migration)
- `createSlotOpeningFromCancellation()` helper function
- Hook into cancellation route (2 call sites)

### Out of Scope
- Offer loop triggering (V2)
- SMS sending (V2)
- Redis (V4)
- Eligibility filtering (V2)

---

## Implementation Steps

### Step 1: Database Schema

**File:** `drizzle/0010_slot_recovery.sql` (new migration)

```sql
-- slot_openings table
CREATE TABLE slot_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  source_appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'filled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_openings_unique_slot UNIQUE (shop_id, starts_at)
);

CREATE INDEX idx_slot_openings_shop_status ON slot_openings(shop_id, status);
CREATE INDEX idx_slot_openings_source ON slot_openings(source_appointment_id);

-- slot_offers table
CREATE TABLE slot_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_opening_id UUID NOT NULL REFERENCES slot_openings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'accepted', 'expired', 'declined')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_offers_unique_customer UNIQUE (slot_opening_id, customer_id)
);

CREATE INDEX idx_slot_offers_slot ON slot_offers(slot_opening_id);
CREATE INDEX idx_slot_offers_customer ON slot_offers(customer_id);
CREATE INDEX idx_slot_offers_expiry ON slot_offers(status, expires_at) WHERE status = 'sent';
```

**Drizzle schema update:**

**File:** `src/lib/schema.ts`

Add to exports:
```typescript
export const slotOpenings = pgTable(
  'slot_openings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    sourceAppointmentId: uuid('source_appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<'open' | 'filled' | 'expired'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSlot: unique().on(table.shopId, table.startsAt),
  })
);

export const slotOffers = pgTable(
  'slot_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slotOpeningId: uuid('slot_opening_id').notNull().references(() => slotOpenings.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull().$type<'sms'>(),
    status: text('status').notNull().$type<'sent' | 'accepted' | 'expired' | 'declined'>(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCustomer: unique().on(table.slotOpeningId, table.customerId),
  })
);
```

**Run migration:**
```bash
pnpm db:generate
pnpm db:migrate
```

---

### Step 2: Slot Recovery Helper

**File:** `src/lib/slot-recovery.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { appointments, payments, slotOpenings } from "@/lib/schema";

/**
 * Create a slot opening from a cancelled appointment.
 *
 * Guards:
 * - Only creates slot opening if payment succeeded (R9)
 * - Only creates slot opening if appointment time is in future
 *
 * Called from both refund and no-refund cancellation paths.
 */
export async function createSlotOpeningFromCancellation(
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect | undefined
): Promise<void> {
  // Guard: only paid bookings (R9)
  if (!payment || payment.status !== "succeeded") {
    console.log(`Skipping slot opening: appointment ${appointment.id} has no successful payment`);
    return;
  }

  // Guard: only future appointments
  if (appointment.startsAt <= new Date()) {
    console.log(`Skipping slot opening: appointment ${appointment.id} is in the past`);
    return;
  }

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

    console.log(`Created slot opening ${slotOpening.id} for cancelled appointment ${appointment.id}`);

    // TODO V2: Trigger offer loop
    // await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
    //   method: 'POST',
    //   headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
    //   body: JSON.stringify({ slotOpeningId: slotOpening.id })
    // });
  } catch (error) {
    // Non-blocking: slot opening creation should not break cancellation
    console.error(`Failed to create slot opening for appointment ${appointment.id}:`, error);

    // Check if it's a unique constraint violation (duplicate slot)
    if (error instanceof Error && error.message.includes('slot_openings_unique_slot')) {
      console.log(`Slot opening already exists for shop ${appointment.shopId} at ${appointment.startsAt}`);
    }
  }
}
```

---

### Step 3: Hook into Cancellation Route

**File:** `src/app/api/manage/[token]/cancel/route.ts`

**Import at top:**
```typescript
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";
```

**Hook 1: After refund path (after line 93)**

Before:
```typescript
      return Response.json({
        success: true,
        refunded: true,
        amount: row.payment.amountCents / 100,
        message: `Refunded $${(row.payment.amountCents / 100).toFixed(2)} to your card`,
        refundId: refundResult.refundId,
      });
```

After:
```typescript
      // Create slot opening for recovery (V1)
      await createSlotOpeningFromCancellation(row.appointment, row.payment);

      return Response.json({
        success: true,
        refunded: true,
        amount: row.payment.amountCents / 100,
        message: `Refunded $${(row.payment.amountCents / 100).toFixed(2)} to your card`,
        refundId: refundResult.refundId,
      });
```

**Hook 2: After no-refund path (after line 143, before final return)**

Before:
```typescript
    if (!updateResult.updated) {
      return Response.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Appointment cancelled. Deposit retained per cancellation policy.",
      });
    }

    return Response.json({
      success: true,
      refunded: false,
      amount: 0,
      message: "Appointment cancelled. Deposit retained per cancellation policy.",
    });
```

After:
```typescript
    if (!updateResult.updated) {
      return Response.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Appointment cancelled. Deposit retained per cancellation policy.",
      });
    }

    // Create slot opening for recovery (V1)
    await createSlotOpeningFromCancellation(row.appointment, row.payment);

    return Response.json({
      success: true,
      refunded: false,
      amount: 0,
      message: "Appointment cancelled. Deposit retained per cancellation policy.",
    });
```

---

### Step 4: Unit Tests

**File:** `src/lib/__tests__/slot-recovery.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { appointments, payments, slotOpenings } from '@/lib/schema';
import { createSlotOpeningFromCancellation } from '@/lib/slot-recovery';

describe('createSlotOpeningFromCancellation', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(slotOpenings);
  });

  it('creates slot opening for paid future appointment', async () => {
    const appointment = {
      id: 'test-appt-1',
      shopId: 'test-shop-1',
      startsAt: new Date(Date.now() + 86400000), // Tomorrow
      endsAt: new Date(Date.now() + 90000000),
      status: 'cancelled' as const,
      // ... other required fields
    };

    const payment = {
      id: 'test-payment-1',
      status: 'succeeded' as const,
      // ... other required fields
    };

    await createSlotOpeningFromCancellation(appointment, payment);

    const created = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.sourceAppointmentId, appointment.id),
    });

    expect(created).toBeDefined();
    expect(created?.status).toBe('open');
  });

  it('skips slot opening if payment not succeeded', async () => {
    const appointment = {
      id: 'test-appt-2',
      startsAt: new Date(Date.now() + 86400000),
      // ...
    };

    const payment = {
      id: 'test-payment-2',
      status: 'failed' as const,
      // ...
    };

    await createSlotOpeningFromCancellation(appointment, payment);

    const created = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.sourceAppointmentId, appointment.id),
    });

    expect(created).toBeUndefined();
  });

  it('skips slot opening if appointment is in past', async () => {
    const appointment = {
      id: 'test-appt-3',
      startsAt: new Date(Date.now() - 86400000), // Yesterday
      // ...
    };

    const payment = {
      id: 'test-payment-3',
      status: 'succeeded' as const,
      // ...
    };

    await createSlotOpeningFromCancellation(appointment, payment);

    const created = await db.query.slotOpenings.findFirst({
      where: (table, { eq }) => eq(table.sourceAppointmentId, appointment.id),
    });

    expect(created).toBeUndefined();
  });

  it('handles duplicate slot gracefully', async () => {
    const appointment = {
      id: 'test-appt-4',
      shopId: 'test-shop-2',
      startsAt: new Date(Date.now() + 86400000),
      // ...
    };

    const payment = {
      status: 'succeeded' as const,
      // ...
    };

    // Create first time
    await createSlotOpeningFromCancellation(appointment, payment);

    // Try to create again (should not throw)
    await expect(
      createSlotOpeningFromCancellation(appointment, payment)
    ).resolves.not.toThrow();
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Create paid booking:**
   ```bash
   # Use booking flow to create appointment with payment
   ```

2. **Cancel before cutoff (refund path):**
   ```bash
   curl -X POST http://localhost:3000/api/manage/{token}/cancel
   ```

3. **Query database:**
   ```bash
   pnpm db:studio
   # Check slot_openings table
   # Verify status='open', source_appointment_id matches
   ```

4. **Cancel after cutoff (no-refund path):**
   ```bash
   # Repeat steps 1-3 with appointment past cutoff
   ```

5. **Test guards:**
   - Cancel unpaid appointment → no slot opening
   - Cancel past appointment → no slot opening
   - Cancel same time twice → only one slot opening (unique constraint)

### Automated Testing

```bash
pnpm test src/lib/__tests__/slot-recovery.test.ts
```

---

## Acceptance Criteria

- ✅ Migration creates `slot_openings` and `slot_offers` tables
- ✅ Schema includes all required columns and constraints
- ✅ `createSlotOpeningFromCancellation()` creates slot opening for valid cases
- ✅ Guards prevent slot opening for unpaid or past appointments
- ✅ Unique constraint prevents duplicate slot openings
- ✅ Hook fires from both refund and no-refund cancellation paths
- ✅ Non-blocking: slot opening creation failure doesn't break cancellation
- ✅ Unit tests pass

---

## Dependencies

**Required:**
- Slice 5 cancellation route (already exists)
- Database migrations working

**Provides to:**
- V2: `slotOpenings` table exists and populated
- V2: `slotOffers` table exists for offer tracking

---

## Rollback Plan

If V1 needs to be reverted:

1. Comment out hook calls in cancel route
2. Keep migration (tables are harmless if unused)
3. Or rollback migration:
   ```bash
   pnpm db:rollback
   ```

---

## Notes

- TODO comment left in `createSlotOpeningFromCancellation()` for V2 trigger
- Console logging included for debugging (can remove later)
- Error handling is non-blocking to protect cancellation flow
- Unique constraint is critical safety feature (prevents duplicate recovery attempts)
