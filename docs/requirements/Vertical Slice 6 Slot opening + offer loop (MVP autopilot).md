---
title: "Vertical Slice 6: Slot opening + offer loop (MVP autopilot)"
type: "shape-up"
status: "pitch"
appetite: "3 days"
owner: "PM/Tech Lead"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind + shadcn/ui"
  backend:
    - "Next.js Route Handlers"
    - "Postgres"
    - "Drizzle ORM (migrations)"
    - "Twilio (SMS inbound + outbound)"
  infra:
    - "Vercel (deployment)"
    - "Upstash Redis (locks + cooldowns)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "Recovery is automatic, deterministic, and policy-safe."
  - "Only one customer can win a slot."
  - "Messaging is sequential, not broadcast."
  - "Money rules always apply; no free bookings."
success_criteria:
  - "A cancelled booking creates a slot opening."
  - "System offers the slot to eligible customers sequentially."
  - "First YES wins and creates a paid booking."
  - "No double booking occurs under concurrent replies."
---

# Pitch: Vertical Slice 6 — Slot opening + offer loop (MVP autopilot)

## Problem
Cancellations create wasted capacity. Businesses currently recover slots manually, if at all. We already have everything needed to automate recovery:
- deterministic booking
- payment-as-proof
- customer contact
- policy enforcement

What’s missing is the closed loop that turns a cancellation into a recovered booking without staff involvement.

## Appetite
**3 days.** Hard stop. We will ship a single, reliable recovery loop for one shop with a simple eligibility model. Ranking sophistication comes later.

## Solution
When a booking is cancelled (Slice 5), the system automatically:
1. Creates a slot opening
2. Finds eligible customers
3. Sends an SMS offer to one customer at a time
4. Books the slot for the first affirmative reply
5. Stops the loop immediately

This is the first true “autopilot” feature.

---

## Core user journey

### Trigger
- Customer cancels a booking **after payment** (Slice 5)

### System
1. Creates a `slot_opening`
2. Selects eligible customers (deterministic rules)
3. Sends SMS:
   > “A slot opened tomorrow at 10:30. Reply YES to book. £20 deposit applies.”
4. Waits for reply (with expiry)
5. On `YES`:
   - locks the slot
   - creates a new booking
   - initiates payment (deposit/prepay)
6. Marks slot as filled and stops offering

### Business
- Sees “Recovered booking” in dashboard
- No staff action required

---

## Scope

### In scope
- Slot opening creation on cancellation
- Eligibility filtering (simple, deterministic)
- Sequential SMS offers
- Inbound SMS handling (`YES`)
- Slot locking to prevent double booking
- New booking + payment initiation

### Out of scope (explicit)
- AI ranking / optimisation
- Broadcast offers
- Waitlists / preferences UI
- Partial fills / overbooking
- Multiple simultaneous openings
- Push/email channels

---

## Data model

### New tables

#### `slot_openings`
- `id` uuid pk
- `shop_id` uuid fk
- `starts_at` timestamptz
- `ends_at` timestamptz
- `source_appointment_id` uuid fk
- `status` enum: `open | filled | expired`
- `created_at` timestamptz
- unique `(shop_id, starts_at)`

#### `slot_offers`
- `id` uuid pk
- `slot_opening_id` uuid fk
- `customer_id` uuid fk
- `channel` enum: `sms`
- `status` enum: `sent | accepted | expired | declined`
- `sent_at` timestamptz
- `expires_at` timestamptz
- `accepted_at` timestamptz null
- unique `(slot_opening_id, customer_id)`

### Redis keys (Upstash)
- `slot_lock:{shopId}:{startsAt}` → mutex for booking
- `offer_cooldown:{customerId}` → TTL to avoid spam

---

## Eligibility rules (MVP)

A customer is eligible if:
- Has `sms_opt_in = true`
- Has a valid phone number
- Is not already booked for overlapping time
- Is not in cooldown window (e.g. last offer < 24h ago)
- (Optional) Has at least one prior settled booking

