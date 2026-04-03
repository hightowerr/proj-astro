# Spike: Slot Generation & Buffer Injection

**Feature:** Buffer Time Between Appointments
**Date:** 2026-03-31
**Status:** Complete

---

## Context

The shaping doc for Buffer Time identified flagged unknowns (⚠️) in both shape sketches around how buffer time would be injected into slot availability. Before selecting a shape or running a fit check, we need to understand:

- Where slot generation happens
- How booked appointments currently block time
- What it would take to extend that blocking window by buffer minutes
- Whether the `eventTypes` schema already has buffer columns

---

## Goal

Understand the existing slot generation and availability mechanism well enough to describe the concrete steps required to inject `bufferBefore` / `bufferAfter` behaviour — and determine whether any schema work already exists.

---

## Questions

| # | Question |
|---|----------|
| **S1-Q1** | Is slot generation computed at query time or are slots persisted? |
| **S1-Q2** | Where is the availability query and what does the overlap detection look like? |
| **S1-Q3** | Does `eventTypes` already have buffer-related columns? |
| **S1-Q4** | Where is booking creation validated — and would buffer need to be enforced there too? |
| **S1-Q5** | Does the cancellation path re-open the buffer window, or just the appointment window? |
| **S1-Q6** | Is buffer time already partially implemented for calendar events? |

---

## Findings

### S1-Q1: Slot generation is computed at query time — not persisted

`generateSlotsForDate()` in `src/lib/booking.ts` generates all candidate slots in memory from shop hours and slot interval. There is no `slots` or `timeslots` table. Every call to `GET /api/availability` regenerates slots fresh.

**What this means for buffers:** Buffer logic belongs in the filtering step, not in any persisted record. We extend the "blocked window" of a booked appointment by buffer minutes when testing for slot overlap.

---

### S1-Q2: Availability query and overlap detection

**File:** `src/lib/queries/appointments.ts` — `getAvailabilityForDate()`

Five-stage pipeline:

```
1. Reject past dates
2. Load shopHours for day-of-week
3. generateSlotsForDate() → all candidate slots
4. Query appointments WHERE status IN ('booked','pending') AND overlaps date
5. Filter: remove slots that overlap any booked appointment
(6. Remove slots overlapping Google Calendar events — with 5-min buffer)
```

The overlap test at step 5 is:

```typescript
const overlaps = bookedSlots.some(booked =>
  slot.startsAt < booked.endsAt &&
  slot.endsAt > booked.startsAt
)
```

**What this means for buffers:** To inject buffer time, we expand the booked appointment's window before the overlap test:

```typescript
const blockedStart = new Date(booked.startsAt.getTime() - bufferBeforeMs)
const blockedEnd   = new Date(booked.endsAt.getTime()   + bufferAfterMs)

const overlaps = bookedSlots.some(booked =>
  slot.startsAt < blockedEnd &&
  slot.endsAt > blockedStart
)
```

This is a localised change to the filtering loop. No schema change to `appointments` required.

---

### S1-Q3: `eventTypes` already has a `bufferMinutes` column

**File:** `src/lib/schema.ts`

```
eventTypes.bufferMinutes  (integer, options: 0 | 5 | 10)
```

**Significant finding.** Schema work partially exists. However:

- The column only covers `bufferAfter` (post-appointment buffer)
- Options are narrow: `0 | 5 | 10` — may need to expand to `0 | 5 | 10 | 15 | 30 | 45 | 60`
- There is **no `bufferBefore` column** on `eventTypes`
- There is **no buffer column on `bookingSettings`** (shop-level default)
- The existing `bufferMinutes` column does **not appear to be wired into availability filtering yet** — `getAvailabilityForDate()` does not read it

So: schema has a head start on `bufferAfter` at the event type level, but the availability logic does not consume it yet, and `bufferBefore` and shop-level defaults are absent.

---

### S1-Q4: Booking creation also validates overlap — buffer must be enforced there too

**File:** `src/lib/queries/appointments.ts` — `createAppointment()`

At booking creation time, the system re-validates:

```typescript
// Queries: WHERE shopId=? AND status IN ('booked','pending') AND startsAt < endsAt AND endsAt > startsAt
// Throws SlotTakenError if any result found
```

There is also a unique constraint `(shopId, startsAt) WHERE status IN ('booked','pending')` at the database level.

**What this means for buffers:** The overlap check at creation time must also apply buffer expansion — otherwise a customer could book a slot that the availability API showed as free (correctly, with buffer), but then succeed in creating an appointment that overlaps someone else's buffer window. Both the availability filter (step 5) and the creation-time overlap query need buffer-aware logic.

