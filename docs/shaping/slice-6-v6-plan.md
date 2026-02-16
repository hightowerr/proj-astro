# V6: Full Automation (Payment Failure + Dashboard)

**Goal:** Complete hands-off slot recovery with observability

**Appetite:** 0.5 day (Day 3)

**Demo:** Customer accepts but payment fails → slot reopens → next customer gets offer. Business sees slot openings in dashboard.

---

## Scope

### In Scope
- Payment failure webhook handler
- Reopen slot_opening on payment failure
- Trigger next offer after payment failure
- Dashboard UI: slot openings list
- Business can see recovery status

### Out of Scope
- Analytics/metrics (future)
- Email notifications (future)
- Customer waitlist UI (future)

---

## Implementation Steps

### Step 1: Payment Failure Detection

**File:** `src/app/api/stripe/webhook/route.ts`

Add handler for `payment_intent.payment_failed` event:

```typescript
// ... existing webhook handler

async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    // ... existing cases

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(paymentIntent);
      break;
    }

    // ... rest of handler
  }
}

/**
 * Handle payment failure for slot recovery bookings.
 *
 * If this payment was for a slot recovery booking:
 * 1. Find the slot_opening via appointment.sourceSlotOpeningId
 * 2. Reopen the slot (status='open')
 * 3. Mark the slot_offer as 'declined'
 * 4. Trigger offer loop for next customer
 */
async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  // Find payment record
  const payment = await db.query.payments.findFirst({
    where: (table, { eq }) => eq(table.stripePaymentIntentId, paymentIntent.id),
  });

  if (!payment) {
    console.log(`Payment not found for intent ${paymentIntent.id}`);
    return;
  }

  // Find appointment
  const appointment = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, payment.appointmentId),
    with: {
      slotOpening: true, // If appointment.sourceSlotOpeningId is set
    },
  });

  if (!appointment) {
    console.log(`Appointment not found for payment ${payment.id}`);
    return;
  }

  // Only handle slot recovery bookings
  if (!appointment.sourceSlotOpeningId) {
    console.log(`Appointment ${appointment.id} is not a slot recovery booking`);
    return;
  }

  console.log(`Payment failed for slot recovery booking ${appointment.id}`);

  // Reopen slot
  await db
    .update(slotOpenings)
    .set({
      status: 'open',
      updatedAt: new Date(),
    })
    .where(eq(slotOpenings.id, appointment.sourceSlotOpeningId));

  // Mark offer as declined
  await db
    .update(slotOffers)
    .set({
      status: 'declined',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(slotOffers.slotOpeningId, appointment.sourceSlotOpeningId),
        eq(slotOffers.customerId, appointment.customerId)
      )
    );

  // Trigger next offer
  const appUrl = process.env.APP_URL;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (appUrl && internalSecret) {
    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        slotOpeningId: appointment.sourceSlotOpeningId,
      }),
    });

    console.log(`Triggered next offer for slot ${appointment.sourceSlotOpeningId} after payment failure`);
  }
}
```

---

### Step 2: Dashboard UI - Slot Openings Section

**File:** `src/app/app/appointments/page.tsx`

Add slot openings section:

