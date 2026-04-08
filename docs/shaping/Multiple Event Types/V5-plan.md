# V5 Implementation Plan: Slot Recovery Scoping

Slice goal: when a booked appointment is cancelled, the slot opening records which service was booked. When a customer accepts the recovery offer via SMS, the replacement booking is created for the same service with the correct duration and deposit.

No new UI affordances — V4 already surfaces the service name on the slot opening detail page via the two-hop join (`slotOpenings → appointments → eventTypes`). This slice adds `slotOpenings.eventTypeId` as a direct FK, which both simplifies V4's slot opening query and closes the data model.

Three changes in total:

| Step | Node | Change |
|------|------|--------|
| 1–2 | N3 | Schema + migration: add `eventTypeId` nullable FK to `slotOpenings` |
| 3 | N15 | `createSlotOpeningFromCancellation`: forward `appointment.eventTypeId` into insert |
| 4 | N16 | `acceptOffer`: resolve duration + deposit from the slot opening, forward `eventTypeId` to `createAppointment` |
| 5 | — | Unit test updates |
| 6 | — | Simplify V4's slot opening query to use the new direct FK (required — completes shaping N13) |

---

## Step 1 — Add `eventTypeId` to `slotOpenings` schema (N3)

**File:** `src/lib/schema.ts`

In the `slotOpenings` table definition, add the nullable FK after `sourceAppointmentId`:

```typescript
eventTypeId: uuid("event_type_id").references(() => eventTypes.id, {
  onDelete: "set null",
}),
```

Full field block for context:

```typescript
export const slotOpenings = pgTable(
  "slot_openings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    sourceAppointmentId: uuid("source_appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    eventTypeId: uuid("event_type_id").references(() => eventTypes.id, {  // ← add
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"open" | "filled" | "expired">()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  …
);
```

`onDelete: "set null"` is the right policy here: if a service is deleted, existing slot openings become untyped rather than disappearing.

---

## Step 2 — Generate and apply migration

```bash
pnpm db:generate
```

Review the generated SQL in `drizzle/NNNN_*.sql`. Expected output:

```sql
ALTER TABLE "slot_openings" ADD COLUMN "event_type_id" uuid;
ALTER TABLE "slot_openings" ADD CONSTRAINT "slot_openings_event_type_id_fkey"
  FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL;
```

Then apply:

```bash
pnpm db:migrate
```

**Backfill note:** Existing `slot_openings` rows will have `event_type_id = NULL` after this migration — even rows whose `source_appointment_id` points to an appointment that had an `eventTypeId`. This is an acceptable data state: pre-V5 slot openings were created without service scoping and will behave as untyped slots. If backfilling is needed, add an optional script after the migration:

```sql
UPDATE slot_openings so
SET event_type_id = a.event_type_id
FROM appointments a
WHERE a.id = so.source_appointment_id
  AND so.event_type_id IS NULL
  AND a.event_type_id IS NOT NULL;
```

Run via `pnpm db:studio` or a one-off script. This is safe to run at any time; it is idempotent.

---

## Step 3 — Propagate `eventTypeId` in `createSlotOpeningFromCancellation` (N15)

**File:** `src/lib/slot-recovery.ts`

### Change

In the `db.insert(slotOpenings).values({…})` call (line ~50), add `eventTypeId`:

```typescript
await db
  .insert(slotOpenings)
  .values({
    shopId: appointment.shopId,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    sourceAppointmentId: appointment.id,
    status: "open",
    eventTypeId: appointment.eventTypeId ?? null,  // ← add
  })
  .returning({ id: slotOpenings.id });
```

`appointment.eventTypeId` is already on the `appointments.$inferSelect` type (it was added in V1/V2). If the cancelled appointment had no service (legacy data or the default service), this is `null` and the slot opening is also untyped — backward-compatible.

No new imports needed.

---

## Step 4 — Forward event type to replacement booking in `acceptOffer` (N16)

**File:** `src/lib/slot-recovery.ts`

### Import change

Add `eventTypes` to the schema import:

```typescript
import {
  appointments,
  customerContactPrefs,
  customerNoShowStats,
  customerScores,
  customers,
  eventTypes,          // ← add
  payments,
  shopPolicies,
  shops,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
```

### Logic change

