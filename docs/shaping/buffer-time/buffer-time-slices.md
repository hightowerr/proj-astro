---
shaping: true
---

# Buffer Time — Slices

**Shape:** C + Option X (C1 + C2 + C3-B + C4-B + C5-A)
**Breadboard:** `buffer-time-breadboard.md`
**Date:** 2026-04-01

---

## Slice Overview

| Slice | Name | Affordances | Demo |
|-------|------|-------------|------|
| V1 | Wire-up + Snapshot | N2, N4, N5, N6 | Book back-to-back — second slot blocked |
| V2 | Shop Default | U1, N1, N3, N7 | Set shop default buffer, verify slots blocked for event type with no buffer set |

V1 is the atomic unit. C1 and C2 ship together inside V1 — they cannot be separated. V2 is independent and additive.

---

## V1 — Wire-up + Snapshot

**What ships:** `effectiveBufferAfterMinutes` stored on every new appointment. Availability filter and creation guard both enforce it. Existing `eventTypes.bufferMinutes` finally works.

**Demo:** Shop owner sets buffer = 10 min on a service. Customer tries to book a slot immediately after an existing appointment — slot does not appear. Customer tries to POST directly to `/api/bookings/create` with that slot — `SlotTakenError` returned.

### Affordances

| ID | Affordance | Type |
|----|------------|------|
| N2 | `appointments.effectiveBufferAfterMinutes` — new integer column, default 0 | Schema |
| N4 | `getAvailabilityForDate()` — reads `effectiveBufferAfterMinutes` from booked rows, expands blocked window | Logic |
| N5 | `createAppointment()` — resolves effective buffer, writes to `effectiveBufferAfterMinutes` on INSERT | Logic |
| N6 | `createAppointment()` — overlap guard extended with buffer-expanded window | Logic |

### Wiring

```
GET /api/availability
  └──► getAvailabilityForDate()
         └──► SELECT startsAt, endsAt, effectiveBufferAfterMinutes FROM appointments
         └──► blockedEnd = endsAt + effectiveBufferAfterMinutes
         └──► exclude slot if slot.startsAt < blockedEnd

POST /api/bookings/create
  └──► createAppointment()
         └──► resolve: eventType.bufferMinutes ?? 0           (shop default not yet in scope)
         └──► overlap guard: AND (endsAt + effectiveBufferAfterMinutes * interval '1 min') > newStartsAt
         └──► INSERT { ..., effectiveBufferAfterMinutes: resolvedBuffer }
```

### Tasks

1. **Migration** — add `effectiveBufferAfterMinutes integer not null default 0` to `appointments` table
   - `pnpm db:generate` then `pnpm db:migrate`
   - Existing rows default to 0 (no buffer — correct, matches pre-feature behaviour)

2. **`getAvailabilityForDate()`** (`src/lib/queries/appointments.ts`)
   - Add `effectiveBufferAfterMinutes: appointments.effectiveBufferAfterMinutes` to the `bookedSlots` SELECT
   - Replace `booked.endsAt.getTime()` with `booked.endsAt.getTime() + booked.effectiveBufferAfterMinutes * 60_000` in the overlap test

3. **`createAppointment()`** (`src/lib/queries/appointments.ts`)
   - Resolve effective buffer: `const effectiveBuffer = input.eventTypeId ? (fetchedEventType?.bufferMinutes ?? 0) : 0`
   - Note: `bookingSettings.defaultBufferMinutes` fallback added in V2 — V1 resolves to `bufferMinutes ?? 0`
   - Extend overlap guard WHERE clause: replace `gt(appointments.endsAt, input.startsAt)` with buffer-expanded equivalent
   - Add `effectiveBufferAfterMinutes: effectiveBuffer` to the INSERT values