The database unique constraint covers exact `startsAt` collisions — it does not protect buffer windows. Buffer enforcement is application-level only.

---

### S1-Q5: Cancellation path does not need buffer changes

When an appointment is cancelled, slot blocking is removed because the overlap query filters on `status IN ('booked','pending')`. A cancelled appointment drops out automatically.

The `slotOpenings` table (for slot recovery) records the raw `startsAt` / `endsAt` of the cancelled appointment — not the buffered window. This is correct: the slot opening represents the appointment time, and buffer is applied at display/filter time, not stored.

**No changes needed to the cancellation path for buffer support.**

---

### S1-Q6: Calendar events already use a 5-minute buffer

**File:** `src/lib/calendar-conflict-rules.ts` — `overlapsWithCalendarConflictBuffer()`

```typescript
// Rule: slot overlaps event if:
eventStartMs < slotEndMs + 5_MINUTES &&
eventEndMs   > slotStartMs - 5_MINUTES
```

Google Calendar events already get a hardcoded ±5-minute buffer applied. This is separate from the appointment-to-appointment buffer we're adding — it's a different concern (calendar event protection, not service gap). The two mechanisms are independent.

---

## Answers to Shaping Open Questions

| # | Question | Answer |
|---|----------|--------|
| Q1 | Computed at query time or persisted? | **Computed at query time.** `generateSlotsForDate()` runs on every availability request. Buffer injects into the filtering step. |
| Q2 | Per event type, shop-level, or both? | **`eventTypes.bufferMinutes` already exists** (after-only, narrow options). Shop-level default column doesn't exist yet. Both are needed — per-event-type with shop-level fallback. |
| Q3 | Buffer in policy snapshots? | **Not required.** Buffer affects availability (which slots are shown), not the terms of a specific booking. Once booked, the appointment's `startsAt`/`endsAt` are fixed — buffer doesn't affect refund or cancellation policy. Out of scope. |
| Q4 | Buffer re-opens on cancellation? | **Automatic.** Cancelled appointments exit the `status IN ('booked','pending')` filter. Buffer around them naturally disappears. No extra logic needed. |
| Q5 | Buffer shown in dashboard calendar? | **Nice-to-have, independent.** Nothing in current dashboard renders a calendar timeline view. This would require a new UI component and is decoupled from the core slot logic change. |

---

## Concrete Steps to Implement Buffer

Based on the spike, the implementation path is:

### Schema changes (2 changes)

1. **`eventTypes` table**
   - Rename or supplement `bufferMinutes` → add `bufferAfterMinutes` (keep or migrate existing column)
   - Add `bufferBeforeMinutes` column
   - Expand valid options: `0 | 5 | 10 | 15 | 30 | 45 | 60`

2. **`bookingSettings` table**
   - Add `defaultBufferBeforeMinutes` and `defaultBufferAfterMinutes` columns (shop-level defaults)

### Logic changes (2 touch points — both required)

3. **`getAvailabilityForDate()`** (`src/lib/queries/appointments.ts`)
   - When fetching booked appointments, also fetch effective `bufferBefore`/`bufferAfter` for each (from `eventTypes` or `bookingSettings` fallback)
   - Expand blocked window in overlap test: `blockedStart = startsAt - bufferBefore`, `blockedEnd = endsAt + bufferAfter`

4. **`createAppointment()`** (`src/lib/queries/appointments.ts`)
   - Mirror the buffer-expanded overlap check at creation time to prevent race conditions

### No changes needed

- `generateSlotsForDate()` — generates candidate slots only; buffer is a filter concern
- Cancellation path — auto-handled by status filter
- `slotOpenings` table — records raw appointment times; correct as-is
- Policy snapshots — buffer is not a booking term

---

## UI Placement Finding

**Per-service buffer → `/app/settings/services`** (already correct)
`bufferMinutes` is already surfaced in the event type form here. This is the right home — buffer is a property of a service, not a shop-wide schedule setting.

**Shop-level default → `/app/settings/availability`** (if added)
The availability page owns shop-wide booking behaviour (timezone, slot interval, working hours). A global buffer default belongs there, not on the services page.

`/app/settings/availability` should **not** own per-service buffer. Moving it there would break the model.

---

## Acceptance

Spike is complete. We can describe:
- Where slot filtering happens and the exact overlap test
- The two touch points (availability filter + creation validation) that need buffer-aware logic
- What schema already exists (`eventTypes.bufferMinutes`) and what's missing (`bufferBefore`, shop defaults)
- That buffer does not belong in policy snapshots and cancellation requires no changes
- Where the feature belongs in the settings UI