After the freshness guard (`if (!fresh || …) throw`) and before `createAppointment`, insert two blocks.

**Block 1 — resolve event type deposit (if the slot has a service):**

```typescript
let eventTypeDepositCents: number | null = null;
if (slotOpening.eventTypeId) {
  const [et] = await db
    .select({ depositAmountCents: eventTypes.depositAmountCents })
    .from(eventTypes)
    .where(eq(eventTypes.id, slotOpening.eventTypeId))
    .limit(1);
  eventTypeDepositCents = et?.depositAmountCents ?? null;
}
```

**Block 2 — derive duration from stored time range:**

```typescript
const durationMinutes = Math.round(
  (slotOpening.endsAt.getTime() - slotOpening.startsAt.getTime()) / 60000
);
```

This avoids a second DB lookup for the event type just to get duration. The `slotOpenings` row already stores the correct `endsAt` from the original appointment.

### Updated `createAppointment` call:

```typescript
const booking = await createAppointment({
  shopId: slotOpening.shopId,
  startsAt: slotOpening.startsAt,
  durationMinutes,                               // ← add
  eventTypeId: slotOpening.eventTypeId ?? null,  // ← add
  eventTypeDepositCents,                         // ← add
  customer: {
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    smsOptIn: true,
  },
  source: "slot_recovery",
  sourceSlotOpeningId: slotOpening.id,
  bookingBaseUrl,
  paymentsEnabled: true,
});
```

After the schema migration, `slotOpening` (typed as `typeof slotOpenings.$inferSelect`) automatically includes `eventTypeId: string | null`. No changes to the `OpenOffer` interface are needed.

---

## Step 5 — Unit test updates

**File:** `src/lib/__tests__/slot-recovery.test.ts`

### Fix the broken existing test

The test at line 106 asserts the exact values passed to the insert. After Step 3 adds `eventTypeId`, the expected object must include it:

```typescript
expect(valuesMock).toHaveBeenCalledWith({
  shopId: appointment.shopId,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  sourceAppointmentId: appointment.id,
  status: "open",
  eventTypeId: null,   // ← add — makeAppointment() sets eventTypeId: null
});
```

`makeAppointment()` already sets `eventTypeId: null` (line 32 of the test file), so this just adds the new field to the assertion.

### Add a new propagation test

After the existing "creates a slot opening for paid future appointment" test, add:

```typescript
it("forwards eventTypeId when appointment has a service", async () => {
  const appointment = {
    ...makeAppointment(),
    eventTypeId: "event-type-uuid-123",
  };
  const payment = makePayment("succeeded");

  await createSlotOpeningFromCancellation(appointment, payment);

  expect(valuesMock).toHaveBeenCalledWith(
    expect.objectContaining({
      eventTypeId: "event-type-uuid-123",
    })
  );
});
```

---

## Step 6 — Simplify V4's slot opening detail query to use the new direct FK

**File:** `src/app/app/slot-openings/[id]/page.tsx`

V4's Step 5 implemented a temporary two-hop join (`slotOpenings → appointments → eventTypes`) because `slotOpenings.eventTypeId` did not yet exist. Now that Step 1 adds it, shaping N13 ("left-join `eventTypes` on `slotOpenings.eventTypeId`") can be implemented correctly. This step must run as part of V5.

Replace the two-hop join:

```typescript
// Remove:
.leftJoin(appointments, eq(appointments.id, slotOpenings.sourceAppointmentId))
.leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))

// Add:
.leftJoin(eventTypes, eq(eventTypes.id, slotOpenings.eventTypeId))
```

Remove `appointments` from the `.select({…})` columns if it is no longer referenced anywhere else in the query. Remove the `appointments` import from this file if it is now unused.

Also update `eventTypeName` in the select to reference the direct join (the column reference is the same: `eventTypes.name` — no change needed there).

**Note:** The intermediate `appointments` join in V4's query was added purely as a bridge to reach `eventTypeId`. The `sourceAppointmentId` column is still selected (it is in the select list) but the join to the `appointments` table itself is no longer needed. Verify the compiled query no longer emits a JOIN on `appointments` after this change.

---

## Verification

### Automated checks

```bash
pnpm lint && pnpm typecheck
pnpm test src/lib/__tests__/slot-recovery.test.ts
```

