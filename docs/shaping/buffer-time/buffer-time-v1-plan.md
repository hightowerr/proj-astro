# Buffer Time V1: Wire-up + Snapshot

**Slice:** V1 of 2
**Status:** PENDING
**Goal:** Make `bufferMinutes` actually enforce — slots during a buffer window disappear, and the creation guard closes the API bypass.

---

## What This Slice Does

- Adds `effectiveBufferAfterMinutes` column to `appointments` (Option X snapshot)
- Wires `getAvailabilityForDate()` to read that column and expand the blocked window
- Wires `createAppointment()` to resolve + write the buffer snapshot, and enforce it in the overlap guard
- Passes `eventTypeBufferMinutes` through from the booking route to `createAppointment()`

## What This Slice Does NOT Do

- Shop-level default buffer (`bookingSettings.defaultBufferMinutes`) — V2
- Settings UI changes — V2
- `bufferBefore` — deferred
- Option range expansion (0/5/10 → 60) — deferred

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/schema.ts` | Make `eventTypes.bufferMinutes` nullable; add `effectiveBufferAfterMinutes` to `appointments` |
| `src/app/app/settings/services/actions.ts` | `createDefaultEventType` sets `bufferMinutes: 0` explicitly — change to `null` |
| `drizzle/` | Generated migration (do not edit manually) |
| `src/lib/queries/appointments.ts` | Wire availability filter + overlap guard + resolver |
| `src/app/api/bookings/create/route.ts` | Pass `eventTypeBufferMinutes` to `createAppointment()` |
| `src/lib/__tests__/buffer-time.test.ts` | New test file |

---

## Implementation Steps

### Step 1: Schema — two changes

**File:** `src/lib/schema.ts`

**1a. Make `eventTypes.bufferMinutes` nullable**

Change:
```typescript
// Before
bufferMinutes: integer("buffer_minutes").notNull().default(0),

// After
bufferMinutes: integer("buffer_minutes"),
```

Remove `.notNull().default(0)`. The check constraint `IN (0, 5, 10)` stays — PostgreSQL does not fail a CHECK when the value is NULL (NULL is treated as unknown, not false), so null values pass cleanly.

Semantics after this change:
- `null` = inherit from shop default (V2 adds this)
- `0` = explicitly no buffer on this service
- `5` / `10` = explicit buffer value

Existing rows with `bufferMinutes = 0` keep their value (explicit no-buffer). Shop owners who want inheritance set their services to "Shop default" in the UI once V2 ships.

**1b. Add `effectiveBufferAfterMinutes` to `appointments`**

In the `appointments` table, add after `eventTypeId`:

```typescript
effectiveBufferAfterMinutes: integer("effective_buffer_after_minutes")
  .notNull()
  .default(0),
```

Then generate and run the migration:

```bash
pnpm db:generate
# Review the generated SQL — should be two changes: DROP NOT NULL on event_types,
# and ADD COLUMN on appointments. No destructive ops.
pnpm db:migrate
```

**Expected migration SQL:**
```sql
ALTER TABLE "event_types"
  ALTER COLUMN "buffer_minutes" DROP NOT NULL,
  ALTER COLUMN "buffer_minutes" DROP DEFAULT;

ALTER TABLE "appointments"
  ADD COLUMN "effective_buffer_after_minutes" integer NOT NULL DEFAULT 0;
```

All existing appointment rows get 0 — correct, they were booked with no buffer policy.

**1c. Fix `createDefaultEventType` in services actions**

**File:** `src/app/app/settings/services/actions.ts`

`createDefaultEventType` explicitly inserts `bufferMinutes: 0`. With the column now nullable, this should become `null` so new default services inherit the shop default once V2 ships:

```typescript
// Before
bufferMinutes: 0,

// After
bufferMinutes: null,
```

---

### Step 2: Wire availability filter

**File:** `src/lib/queries/appointments.ts` — `getAvailabilityForDate()`

**2a. Add `effectiveBufferAfterMinutes` to the `bookedSlots` SELECT:**

```typescript
// Before
const bookedSlots = await db
  .select({
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
  })