```typescript
import { db } from '@/lib/db';
import { slotOpenings } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function AppointmentsPage() {
  // ... existing appointments query

  // Query slot openings
  const slots = await db
    .select({
      id: slotOpenings.id,
      startsAt: slotOpenings.startsAt,
      endsAt: slotOpenings.endsAt,
      status: slotOpenings.status,
      createdAt: slotOpenings.createdAt,
      sourceAppointmentId: slotOpenings.sourceAppointmentId,
      // Join to find recovered booking (if filled)
      recoveredBooking: appointments,
    })
    .from(slotOpenings)
    .leftJoin(
      appointments,
      eq(appointments.sourceSlotOpeningId, slotOpenings.id)
    )
    .where(eq(slotOpenings.shopId, shopId))
    .orderBy(desc(slotOpenings.createdAt))
    .limit(20);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Appointments</h1>

      {/* Existing appointments list */}
      {/* ... */}

      {/* Slot Openings Section */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Slot Recovery</h2>
        <p className="text-sm text-gray-600 mb-4">
          Automatically recovering cancelled slots
        </p>

        {slots.length === 0 ? (
          <p className="text-gray-500">No slot openings yet</p>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recovered Booking
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {slot.startsAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={slot.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {slot.recoveredBooking ? (
                        <Link
                          href={`/app/appointments/${slot.recoveredBooking.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View booking
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: 'open' | 'filled' | 'expired' }) {
  const colors = {
    open: 'bg-blue-100 text-blue-800',
    filled: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}
    >
      {status}
    </span>
  );
}
```

---

### Step 3: Slot Opening Detail View (Optional)

**File:** `src/app/app/slot-openings/[id]/page.tsx` (new file, optional)

```typescript
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SlotOpeningDetailPage({ params }: PageProps) {
  const { id } = await params;

  const slot = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    with: {
      offers: {
        with: {
          customer: true,
        },
      },
    },
  });

  if (!slot) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Slot Opening Detail</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Time</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {slot.startsAt.toLocaleString()} - {slot.endsAt.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={slot.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {slot.createdAt.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="text-2xl font-bold mb-4">Offers</h2>

      {slot.offers.length === 0 ? (
        <p className="text-gray-500">No offers sent yet</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expires At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slot.offers.map((offer) => (
                <tr key={offer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {offer.customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OfferStatusBadge status={offer.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {offer.sentAt.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {offer.expiresAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  const colors = {
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
    declined: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}
```

---

### Step 4: Integration Test

**File:** `tests/e2e/payment-failure-recovery.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { db } from '@/lib/db';
import { slotOpenings, slotOffers, customers, appointments, payments } from '@/lib/schema';

test('payment failure reopens slot and offers to next customer', async ({ page }) => {
  // Setup: Create slot opening and two customers
  const [slot] = await db.insert(slotOpenings).values({
    shopId: 'test-shop',
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 90000000),
    sourceAppointmentId: 'cancelled-appt',
    status: 'open',
  }).returning();

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

  // Send offer to customer 1
  await db.insert(slotOffers).values({
    slotOpeningId: slot.id,
    customerId: customer1.id,
    channel: 'sms',
    status: 'sent',
    expiresAt: new Date(Date.now() + 900000),
  });

  // Customer 1 accepts
  await fetch('http://localhost:3000/api/twilio/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      From: customer1.phone,
      Body: 'YES',
    }),
  });

  // Verify booking created and slot filled
  let booking = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.sourceSlotOpeningId, slot.id),
  });

  expect(booking).toBeDefined();

  let slotStatus = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slot.id),
  });

  expect(slotStatus?.status).toBe('filled');

  // Simulate payment failure
  const payment = await db.query.payments.findFirst({
    where: (table, { eq }) => eq(table.appointmentId, booking!.id),
  });

  // Trigger payment failure webhook
  await fetch('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test-signature', // Mock signature
    },
    body: JSON.stringify({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: payment!.stripePaymentIntentId,
          status: 'failed',
        },
      },
    }),
  });

  // Verify slot reopened
  slotStatus = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slot.id),
  });

  expect(slotStatus?.status).toBe('open');

  // Verify customer 1's offer marked declined
  const offer1 = await db.query.slotOffers.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.slotOpeningId, slot.id),
      eq(table.customerId, customer1.id)
    ),
  });

  expect(offer1?.status).toBe('declined');

  // Verify customer 2 got new offer
  const offer2 = await db.query.slotOffers.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.slotOpeningId, slot.id),
      eq(table.customerId, customer2.id)
    ),
  });

  expect(offer2).toBeDefined();
  expect(offer2?.status).toBe('sent');
});
```

---

## Testing Checklist

### Manual Testing

1. **Test payment failure recovery:**
   - Send offer, customer accepts
   - Use Stripe test mode to create failed payment
   - Verify slot reopened
   - Verify next customer gets offer

2. **Test dashboard:**
   - Navigate to `/app/appointments`
   - Verify slot openings section shows
   - Verify status badges display correctly
   - Click "View booking" for filled slot

3. **Test detail view (if implemented):**
   - Click slot opening
   - Verify offers list shows all attempts
   - Verify status progression visible

### Automated Testing

```bash
pnpm test:e2e tests/e2e/payment-failure-recovery.spec.ts
```

---

## Acceptance Criteria

- ✅ `payment_intent.payment_failed` webhook handler added
- ✅ Handler detects slot recovery bookings
- ✅ Reopens slot_opening (status='open')
- ✅ Marks failed offer as 'declined'
- ✅ Triggers next offer via API call
- ✅ Dashboard shows slot openings list
- ✅ Status badges display correctly (open/filled/expired)
- ✅ Filled slots link to recovered booking
- ✅ Optional: Detail view shows offer history
- ✅ E2E test passes

---

## Dependencies

**Required:**
- V5: Sequential loop works
- V4: Locks prevent concurrent issues
- Stripe webhook configured

**Completes:**
- Full automation end-to-end
- Business observability

---

## Cut Strategy

If time runs short on Day 3:

**Must have:**
- Payment failure webhook handler (critical for recovery)
- Slot reopening + next offer trigger

**Nice to have:**
- Dashboard UI (backend works without it)
- Detail view (future improvement)

Backend functionality is more important than UI polish.

---

## UI Polish Notes

**Minimal viable dashboard:**
- Simple table with time, status, link
- Status badges for visual clarity
- No need for fancy charts/graphs

**Future enhancements:**
- Recovery success rate metrics
- Average time to fill
- Customer engagement analytics
- Filters and search
- Export to CSV

---

## Rollback Plan

If V6 causes issues:
1. Comment out payment failure handler in webhook
2. Dashboard UI can be hidden (no backend impact)
3. V1-V5 still provide core slot recovery

---

## Notes

- Payment failure handling is critical for complete automation
- Dashboard is nice-to-have but shows business value
- Detail view is optional polish
- Focus on backend reliability over UI perfection
- Leave TODOs for future metrics/analytics features
