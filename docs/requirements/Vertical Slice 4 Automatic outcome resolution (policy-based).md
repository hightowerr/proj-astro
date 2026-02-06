---
title: "Vertical Slice 4: Automatic outcome resolution (policy-based)"
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
  jobs:
    - "Vercel Cron (or equivalent scheduled trigger hitting an API route)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "We resolve outcomes based on policy + payment state, not attendance."
  - "Resolution must be deterministic, auditable, and idempotent."
  - "Every resolution is explainable from stored facts (policy version, timestamps, payment status)."
success_criteria:
  - "Ended appointments automatically transition to a financial outcome."
  - "Resolution is idempotent (safe on retries and overlapping cron runs)."
  - "Dashboard displays resolved outcomes and totals."
  - "A slice-level E2E test proves the end-to-end resolution path."
---

# Pitch: Vertical Slice 4 — Automatic outcome resolution (policy-based)

## Problem
Right now we can create paid bookings and send confirmations, but we still don’t have the central “proof loop” deliverable: **automatic resolution**. Without a deterministic resolver, every later feature (slot fill, scoring, tiering) sits on ambiguous states and manual cleanup.

This slice establishes a single source of truth for “what happened” in terms the product can stand behind:
- *settled* (money captured/kept per policy)
- *voided* (no payment required or payment not captured when required)
- *refunded* (reversed per policy)
- *disputed* (later slice, but we must leave space for it)

## Appetite
**2 days.** Hard stop. We will not build cancellations/refunds/disputes workflows here—only the resolver and the reporting surface.

## Solution
Add a scheduled resolver job that:
- identifies appointments whose end time has passed
- calculates a **policy-based financial outcome**
- writes an immutable event record and sets resolved fields on the appointment
- is safe to run repeatedly (idempotent)

### Outcome taxonomy (what we will store)
We will not store “attended/no-show”. We store:

- `financial_outcome = settled`  
  Meaning: booking ended and the payment state indicates money is captured/kept under the policy in force at booking time.

- `financial_outcome = voided`  
  Meaning: booking ended and no money was captured (either not required, or payment required but never succeeded).

- `financial_outcome = refunded`  
  Not produced in this slice (Slice 5), but schema must allow it.

- `financial_outcome = unresolved`  
  Default until the resolver runs.

This keeps semantics clean and makes dashboards honest.

## Scope

### In scope
- Resolver job / cron trigger
- Appointment fields to store outcome + timestamps
- Append-only event log for auditability
- Dashboard columns and summary counts for outcomes

### Out of scope (explicit)
- Cancellations and refunds (Slice 5)
- Disputes and chargebacks UI
- Manual capture after end time (if chosen later)
- Staff check-ins or QR check-ins

## Data model changes

### `appointments` additions
- `ends_at` timestamptz not null (should already exist from booking)
- `financial_outcome` enum:
  - `unresolved` | `settled` | `voided` | `refunded` | `disputed`
  - default `unresolved`
- `resolved_at` timestamptz null
- `resolution_reason` text null (short machine-readable reason key)

### New table: `appointment_events` (append-only audit trail)
- `id` uuid pk
- `shop_id` uuid fk
- `appointment_id` uuid fk
- `type` enum:
  - `created` | `payment_succeeded` | `payment_failed` | `outcome_resolved`
- `occurred_at` timestamptz
- `meta` jsonb (policy_version_id, payment_id, reason key, etc.)

> For Slice 4, we only need to write `outcome_resolved` events. The rest can be added gradually.

### Indexes
- `appointments(shop_id, ends_at)` for resolver scan
- `appointments(financial_outcome)` for dashboard filters
- `appointment_events(appointment_id, occurred_at)`

## Resolver rules (deterministic)
Given an appointment that has ended:

Inputs:
- appointment fields: `payment_required`, `payment_status`, `financial_outcome`
- linked payment row: `payments.status` (if any)
- policy version snapshot: `payment_mode`, `deposit_amount_cents`, etc. (already captured in Slice 2)