// After
const bookedSlots = await db
  .select({
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    effectiveBufferAfterMinutes: appointments.effectiveBufferAfterMinutes,
  })
```

**2b. Expand the DB fetch window to cover prior-day buffer spillover:**

An appointment ending just before midnight with a non-zero buffer can block slots at the start of the next day. The raw `endsAt > dayStart` predicate excludes it. Expand the lower bound by the maximum possible buffer (10 min per schema `IN (0,5,10)`) so those appointments are fetched:

```typescript
const MAX_BUFFER_MS = 10 * 60_000;
// ...
gt(appointments.endsAt, new Date(start.getTime() - MAX_BUFFER_MS)),
```

**2c. Expand the blocked window in the overlap test:**

```typescript
// Before
const overlaps = bookedSlots.some(
  (booked) =>
    slot.startsAt.getTime() < booked.endsAt.getTime() &&
    slot.endsAt.getTime() > booked.startsAt.getTime()
);

// After
const overlaps = bookedSlots.some((booked) => {
  const blockedEnd =
    booked.endsAt.getTime() +
    booked.effectiveBufferAfterMinutes * 60_000;
  return (
    slot.startsAt.getTime() < blockedEnd &&
    slot.endsAt.getTime() > booked.startsAt.getTime()
  );
});
```

---

### Step 3: Extend `createAppointment()` input + resolver

**File:** `src/lib/queries/appointments.ts` — `createAppointment()` input type

Add `eventTypeBufferMinutes` to the input parameter type (alongside the existing `eventTypeDepositCents`):

```typescript
// Add to the input type
eventTypeBufferMinutes?: number | null;
```

**Resolve the effective buffer** inside the transaction, after `effectiveDurationMinutes` is resolved (around line 727):

```typescript
const effectiveBufferAfterMinutes = input.eventTypeBufferMinutes ?? 0;
```

**Extend the overlap guard** to use buffer-expanded blocked windows on existing appointments. Replace the `gt(appointments.endsAt, input.startsAt)` condition:

```typescript
// Before
const overlapping = await tx
  .select({ id: appointments.id })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, input.shopId),
      inArray(appointments.status, ["booked", "pending"]),
      lt(appointments.startsAt, endsAt),
      gt(appointments.endsAt, input.startsAt)
    )
  )
  .limit(1);

// After
const overlapping = await tx
  .select({ id: appointments.id })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, input.shopId),
      inArray(appointments.status, ["booked", "pending"]),
      lt(appointments.startsAt, endsAt),
      sql`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${input.startsAt}`
    )
  )
  .limit(1);
```

**Write `effectiveBufferAfterMinutes` to the INSERT** (around line 868, in `appointmentValues`):

```typescript
const appointmentValues: typeof appointments.$inferInsert = {
  // ...existing fields...
  effectiveBufferAfterMinutes,   // add this
};
```

---

### Step 4: Pass `eventTypeBufferMinutes` through the booking route

**File:** `src/app/api/bookings/create/route.ts`

The event type is already fetched (line 137). Add `bufferMinutes` to what gets passed through:

```typescript
// Before
let effectiveDurationMinutes = bookingSettings.slotMinutes;
let eventTypeDepositCents: number | null = null;

if (parsed.data.eventTypeId) {
  const eventType = await getEventTypeById(parsed.data.eventTypeId);
  if (!eventType || eventType.shopId !== shop.id || !eventType.isActive) {
    return Response.json({ error: "Event type not found" }, { status: 404 });
  }
  effectiveDurationMinutes = eventType.durationMinutes;
  eventTypeDepositCents = eventType.depositAmountCents;
}

// After
let effectiveDurationMinutes = bookingSettings.slotMinutes;
let eventTypeDepositCents: number | null = null;
let eventTypeBufferMinutes: number | null = null;

