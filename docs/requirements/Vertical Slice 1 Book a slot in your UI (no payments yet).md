---
title: "Vertical Slice 1: Book a slot in your UI (no payments yet)"
type: "shape-up"
status: "pitch"
appetite: "2 days"
owner: "PM/Tech Lead"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind + shadcn/ui"
  backend:
    - "Next.js Route Handlers"
    - "Postgres"
    - "Drizzle ORM (migrations)"
  infra:
    - "Vercel (deployment)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "We own the booking record (single source of truth)."
  - "Prevent double-booking at the database level."
  - "Keep availability computation deterministic and testable."
success_criteria:
  - "A customer can view availability and create a booking in our UI."
  - "Business can see the booking in the dashboard."
  - "Double-booking is prevented even under concurrency."
  - "One end-to-end Playwright test proves the flow."
---

# Pitch: Vertical Slice 1 — Book a slot in your UI (no payments yet)

## Problem
Before payments, policies, and automation, we need a reliable booking primitive: a customer selects a slot and we store an appointment. If availability is fuzzy or double-booking is possible, everything downstream becomes unstable (payments, offers, outcomes, scoring).

## Appetite
**2 days.** Hard stop. If we can’t do “availability → book → see in dashboard” with strong invariants, we stop and fix it before adding anything else.

## Solution
Deliver a simple booking flow with deterministic availability and a DB-enforced lock against double-booking.

### Core user journey
**Customer:**
1. Open booking page for a shop
2. Pick a date
3. See available time slots
4. Enter contact details
5. Confirm booking
6. See “Booking requested/confirmed” screen (no payment yet)

**Business:**
1. Open `/app/appointments`
2. See newly created booking

## Scope

### In scope
- Customer booking page for a shop
- Deterministic “available slots for a day” endpoint
- Create appointment endpoint with DB-level double-booking protection
- Minimal business dashboard appointment list

### Out of scope (explicit)
- Payments / deposits / Stripe
- SMS confirmation
- Cancellation/reschedule/refunds
- Multiple staff / resource scheduling complexity
- Buffers, travel time, overbooking, waitlists
- Customer accounts/login

## Availability model (keep it deliberately simple)
To avoid scope creep, we pick a rigid model for Slice 1:

- Shop has operating hours (e.g. 09:00–17:00)
- Slot length is fixed per shop (e.g. 30 minutes)
- Availability is “all slots in hours that aren’t already booked”

No services yet, no variable duration.

### Operating hours
Store a weekly schedule:
- day-of-week → open_time, close_time

### Slot generation
For a given date:
- generate [open_time, close_time) in increments of slot_length
- subtract slots already booked

This is deterministic and easy to test.

## Data model

### Tables
#### `shops` (exists from Slice 0)
- `id`, `name`, `ownerUserId`, timestamps

#### `shop_hours`
- `id` uuid pk
- `shop_id` uuid fk
- `day_of_week` int (0–6)
- `open_time` time
- `close_time` time
- unique `(shop_id, day_of_week)`

#### `booking_settings`
- `shop_id` uuid pk fk
- `slot_minutes` int (e.g. 30)
- `timezone` text (IANA, e.g. "Europe/London")

#### `customers`
- `id` uuid pk
- `shop_id` uuid fk
- `full_name` text
- `phone` text null
- `email` text null
- `created_at` timestamptz
- unique `(shop_id, phone)` where phone not null
- unique `(shop_id, email)` where email not null

#### `appointments`
- `id` uuid pk
- `shop_id` uuid fk
- `customer_id` uuid fk
- `starts_at` timestamptz
- `ends_at` timestamptz
- `status` enum: `booked` | `cancelled` (only `booked` used now)
- `created_at` timestamptz

### Invariants (non-negotiable)
Prevent double booking in DB.

Pick one:
- Unique constraint: `(shop_id, starts_at)` if all slots are same length
- If you anticipate variable durations soon, add a range exclusion constraint later; **don’t** start there.

For Slice 1: use `(shop_id, starts_at)` uniqueness.

## Backend routes

### `GET /api/availability`
Query:
- `shopId`
- `date=YYYY-MM-DD`

Returns:
- `{ date, timezone, slotMinutes, slots: [{ startsAt, endsAt }] }`

Implementation:
- load `shop_hours` for that weekday
- generate slots
- query booked appointments that day
- subtract booked starts

### `POST /api/appointments`
Body:
- `shopId`
- `startsAt`
- `customer: { fullName, phone?, email? }`

Logic:
1. Validate requested start aligns to slot grid in shop timezone
2. Compute endsAt = startsAt + slotMinutes
3. Upsert customer by (phone/email)
4. Insert appointment
   - if unique constraint violated → return 409 “slot taken”
5. Return appointment summary

## Frontend pages

### Customer booking
Route: `/book/[shop]`
UI:
- date picker
- list/grid of slots
- small form for name + phone/email
- confirm button

Keep it simple:
- no fancy calendar UI required
- shadcn components only if it speeds you up

### Business dashboard
Route: `/app/appointments`
- table list of appointments for shop
- show: start time, customer name, created_at

## Risks and rabbit holes

### 1) Timezone bugs
Risk: slots generated in local time but stored in UTC incorrectly.
Mitigation:
- store `booking_settings.timezone` and use it consistently
- define “date” as shop-local date
- convert slot start to UTC before storing

### 2) Availability vs booking race
Risk: two users see the same slot and both try to book.
Mitigation:
- DB uniqueness is the lock
- UI handles 409 gracefully (“slot just taken, pick another”)

### 3) Over-modeling services/staff early
Risk: you waste time building a scheduling engine.
Mitigation:
- fixed slot length and single resource in Slice 1
- staff/services come after the payment loop is proven

## Definition of Done

### Functional
- ✅ Customer can view available slots for a date
- ✅ Customer can create a booking for a slot
- ✅ Business dashboard shows the booking

### Correctness
- ✅ Booking rejects invalid slot times
- ✅ Double booking prevented (409 on conflict)
- ✅ Availability excludes already-booked slots

### Delivery
- ✅ Migrations apply cleanly
- ✅ Vitest and Playwright run in CI

## QA plan

### Unit tests (Vitest)
- Slot generation returns expected count for given hours + slotMinutes
- Slot grid validation rejects off-grid times
- Conflict booking returns 409

### Integration tests
- Insert two appointments same shop + starts_at:
  - first succeeds
  - second fails with unique constraint
- Availability excludes booked slot

### E2E (Playwright)
Scenario: customer books and business sees it
1. Seed shop + hours + settings
2. Visit `/book/{shop}`
3. Choose a date with open hours
4. Select a slot
5. Enter name + email
6. Submit
7. Visit `/app/appointments`
8. Assert appointment appears

## Cut list (if time runs out)
In order:
1. Phone + email uniqueness rules → require just email
2. Date picker → hardcode “today” + “tomorrow”
3. Fancy slot grid → list of buttons
4. Hours editor UI → seed default hours in DB
