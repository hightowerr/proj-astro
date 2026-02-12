---
title: "Vertical Slice 5: Cancellation + refund window (dispute prevention)"
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
    - "Stripe API + Webhooks"
  infra:
    - "Vercel (deployment)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "Cancellations are policy-driven and auditable."
  - "Refund/void decisions must be deterministic at cancellation time."
  - "Idempotency everywhere: retries must not double-refund."
success_criteria:
  - "Customer can cancel a booking via a link."
  - "If cancelled before cutoff, money is returned (refund/void) automatically."
  - "If cancelled after cutoff, refund is not granted (policy enforced)."
  - "Appointment, payment, and outcome states remain consistent under retries."
---

# Pitch: Vertical Slice 5 — Cancellation + refund window (dispute prevention)

## Problem
Even with deposit/prepay, disputes will spike unless customers have a clean way to cancel and receive refunds when they’re entitled to them. A deterministic refund window reduces support burden and makes the “policy-resolved outcomes” credible.

Slice 4 created automatic resolution after appointments end. This slice introduces the main *prevention* mechanism: cancellation + refund cutoff.

## Appetite
**3 days.** Hard stop. We’re building:
- customer cancellation
- policy cutoff evaluation
- Stripe refund/void
- auditable state transitions

We are **not** building rescheduling, partial refunds, or complex exceptions.

## Solution
Add a customer-facing cancellation link + backend cancellation route that:
- validates the request
- evaluates policy cutoff using shop timezone and the immutable policy snapshot for the appointment
- executes a refund/void if eligible
- updates appointment + payment + financial outcome deterministically
- logs an audit event

### Core user journey
1. Customer has a paid booking
2. Customer opens “Manage booking” page (link can come from the confirmation SMS/email later; for this slice it can be shown on the confirmation page)
3. Customer clicks “Cancel booking”
4. Customer immediately sees:
   - “Cancelled — refund issued” OR
   - “Cancelled — refund not available (missed cutoff)”
5. Business sees the appointment as cancelled with correct financial outcome

## Scope

### In scope
- Manage booking page (tokenised link)
- Cancellation endpoint
- Refund/void if eligible (Stripe)
- Policy cutoff evaluation (time-based)
- Updated resolver behavior with cancelled appointments

### Out of scope (explicit)
- Rescheduling
- Partial refunds
- “Reason for cancellation” taxonomy
- Disputes/chargebacks workflow
- Admin manual overrides
- SMS send of cancellation confirmation (optional; can be later)

## Policy model (what we need now)
Extend policy snapshot (policy_versions) to include:
- `cancel_cutoff_minutes` (e.g. 24h = 1440)
- `refund_mode`:
  - `full_refund` (deposit refunded)
  - `no_refund`
  - (later) `partial_refund`

For Slice 5: support **full refund before cutoff**, otherwise no refund.

## Data model changes

### `policy_versions` additions
- `cancel_cutoff_minutes` int not null default 1440
- `refund_before_cutoff` boolean not null default true

### `appointments` additions/updates
- `status` enum: `booked | cancelled | ended`
- `cancelled_at` timestamptz null
- `cancellation_source` enum: `customer` | `system` | `admin` (use `customer` only)
- `financial_outcome` enum already exists:
  - add/confirm `refunded` as allowed value
- `resolution_reason` extend to include:
  - `cancelled_refunded_before_cutoff`
  - `cancelled_no_refund_after_cutoff`

### `payments` additions
- `refunded_amount_cents` int not null default 0
- `stripe_refund_id` text null
- `refunded_at` timestamptz null

### New table: `booking_manage_tokens`
Tokenised access without customer accounts.
- `id` uuid pk
- `appointment_id` uuid fk unique
- `token_hash` text unique
- `expires_at` timestamptz null (optional, can be e.g. 90 days)
- `created_at` timestamptz

> Store only a hash; never store raw token.

### Idempotency tables (if not already)
- `processed_stripe_events` (from Slice 2)
- Optional `refund_dedup`:
  - `dedup_key` pk (`refund:{appointmentId}`)
  - `created_at`

## Backend design

### Manage link
When booking is confirmed (Slice 2), create a manage token:
- raw token generated once
- store hash
- show/manage URL:
  - `/manage/{token}`

This can be surfaced on the “Booking confirmed” page for now.
(Slice 3 SMS can include it later.)

### Routes

#### `GET /manage/[token]`
- Validates token → loads appointment summary
- Shows cancellation policy:
  - cutoff time in shop timezone
  - whether refund is still available “as of now”
- Button: Cancel booking

#### `POST /api/appointments/:id/cancel`
Auth model:
- Accept token in header/body (or use `/api/manage/{token}/cancel` to avoid leaking appointment ids)