if (parsed.data.eventTypeId) {
  const eventType = await getEventTypeById(parsed.data.eventTypeId);
  if (!eventType || eventType.shopId !== shop.id || !eventType.isActive) {
    return Response.json({ error: "Event type not found" }, { status: 404 });
  }
  effectiveDurationMinutes = eventType.durationMinutes;
  eventTypeDepositCents = eventType.depositAmountCents;
  eventTypeBufferMinutes = eventType.bufferMinutes;   // add this
}
```

And pass it to `createAppointment()`:

```typescript
const result = await createAppointment({
  // ...existing fields...
  eventTypeDepositCents,
  eventTypeBufferMinutes,   // add this
});
```

---

## How I Will Test This

### 1. Migration check

```bash
pnpm db:generate
# Inspect drizzle/NNNN_*.sql — confirm single ADD COLUMN, no destructive ops
pnpm db:migrate
```

### 2. Type check

```bash
pnpm typecheck
```

Catches: missing field in INSERT, type mismatch on `effectiveBufferAfterMinutes`, incorrect SQL template usage.

### 3. Lint

```bash
pnpm lint
```

### 4. Unit tests — new test file

**File:** `src/lib/__tests__/buffer-time.test.ts`

Tests I will write and run:

```bash
pnpm test src/lib/__tests__/buffer-time.test.ts
```

**Test cases:**

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Slot immediately after booked appointment (buffer=10) | Slot filtered out |
| T2 | Slot 9 min after booked appointment (buffer=10) | Slot filtered out (still inside buffer window) |
| T3 | Slot 10 min after booked appointment (buffer=10) | Slot available (boundary is exclusive: starts exactly at blockedEnd) |
| T3b | Slot 11 min after booked appointment (buffer=10) | Slot available |
| T4 | Booked appointment with buffer=0 | No adjacent slots blocked |
| T5 | Multiple booked appointments, each with different buffers | Each blocks independently |
| T6 | `createAppointment()` with `startsAt` inside buffer window | Throws `SlotTakenError` |
| T7 | `createAppointment()` with `startsAt` after buffer window | Succeeds, writes `effectiveBufferAfterMinutes = 10` |
| T8 | `createAppointment()` with no `eventTypeBufferMinutes` | Writes `effectiveBufferAfterMinutes = 0` |
| T9 | New appointment's own buffer protects subsequent slots | Slot in new appointment's buffer window blocked |

Tests T1–T5 test `getAvailabilityForDate()` logic directly (mocking the DB response for `bookedSlots`).
Tests T6–T9 test `createAppointment()` logic (mocking the DB transaction).

### 5. Existing test suite — no regressions

```bash
pnpm test src/app/api/availability/route.test.ts
pnpm test src/app/api/bookings/create/route.test.ts
```

These mock `getAvailabilityForDate` and `createAppointment` at the module boundary, so they won't test the new logic directly — but they'll catch any signature changes that break the route layer.

### 6. Full test run

```bash
pnpm test
```

All existing tests must pass. Zero regressions.

### 7. Final check

```bash
pnpm check
```

(`pnpm check` runs both lint and typecheck per CLAUDE.md.)

---

## Acceptance Criteria

- [ ] Migration runs cleanly — `ADD COLUMN effective_buffer_after_minutes integer NOT NULL DEFAULT 0`
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes — all existing + new buffer-time tests
- [ ] T1: slot in buffer window does not appear in availability response
- [ ] T6: POST to `/api/bookings/create` with `startsAt` in buffer window returns 409 Slot taken
- [ ] T7: New appointment row has correct `effectiveBufferAfterMinutes` value persisted
- [ ] T4: Buffer=0 appointments do not block adjacent slots (no regression)

---

## Next: V2

Once V1 is verified, V2 adds `bookingSettings.defaultBufferMinutes`, the settings UI control, and extends the resolver to `eventType.bufferMinutes ?? shopDefault ?? 0`.