4. **Tests**
   - Availability: slot immediately after booked appointment (buffer=10) does not appear
   - Availability: slot 10+ min after booked appointment (buffer=10) does appear
   - Availability: appointment with buffer=0 does not block adjacent slots
   - Creation guard: POST with `startsAt` in buffer window returns `SlotTakenError`
   - Creation guard: new appointment row has correct `effectiveBufferAfterMinutes` value

### Verification

```bash
pnpm db:generate && pnpm db:migrate
pnpm typecheck
pnpm test src/lib/queries/appointments
```

Manual: set `bufferMinutes = 10` on an event type via `/app/settings/services`. Load booking page, book a slot. Confirm the 10-min window after that slot shows no available times.

---

## V2 — Shop Default

**What ships:** Shop owner can set a default buffer in `/app/settings/availability`. Applied to any appointment booked against an event type with `bufferMinutes = 0` (or services with no event type).

**Demo:** Shop owner sets default buffer = 5 min. A service has no buffer configured (`bufferMinutes = 0`). Book an appointment — the 5-min window after it is blocked.

**Depends on:** V1 shipped. `effectiveBufferAfterMinutes` column and resolver in `createAppointment()` already exist.

### Affordances

| ID | Affordance | Type |
|----|------------|------|
| U1 | Default buffer radio group on `/app/settings/availability` — None / 5 min / 10 min | UI |
| N1 | `bookingSettings.defaultBufferMinutes` — new integer column, default 0, check `IN (0, 5, 10)` | Schema |
| N3 | `updateAvailabilitySettings` action — extended to validate + write `defaultBufferMinutes` | Logic |
| N7 | `AvailabilitySettingsForm` component — extended with U1 | UI |

### Wiring

```
U1 (radio) ──► N3 (action)
                 └──► validate: z.union([z.literal(0), z.literal(5), z.literal(10)])
                 └──► upsert bookingSettings.defaultBufferMinutes
                 └──► revalidatePath("/app/settings/availability")
                 └──► revalidatePath("/book/[slug]")

createAppointment() resolver updated:
  effectiveBuffer = eventType.bufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0
```

### Tasks

1. **Migration** — add `defaultBufferMinutes integer not null default 0` to `bookingSettings` table
   - Check constraint: `IN (0, 5, 10)`
   - `pnpm db:generate` then `pnpm db:migrate`

2. **`updateAvailabilitySettings` action** (`src/app/app/settings/availability/actions.ts`)
   - Add `z.union([z.literal(0), z.literal(5), z.literal(10)])` validation for `defaultBufferMinutes`
   - Include `defaultBufferMinutes` in the upsert SET

3. **`AvailabilitySettingsForm` component** (`src/components/settings/availability-settings-form.tsx`)
   - Add buffer radio group (same pattern as `EventTypeForm` BUFFER_OPTIONS)
   - Pass `initial.defaultBufferMinutes` as initial state
   - Include hidden input or controlled value in form submission

4. **`/app/settings/availability/page.tsx`**
   - Pass `settings?.defaultBufferMinutes ?? 0` into `AvailabilitySettingsForm` initial props

5. **`createAppointment()` resolver** (`src/lib/queries/appointments.ts`)
   - Extend resolver: `eventType.bufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0`
   - `bookingSettings` is already fetched inside `createAppointment()` — just read the new column

6. **Tests**
   - Shop default = 5 min, event type buffer = 0: effective buffer resolves to 5
   - Shop default = 5 min, event type buffer = 10: effective buffer resolves to 10 (event type wins)
   - Shop default = 0: behaviour identical to V1 (no regression)
   - Settings action: invalid `defaultBufferMinutes` value (e.g. 7) throws validation error

### Verification

```bash
pnpm db:generate && pnpm db:migrate
pnpm typecheck
pnpm test src/app/app/settings/availability
pnpm test src/lib/queries/appointments
```

Manual: set default buffer = 5 min in `/app/settings/availability`. Ensure a service with `bufferMinutes = 0` now blocks the 5-min window after its appointments on the booking page.