Logic:
1. Load appointment + policy_version + payment
2. Validate appointment is cancellable:
   - status == booked
   - now < ends_at (optional; allow cancel even after start? For slice: allow until end time.)
3. Compute cutoff timestamp:
   - `cutoff = starts_at - cancel_cutoff_minutes`
4. If now <= cutoff and payment succeeded:
   - issue refund via Stripe (full amount or deposit amount as per policy)
   - update DB:
     - appointments.status=cancelled
     - cancelled_at=now
     - financial_outcome=refunded
     - resolved_at=now
     - reason=cancelled_refunded_before_cutoff
     - payments.refunded_amount_cents += amount
     - payments.status remains succeeded (or set a separate refund status field)
5. Else:
   - update DB:
     - appointments.status=cancelled
     - financial_outcome stays unresolved OR becomes voided? (choose one)
     - For simplicity: set `financial_outcome=settled` if deposit is retained, but that misleads; better:
       - if money already captured and not refunded: `financial_outcome=settled` with reason `cancelled_no_refund_after_cutoff`
6. Write `appointment_events` entry `cancelled` with details

### Important semantic decision (keep it consistent)
If a customer cancels after cutoff and money is retained:
- Outcome should still be **settled**, because funds remain captured.
- Reason key differentiates it from attended service:
  - `cancelled_no_refund_after_cutoff`

This preserves your “policy-resolved” definition.

### Stripe integration detail
Use Stripe refunds:
- Create refund for the PaymentIntent charge (full or deposit amount).
- Ensure idempotency:
  - Use `refund_dedup` or store refund id and refuse if already refunded.
  - On retry, detect existing refund and return success.

## Resolver interaction (Slice 4)
Resolver must ignore cancelled appointments:
- If `status=cancelled` and `financial_outcome` already set → no-op
- If `status=cancelled` and not set:
  - if refunded_amount > 0 → `refunded`
  - else if payment captured → `settled` (retained)
  - else → `voided`

This prevents “ended appointment” logic overwriting cancellation outcomes.

## Frontend design

### Manage page UI
- Appointment time + shop name
- Policy summary:
  - “Cancel before {cutoff} for refund”
- Refund eligibility indicator:
  - “Refund available” / “Refund not available”
- Cancel button
- Post-cancel state view:
  - status + refund outcome text

### Business dashboard additions
In `/app/appointments`:
- show `status` (booked/cancelled)
- show `financial_outcome` (settled/refunded/voided)
- show `resolution_reason` (small badge)

## Risks and rabbit holes

### 1) Idempotent refunds
Risk: retries cause double refunds.
Mitigation:
- store `stripe_refund_id` and/or dedup key
- check current refunded amount before issuing

### 2) Timezone cutoff bugs
Risk: cutoff calculated in UTC incorrectly.
Mitigation:
- compute cutoff using timestamps in UTC, but based on `starts_at` (already UTC)
- only *display* in shop timezone

### 3) Token security
Risk: manage links leak access.
Mitigation:
- long random token (32+ bytes)
- store hash only
- optional expiry
- rate limit by IP (later)

### 4) Ambiguous semantics (“cancelled but settled”)
Risk: humans read it as contradiction.
Mitigation:
- UI copy: “Cancelled — deposit retained (after cutoff)”
- Use `resolution_reason` prominently.

## Definition of Done

### Functional
- ✅ Customer can open manage link and cancel
- ✅ Before cutoff → refund issued and recorded
- ✅ After cutoff → cancellation recorded, no refund, outcome marked as settled (retained)

### Correctness
- ✅ Idempotent cancellation endpoint (multiple clicks safe)
- ✅ Refund idempotency (no double refunds)
- ✅ Resolver does not overwrite cancellation outcomes

### Delivery
- ✅ Stripe test mode refund works in deployed environment
- ✅ Tests pass in CI

## QA plan

### Unit tests (Vitest)
- Cutoff evaluation:
  - now before cutoff → refundable
  - now after cutoff → not refundable
- State transitions:
  - refundable → cancelled + refunded
  - not refundable + paid → cancelled + settled (retained)
- Token hashing/validation

### Integration tests
- Cancel called twice:
  - first issues refund, second returns success without new refund
- Webhook + cancellation ordering:
  - payment succeeded then cancel refundable → refunded state persists

### E2E (Playwright)
Scenario: cancel before cutoff → refund outcome
1. Create paid booking with starts_at in future (>= 24h)
2. Visit manage link
3. Click cancel
4. Assert UI shows “Cancelled — refund issued”
5. Visit business dashboard
6. Assert status=cancelled, outcome=refunded, reason=cancelled_refunded_before_cutoff