**No ranking beyond deterministic ordering** (e.g. most recent settled booking).

---

## Backend design

### Trigger: cancellation hook
When appointment is cancelled (Slice 5):
- If appointment was `booked` and time is in the future:
  - create `slot_opening`
  - enqueue offer loop

### Offer loop (sequential)
Implement as a background-safe function invoked via API/job:

1. Load `slot_opening` (must be `open`)
2. Build eligible customer list (ordered)
3. For each customer:
   - check Redis cooldown
   - send SMS offer
   - insert `slot_offer(status=sent, expires_at=now+X)`
   - wait for reply window (passive wait; next step triggered by inbound SMS or expiry job)
4. Stop when:
   - offer accepted → slot filled
   - no eligible customers → mark slot expired

**Important:** Do not block waiting. State advances on inbound events or cron expiry checks.

### Inbound SMS handler
Route: `POST /api/twilio/inbound`

Logic:
1. Parse message body
2. If body == `YES`:
   - identify latest open offer for that phone
   - attempt to accept it:
     - acquire Redis slot lock
     - check slot_opening still `open`
     - mark offer `accepted`
     - create booking + payment intent
     - mark slot_opening `filled`
     - release lock
3. Reply with confirmation SMS

If lock fails → reply “Sorry, this slot has just been taken.”

### Expiry handling
Simple cron/job:
- find `slot_offers` where `status=sent` and `expires_at < now`
- mark `expired`
- trigger next offer for that slot_opening

---

## Payment integration
When offer is accepted:
- booking is created exactly like Slice 2
- payment required per policy
- slot is only considered filled once booking + payment intent exist

If payment fails:
- offer treated as declined
- slot_opening returns to `open`
- next eligible customer is offered

---

## Frontend changes

### Business dashboard
- Slot openings list:
  - time
  - status (open / filled / expired)
  - recovered booking id (if filled)

Minimal UI is fine.

### Customer UX
- SMS-driven only for MVP
- Optional landing page on accept (“Complete payment”)

---

## Risks and rabbit holes

### 1) Concurrency
Risk: two YES replies at the same time.
Mitigation:
- Redis lock on slot
- DB uniqueness on `(shop_id, starts_at)`

### 2) Silent failures
Risk: offer loop stalls if something fails.
Mitigation:
- explicit statuses
- expiry job always advances state

### 3) SMS ambiguity
Risk: customer replies YES to old offer.
Mitigation:
- link offers to slot_opening
- only latest open offer per customer is valid

### 4) Payment abandonment
Risk: customer says YES but doesn’t pay.
Mitigation:
- treat payment failure/timeout as declined
- move to next customer after timeout

---

## Definition of Done

### Functional
- ✅ Cancellation creates slot opening
- ✅ Eligible customer receives SMS offer
- ✅ First YES books slot and initiates payment
- ✅ Slot cannot be double booked

### Correctness
- ✅ Locking prevents race conditions
- ✅ Offers expire and advance correctly
- ✅ Payment failure does not poison the slot

### Delivery
- ✅ Runs in deployed environment with Twilio + Stripe test mode
- ✅ Tests pass in CI

---

## QA plan

### Unit tests (Vitest)
- Eligibility filter excludes ineligible customers
- Offer acceptance logic respects locks
- Expiry transitions advance offers

### Integration tests
- Two concurrent YES replies → one accepted, one rejected
- Payment failure after YES → slot returns to open

### E2E (Playwright)
Scenario: cancel → recover slot
1. Seed shop + customers with SMS opt-in
2. Create paid booking
3. Cancel booking
4. Assert slot opening created
5. Simulate inbound YES SMS
6. Assert new booking created and slot marked filled

---

## Cut list (if time runs out)
In order:
1. Cooldown logic → remove
2. Slot openings UI → backend only
3. Offer expiry job → single offer only
4. Confirmation SMS → minimal text reply
