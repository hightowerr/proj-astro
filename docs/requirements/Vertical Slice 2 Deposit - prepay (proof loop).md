---
title: "Vertical Slice 2: Deposit / prepay (proof loop)"
type: "shape-up"
status: "pitch"
appetite: "2–3 days"
owner: "PM/Tech Lead"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind + shadcn/ui"
    - "Stripe.js + Stripe Elements (or Checkout if faster)"
  backend:
    - "Next.js Route Handlers"
    - "Postgres"
    - "Drizzle ORM (migrations)"
    - "Stripe API + Webhooks"
  infra:
    - "Vercel (deployment)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "Payment resolves outcome (policy-resolved), not attendance."
  - "Everything is idempotent (webhooks + retries)."
  - "DB is the source of truth; Stripe is the payment rail."
success_criteria:
  - "A customer can book a slot and pay a deposit or full prepay."
  - "Stripe webhook updates payment + appointment state deterministically."
  - "Every booking has a policy version and a payment record."
  - "System behaves correctly under webhook retries and duplicate submissions."
---

# Pitch: Vertical Slice 2 — Deposit / prepay (proof loop)

## Problem
We can’t claim any “proof loop” until bookings are financially bound to a policy. If booking and payment are separate, we end up with ambiguity, manual reconciliation, and weak automation triggers. This slice makes a booking *real* by attaching money + immutable policy to it.

## Appetite
**2–3 days.** Hard stop. We prioritise a single happy path with robust correctness over feature completeness (refunds, cancellations, tier rules come later).

## Solution
Add deposit/prepay to the booking flow so that:
- A booking is created in our DB with a linked `policy_version_id`
- A Stripe PaymentIntent is created for the correct amount
- Stripe webhook confirmation transitions the booking into a “paid/authorised” state
- The dashboard shows “Paid” bookings (policy-resolved inputs)

### What “done” looks like (user journey)
1. Business has a default payment policy (deposit or full prepay)
2. Customer selects a slot in `/book/:shopSlug`
3. Customer completes payment
4. Customer sees a “Booking confirmed” screen
5. Business sees appointment in `/app/appointments` with payment status = `paid`

## Scope
### In scope
- Default policy per shop (deposit required? amount? currency)
- Stripe PaymentIntent creation
- Stripe webhook handling and idempotent updates
- Appointment ↔ payment linkage
- Minimal UI for payment step + confirmation page
- Minimal back-office list view showing payment status

### Out of scope (explicit)
- Refunds / cancellations
- Disputes / chargebacks workflow
- Tier-based policy differences
- Manual capture after end time (optional; see “Choice” below)
- SMS notifications (Slice 3)
- Slot-fill offers (Slice 6)

## Key choice (pick one for this slice)
### Option A: Capture immediately (simplest)
- Customer pays deposit/full at booking
- PaymentIntent is captured immediately
- Appointment becomes `paid` when webhook confirms

This best matches “payment as proof” and is fastest to implement.

### Option B: Authorise now, capture later (more complex)
- PaymentIntent uses `capture_method=manual`
- Capture happens after appointment end time

This requires a scheduler/cron and increases complexity—push to later slice unless it’s core to your policy.

**Recommendation for Slice 2:** Option A.

## Data model changes

### New tables
#### `shop_policies`
- `id` uuid pk
- `shop_id` uuid fk unique
- `currency` text (e.g. "GBP")
- `payment_mode` text enum: `deposit` | `full_prepay` | `none`
- `deposit_amount_cents` int nullable
- `created_at` timestamptz

#### `policy_versions` (immutable snapshots)
- `id` uuid pk
- `shop_id` uuid fk
- `currency` text
- `payment_mode` enum
- `deposit_amount_cents` int nullable
- `created_at` timestamptz

> Every appointment references a policy_version, not the mutable policy row.

#### `payments`
- `id` uuid pk
- `shop_id` uuid fk
- `appointment_id` uuid fk unique
- `provider` text ("stripe")
- `amount_cents` int
- `currency` text
- `status` enum: `requires_payment_method` | `requires_action` | `processing` | `succeeded` | `failed` | `canceled`
- `stripe_payment_intent_id` text unique
- `created_at` timestamptz
- `updated_at` timestamptz

### Appointment changes
Add:
- `policy_version_id` uuid fk
- `payment_status` enum: `unpaid` | `pending` | `paid` | `failed`
- `payment_required` boolean
- `created_at` / `updated_at` (if not already)

