---
title: "Vertical Slice 3: Customer informed (message + receipt trail)"
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
    - "Twilio (SMS)"
  infra:
    - "Vercel (deployment)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "Messaging must be auditable (timestamps, provider ids, body hash)."
  - "Never send without recorded consent + purpose."
  - "Outbound is best-effort; logging is mandatory."
success_criteria:
  - "After a paid booking, the customer receives an SMS confirmation."
  - "Each sent message is logged with provider id + status + body hash."
  - "System does not send SMS if opt-in is missing."
  - "Message send is idempotent (no duplicate SMS on retries)."
---

# Pitch: Vertical Slice 3 — Customer informed (message + receipt trail)

## Problem
Payments alone don’t prevent disputes. Customers need clear, timely notice of:
- booking time
- deposit/prepay amount
- cancellation policy summary

If we can’t prove we informed the customer (with a receipt trail), we’ll lose trust during disputes and chargebacks. This slice adds the “comms evidence” layer without introducing staff workflows.

## Appetite
**2 days.** Hard stop. Prioritise a single confirmation message sent after successful payment, with a robust audit trail and consent gating.

## Solution
When a booking becomes `paid`, automatically send an SMS confirmation and write an immutable record of:
- what we sent (hash + template version)
- when we sent it
- which provider message id it produced
- delivery state (initial + later updates if available)

### Core user journey
1. Customer completes payment (Slice 2)
2. System sends confirmation SMS within seconds
3. Customer receives message with:
   - appointment time
   - paid amount
   - policy summary (refund cutoff)
   - manage link (view/cancel comes later)
4. Business can view “Messages” tab showing logs per appointment

## Scope

### In scope
- Consent capture (minimal): SMS opt-in boolean stored per customer
- SMS confirmation triggered on `payment_intent.succeeded`
- Message log stored in DB
- Idempotency to avoid duplicates
- Admin UI to view message log entries

### Out of scope (explicit)
- Two-way confirmation (“reply YES”)
- Reminders (24h/2h)
- WhatsApp/email channels
- Delivery status callbacks (optional; can be later)
- Unsubscribe keywords handling (“STOP”) (optional, but note risk)

## Data model

### Tables

#### `customer_contact_prefs`
- `customer_id` uuid pk fk
- `sms_opt_in` boolean not null default false
- `preferred_channel` text nullable
- `updated_at` timestamptz

> For Slice 3, we only need `sms_opt_in`.

#### `message_log`
- `id` uuid pk
- `shop_id` uuid fk
- `appointment_id` uuid fk
- `customer_id` uuid fk
- `channel` enum: `sms`
- `purpose` enum: `booking_confirmation`
- `to_phone` text
- `provider` text ("twilio")
- `provider_message_id` text null
- `status` enum: `queued` | `sent` | `failed`
- `body_hash` text
- `template_key` text (e.g. "booking_confirmation_v1")
- `rendered_body` text (optional; keep if you want full evidence; otherwise store hash only)
- `error_code` text null
- `error_message` text null
- `created_at` timestamptz
- `sent_at` timestamptz null

#### `message_dedup`
- `dedup_key` text pk
- `created_at` timestamptz

Dedup key example:
- `booking_confirmation:{appointmentId}`

This ensures retries don’t spam.

## Backend design

### Trigger point
When Stripe webhook receives `payment_intent.succeeded` and updates:
- `payments.status = succeeded`
- `appointments.payment_status = paid`

…we then attempt to send SMS.

Important ordering:
1) Commit payment + appointment updates
2) Attempt send SMS (best-effort)
3) Always log result

### Idempotency rules
- Before sending, insert into `message_dedup`:
  - if conflict → do not send again
- Log message once per appointment + purpose
- Webhook can be retried; dedup prevents duplicates

### Sending logic (Twilio)
- Validate customer has `sms_opt_in=true`
- Validate phone exists and is E.164 formatted
- Render message from template:
  - “Booked: Tue 10:30. Paid £20 deposit. Cancel before Mon 10:30 for refund.”
- Send via Twilio API
- Store `provider_message_id`, `status=sent`, `sent_at`

If Twilio fails:
- `status=failed`, store error fields

### Routes
- `POST /api/stripe/webhook` (existing)
  - now calls `sendBookingConfirmationSMS(appointmentId)` after marking paid

- `GET /api/messages?appointmentId=...`
  - returns message log rows

(Optional)
- `POST /api/messages/resend` for admin — **not in scope** for Slice 3, usually causes misuse and support issues.

## Frontend design

### Customer capture of opt-in
Since you need consent before sending, add one checkbox to the booking form:
- “Send me SMS updates about this booking.”

Store it on customer prefs during booking creation (Slice 1/2).

### Business UI
Add to appointment detail view (or inline section on list):
- “Messages”
  - purpose
  - status
  - sent_at
  - provider_message_id (truncate)

No search, no filters.

## Risks and rabbit holes

### 1) Consent and compliance
Risk: sending SMS without explicit opt-in.
Mitigation:
- default opt-in = false
- checkbox required for SMS
- do not send if missing opt-in

### 2) Phone formatting reliability
Risk: invalid numbers cause send failures.
Mitigation:
- validate E.164 on input
- show inline error, don’t accept booking details otherwise (or allow booking but disable SMS)

### 3) Duplicate sends (webhook retries)
Risk: customers get multiple texts.
Mitigation:
- dedup table keyed by appointment + purpose

### 4) Delivery status complexity
Risk: trying to track “delivered” becomes a project.
Mitigation:
- only store “sent/failed” in Slice 3
- delivery callbacks later if needed

## Definition of Done

### Functional
- ✅ Paid booking triggers SMS send attempt
- ✅ SMS is not sent without opt-in
- ✅ Message is logged regardless of success/failure

### Correctness
- ✅ Idempotent under Stripe webhook retries
- ✅ Message log contains enough evidence (hash, template, timestamps, provider id)

### Delivery
- ✅ Runs in deployed environment with Twilio credentials
- ✅ Tests pass in CI (Twilio mocked)

## QA plan

### Unit tests (Vitest)
- Template renderer produces expected output (stable, no missing fields)
- Consent gating blocks sending
- Dedup key prevents duplicate sends

### Integration tests
- Webhook `succeeded` called twice → only one message_log row with `sent`
- Twilio failure → message_log row with `failed` and error fields

### E2E (Playwright)
Scenario: pay → message log created
1. Book and pay (use Stripe test mode)
2. Assert appointment shows `paid`
3. Visit appointment detail/messages
4. Assert one message row exists with purpose `booking_confirmation`
5. (Optionally) assert status is `sent` in mocked environment

## Cut list (if time runs out)
In order:
1. Business “Messages” UI → keep logs only in DB
2. Store rendered body → store hash + template only
3. Phone validation niceties → minimal regex + accept E.164 only
4. customer_contact_prefs table → add `sms_opt_in` directly to customers temporarily (but migrate later)