Rules:

1) If `financial_outcome != unresolved` → do nothing  
   (idempotency)

2) If `payment_required = false`
- `financial_outcome = voided`
- `resolution_reason = no_payment_required`

3) If `payment_required = true` and `payments.status = succeeded`
- `financial_outcome = settled`
- `resolution_reason = payment_captured`

4) If `payment_required = true` and payment is missing or not succeeded
- `financial_outcome = voided`
- `resolution_reason = payment_not_captured`

Optional grace:
- only resolve if `now >= ends_at + grace_minutes` (e.g. 30m)
- this prevents edge timing issues

> The important point: **resolution depends on stored facts, not guesses**.

## Job / cron implementation

### Approach
Use a scheduled HTTP trigger that calls an internal route:
- `POST /api/jobs/resolve-outcomes`

Protected by:
- a secret header token (`CRON_SECRET`)
- rate limiting (optional)

This route:
- selects appointments needing resolution
- processes in batches
- uses a transaction per appointment or per batch
- writes an `appointment_events` row and updates the appointment

### Query to select candidates
- `financial_outcome = 'unresolved'`
- `ends_at < now() - grace_interval`
- (optional) limit by shop, limit batch size

### Concurrency / idempotency strategy
To avoid two cron runs racing:
- update with a conditional where clause:
  - `WHERE id = $id AND financial_outcome = 'unresolved'`
- if 0 rows updated → someone else resolved it

That’s enough for Slice 4 (keep it simple).

## Frontend changes

### Business dashboard list
Add columns:
- `Payment` (paid/pending/failed)
- `Outcome` (unresolved/settled/voided)
- `Resolved at` (if present)

### Summary widget (top of page)
For last 7 days:
- count settled
- count voided
- count unresolved

No charts required.

## Risks and rabbit holes

### 1) Naming confusion (“completed”)
Risk: calling settled “completed” will leak into product language and break later.
Mitigation: enforce “Outcome = settled/voided” everywhere.

### 2) Timezone boundaries
Risk: end times computed incorrectly.
Mitigation: store all timestamps in UTC; only render in shop timezone.

### 3) Webhook/order-of-events
Risk: payment succeeds after resolver runs (rare but possible with async flows).
Mitigation:
- resolver only runs after a grace window
- if payment later becomes succeeded, a later slice can reconcile; for now, include a manual admin “re-run resolver” button if needed (cut if time).

## Definition of Done

### Functional
- ✅ Resolver route can be invoked and resolves eligible appointments
- ✅ Appointments show correct `financial_outcome` after end time
- ✅ Business dashboard displays outcomes

### Correctness
- ✅ Idempotent: running resolver multiple times does not change already-resolved outcomes
- ✅ Race-safe: overlapping resolver invocations do not create duplicate events

### Delivery
- ✅ Scheduled trigger configured in deployed environment (Vercel Cron hitting the route)
- ✅ Tests pass in CI

## QA plan

### Unit tests (Vitest)
- Resolver rule function:
  - unpaid + required → voided
  - paid + required → settled
  - not required → voided
- Idempotency: unresolved → resolved; resolved stays same

### Integration tests
- Insert ended appointment + payment succeeded → resolver sets settled
- Insert ended appointment + payment pending → resolver sets voided
- Run resolver twice → second run makes no changes and adds no extra `outcome_resolved` event

### E2E (Playwright)
Scenario: ended appointment resolves to settled
1. Create shop + booking settings
2. Create appointment with ends_at in the past, payment_required=true
3. Create payment row with status succeeded
4. Call `/api/jobs/resolve-outcomes` (test-secret)
5. Visit `/app/appointments`
6. Assert outcome shows `settled` and resolved_at populated

## Cut list (if time runs out)
In order:
1. Summary widget → only list column
2. appointment_events table → store reason on appointment only (temporary)
3. Grace window → resolve immediately after ends_at
4. Batch processing niceties → resolve up to N rows, done