### Invariants (enforced)
- If `payment_required=true` then `policy_version_id` is NOT NULL
- An appointment can have at most one payment row
- A Stripe payment_intent_id maps to exactly one payment row (unique)

## Backend design

### API endpoints
#### `POST /api/bookings/create`
Creates a provisional appointment and a PaymentIntent.
Input:
- `shopId`
- `startsAt`, `endsAt`
- `customer { name, phone, email }`
Output:
- `appointmentId`
- `clientSecret` (Stripe PI)
- `amount`, `currency`

Rules:
- Fetch current `shop_policy`
- Create `policy_version` snapshot
- Create `appointment` with `payment_status=pending`
- Create `payment` row with `status=processing|requires_action` placeholder
- Create Stripe PaymentIntent with metadata `{ appointmentId, shopId, policyVersionId }`

#### `POST /api/stripe/webhook`
Receives Stripe events and updates DB.
Handled events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- (optional) `payment_intent.canceled`

Rules:
- Verify signature
- Look up payment by `stripe_payment_intent_id`
- Idempotently update `payments.status`
- Transition `appointments.payment_status` accordingly
- Append an audit event (`appointment_events`) if you have it; if not, add later.

### Idempotency requirements
- Webhook handlers must be safe to run multiple times.
- Use a `stripe_event_id` table (or store last processed event id) to ignore duplicates:
  - `processed_stripe_events(id text pk, processed_at timestamptz)`

If you skip this, you will eventually double-apply state transitions.

## Frontend design

### Customer booking pages
- `/book/[shop]/[service]` (or simpler `/book/[shop]`)
Steps:
1. Select slot (existing from Slice 1)
2. Details form
3. Payment step (Stripe Elements)
4. Confirmation screen

### Business dashboard
- `/app/appointments`
Columns:
- Start time
- Customer name
- Payment status (`paid/pending/failed`)
- Amount

No filtering needed yet.

## Risks and rabbit holes

### 1) “Payment == attended” semantic drift
Risk: naming fields `completed` will cause confusion later.
Mitigation: use `payment_status` and later `financial_outcome`. Never `attended`.

### 2) Webhook reliability
Risk: missed events leads to wrong status.
Mitigation:
- verify signature
- process idempotently
- include “reconciliation” endpoint/job later; for Slice 2, at least add an admin “refresh status” button is *not* required.

### 3) Timezones and booking collisions
Risk: payment succeeds but slot becomes invalid due to double booking.
Mitigation:
- enforce unique constraint on (shop_id, starts_at) or (resource_id, starts_at)
- create appointment before PaymentIntent; if payment succeeds but appointment creation fails, you need to refund later (avoid by creating appointment first).

## Definition of Done

### Functional
- ✅ Customer completes payment and sees confirmation
- ✅ Business dashboard shows booking with `paid` status
- ✅ Failed payment leaves booking in `failed` or `pending` state (clear and consistent)

### Correctness
- ✅ Webhook is idempotent
- ✅ Duplicate “Pay” submissions do not create multiple appointments
- ✅ Every appointment references an immutable `policy_version`

### Delivery
- ✅ Migrations apply cleanly
- ✅ Deployed environment receives Stripe webhooks successfully

## QA plan

### Unit tests (Vitest)
- Policy snapshot creation produces expected amount/currency
- Appointment creation enforces invariants
- Webhook state transitions:
  - pending → paid
  - pending → failed
  - idempotent repeat does not change outcome incorrectly

### Integration tests
- PaymentIntent metadata is correctly stored and used for lookup
- Duplicate webhook events are ignored (`processed_stripe_events`)

### E2E (Playwright)
Scenario: book + pay (Stripe test mode)
1. Visit booking page
2. Select slot
3. Enter customer details
4. Complete payment (Stripe test card)
5. Confirm success screen
6. Visit business dashboard
7. Assert appointment appears with status `paid`

## Cut list (if time runs out)
In order:
1. Full prepay support → deposit only
2. Multiple currencies → GBP only
3. Separate policy_versions table → store snapshot JSON on appointment (temporary)
4. Pretty UI → minimal forms
5. Appointment list columns → only “Paid / Pending”

## Notes on sequencing
This slice assumes Slice 1 exists (booking without payments). If Slice 1 isn’t built yet, collapse the booking UI to a single hard-coded slot for this slice so you still prove the payment loop end-to-end.