Expected: zero errors; all slot-recovery tests pass including the new propagation test.

### Manual end-to-end checklist

**Scenario A — Slot opening captures the service**

Precondition: this flow only creates a slot opening when the cancelled booking is both future-dated and paid (`payments.status = 'succeeded'`).

1. Log in as a shop owner; ensure the shop has at least one non-default service active
2. As a customer, book a future slot for that service and complete payment
3. Navigate to the appointment in the owner dashboard → confirm `eventTypeId` is set (check `/app/appointments/[id]` shows the service name)
4. Confirm payment is captured (`payments.status = 'succeeded'`) for that appointment
5. Cancel the booking via `/manage/[token]`
6. Query `slot_openings` by `source_appointment_id` to get the generated slot opening id
7. Navigate to `/app/slot-openings/[id]` for that slot opening → confirm the service name is displayed in the Details card

If no slot opening row is created, first verify:
- the appointment start time is still in the future at cancel time
- payment for that appointment is `succeeded` (not `requires_payment_method`, `processing`, `failed`, or `canceled`)
- there is no pre-existing slot opening for the same `shop_id + starts_at` (unique slot guard)

If V5's Step 6 (query simplification) has been applied, also verify via `pnpm db:studio` or a quick query that the `slot_openings` row has a non-null `event_type_id`.

**Scenario B — Recovered booking preserves the service**

1. Continue from Scenario A (a slot opening exists with a service)
2. Trigger the offer loop manually: `POST /api/jobs/offer-loop` with the `slotOpeningId` (or wait for it to run)
3. Simulate a YES reply: in the Twilio inbound route, the path calls `acceptOffer(openOffer)`
4. The recovered appointment should appear in `/app/appointments` with the same service name in the Service column
5. Navigate to `/app/appointments/[id]` for the recovered appointment → Details card shows the correct service

**Scenario C — Null eventTypeId is backward-compatible**

1. Create a slot opening from an appointment that has no `eventTypeId` (old data or the default service)
2. Verify the slot opening is created without error
3. Verify `/app/slot-openings/[id]` shows no Service line (since `eventTypeName` is null)
4. Accept the offer — recovered booking is created successfully (falls back to `bookingSettings.slotMinutes` for duration, shop policy for deposit)

**Scenario D — Abandoned recovery is expired and slot is re-offered**

This scenario covers the case where a customer replies YES to a slot recovery SMS but never completes payment. The `expire-pending-recoveries` job (`src/app/api/jobs/expire-pending-recoveries/route.ts`) must detect the abandonment and make the slot available again.

Precondition: the shop has at least one other eligible customer who can receive a follow-up offer.

1. Continue from Scenario B (a `pending` recovery appointment exists with `sourceSlotOpeningId` set)
2. Do **not** visit the payment URL — leave the appointment in `pending` state
3. Confirm the current state via `pnpm db:studio`:
   - `appointments` row: `status = 'pending'`, `source = 'slot_recovery'`
   - `slot_openings` row: `status = 'filled'`
   - `slot_offers` row for this customer: `status = 'accepted'`
4. Trigger the expiry job with TTL overridden to zero:
   ```
   POST /api/jobs/expire-pending-recoveries?ttlHours=0
   x-cron-secret: <CRON_SECRET>
   ```
   Expected response: `{ "expired": 1, "reopened": 1, "triggered": 1, "errors": [] }`
5. Re-confirm state via `pnpm db:studio`:
   - `appointments` row: `status = 'cancelled'`
   - `slot_openings` row: `status = 'open'`
   - `slot_offers` row: `status = 'declined'`
6. Verify the offer loop was triggered: a new `slot_offers` row should appear for the next eligible customer (or check server logs for `[offer-loop]` output)
7. Confirm the expired appointment no longer appears in the owner dashboard (dashboard only shows `status = 'booked'`)

**What this proves:** a customer who abandons payment does not permanently block the slot. The slot re-enters the recovery queue and can be offered to the next customer.

**Automated coverage:** `src/app/api/jobs/expire-pending-recoveries/route.test.ts` (7 integration tests — runs against a real database when `POSTGRES_URL` is set).

### Regression check

Run the full unit test suite to confirm no existing tests are broken by the schema type change:

```bash
pnpm test
```
