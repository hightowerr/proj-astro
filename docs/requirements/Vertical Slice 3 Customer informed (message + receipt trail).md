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

## Slice 3 Summary
**Appetite:** 2 days | **Status:** Not implemented | **Priority:** Medium

**What it delivers:**
- SMS confirmation after payment via Twilio
- Consent capture (SMS opt-in checkbox)
- Message audit log with body hash and rendered body
- Deduplication to prevent spam
- STOP handling and opt-out recording

**Strengths:**
- Consent-first approach (GDPR/TCPA compliant)
- Message log has evidence fields (provider_message_id, body_hash, template_key)
- Idempotency via `message_dedup` table
- Triggered automatically from webhook (good sequencing)

**Gaps/Risks:**
- E.164 phone validation is required end-to-end and must be enforced on input
- STOP keyword handling is a legal requirement in the US (TCPA)
- Template versioning needs a real `message_templates` table
- No SMS provider failover if Twilio is down
- `message_log.rendered_body` should not be optional for disputes

**Recommendations:**
- Use `libphonenumber-js` (already in repo) for E.164 validation on input
- Implement a Twilio inbound webhook to process STOP/START/UNSTOP
- Store `rendered_body` for all messages
- Add `message_templates` table with versioning
- Add `message_log.retry_count` for failed messages

## Scope

### In scope
- Consent capture (minimal): SMS opt-in boolean stored per customer
- E.164 validation on booking input
- SMS confirmation triggered on `payment_intent.succeeded`
- Message log stored in DB with `rendered_body` + `body_hash` + `retry_count`
- Idempotency to avoid duplicates
- Message templates table (versioned)
- STOP handling via inbound webhook and opt-out storage
- Admin UI to view message log entries

### Out of scope (explicit)
- Two-way confirmation (“reply YES”)
- Reminders (24h/2h)
- WhatsApp/email channels
- Delivery status callbacks (optional; can be later)
- Provider failover for SMS (Twilio down)
- Automatic retries with backoff

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
- `template_id` uuid fk
- `template_key` text (e.g. "booking_confirmation")
- `template_version` int
- `rendered_body` text (required)
- `retry_count` int not null default 0
- `error_code` text null
- `error_message` text null
- `created_at` timestamptz
- `sent_at` timestamptz null

#### `message_templates`
- `id` uuid pk
- `key` text (e.g. "booking_confirmation")
- `version` int
- `channel` enum: `sms`
- `body_template` text
- `created_at` timestamptz

> Unique key: (`key`, `version`).

#### `message_dedup`
- `dedup_key` text pk
- `created_at` timestamptz

Dedup key example:
- `booking_confirmation:{appointmentId}`

This ensures retries don’t spam.

#### `message_opt_outs`
- `id` uuid pk
- `customer_id` uuid fk
- `channel` enum: `sms`
- `opted_out_at` timestamptz
- `reason` text (e.g. "STOP")

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
- Load message template by key + latest version
- Render message from template:
  - “Booked: Tue 10:30. Paid £20 deposit. Cancel before Mon 10:30 for refund.”
- Send via Twilio API
- Store `provider_message_id`, `status=sent`, `sent_at`, `rendered_body`, `body_hash`, and template version

If Twilio fails:
- `status=failed`, store error fields

### STOP handling (Twilio inbound)
- Add a `POST /api/twilio/inbound` route
- Parse inbound message body for STOP/START/UNSTOP keywords
- On STOP: set `customer_contact_prefs.sms_opt_in=false` and insert `message_opt_outs`
- Reply with TwiML confirmation

### Routes
- `POST /api/stripe/webhook` (existing)
  - now calls `sendBookingConfirmationSMS(appointmentId)` after marking paid

- `GET /api/messages?appointmentId=...`
  - returns message log rows

- `POST /api/twilio/inbound`
  - handles STOP/START/UNSTOP opt-out keywords

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

### 5) Provider failover
Risk: Twilio outage blocks confirmation SMS.
Mitigation:
- record failures with retry_count and errors
- add failover provider later if needed

## Definition of Done

### Functional
- ✅ Paid booking triggers SMS send attempt
- ✅ SMS is not sent without opt-in
- ✅ Message is logged regardless of success/failure
- ✅ STOP opt-out is handled and recorded

### Correctness
- ✅ Idempotent under Stripe webhook retries
- ✅ Message log contains enough evidence (hash, template, timestamps, provider id, rendered body)
- ✅ Template versions are stored and referenced

### Delivery
- ✅ Runs in deployed environment with Twilio credentials
- ✅ Tests pass in CI (Twilio mocked)

## QA plan

### Unit tests (Vitest)
- Template renderer produces expected output (stable, no missing fields)
- Consent gating blocks sending
- Dedup key prevents duplicate sends
- STOP inbound handler disables `sms_opt_in`

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

## Completion Checklist

**Status**: Not started  
**Estimated Time to Finish**: 1–2 days  
**Last Updated**: 2026-02-09

---

## 🚨 CRITICAL (Must Fix Before Launch)

### 1. Add Messaging Tables + Enums
**Files**: `src/lib/schema.ts`, `drizzle/0007_message_log.sql`, `drizzle/meta/_journal.json`

Add enums:
- `message_channel` (`sms`)
- `message_purpose` (`booking_confirmation`)
- `message_status` (`queued`, `sent`, `failed`)

Add tables:
- `customer_contact_prefs` (pk `customer_id`, `sms_opt_in`, `updated_at`)
- `message_log` (required `rendered_body`, `body_hash`, `retry_count`, template fields)
- `message_dedup` (`dedup_key` pk)
- `message_templates` (key + version + body_template)
- `message_opt_outs` (STOP history)

**Validation**: Run `pnpm db:migrate` and confirm tables exist.

---

### 2. Capture SMS Opt-in in Booking Flow
**Files**: `src/components/booking/booking-form.tsx`, `src/app/api/bookings/create/route.ts`, `src/app/api/appointments/route.ts`, `src/lib/queries/appointments.ts`

- Add checkbox “Send me SMS updates about this booking.”
- Send `customer.smsOptIn` in API payload.
- Persist into `customer_contact_prefs` during appointment creation.

**Validation**: Create a booking with opt-in true. Verify `customer_contact_prefs.sms_opt_in=true`.

---

### 3. Twilio Client + Env
**Files**: `env.example`, `src/lib/env.ts`, `src/lib/twilio.ts` (new)

- Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- Add `smsIsMocked()` for tests (like Stripe).

**Validation**: App starts with Twilio env set; tests use mocked sender.

---

### 4. Send SMS on Payment Success
**Files**: `src/lib/messages.ts` (new), `src/app/api/stripe/webhook/route.ts`

Implement `sendBookingConfirmationSMS(appointmentId)`:
- Check `sms_opt_in`.
- Insert into `message_dedup`.
- Load template from `message_templates`.
- Render, hash, send.
- Write `message_log` row with `retry_count`.

Call from `payment_intent.succeeded` handler after DB updates.

**Validation**: Stripe webhook retry triggers only one message send and one log row.

---

### 5. Implement STOP Handling
**Files**: `src/app/api/twilio/inbound/route.ts` (new), `src/lib/queries/customers.ts` (or messages helper)

- Parse inbound body for STOP/START/UNSTOP.
- Update `customer_contact_prefs.sms_opt_in=false`.
- Insert `message_opt_outs` row with reason.
- Respond with TwiML confirmation.

**Validation**: POST a STOP payload and verify opt-out and history.

---

## 🔴 HIGH (Should Complete)

### 6. Appointment Detail + Message Log UI
**Files**: `src/app/app/appointments/page.tsx`, `src/app/app/appointments/[id]/page.tsx` (new)

- Add link from list to detail view.
- Show Messages table with status, sent_at, provider id, template key, body hash.

---

### 7. Messages API
**Files**: `src/app/api/messages/route.ts` (new)

- `GET` by `appointmentId`
- Auth via `requireAuth()`
- Ownership enforcement

---

## ✅ QA Plan

### Unit tests (Vitest)
- Template renderer output
- Consent gating blocks send
- Dedup prevents duplicates
- STOP handler writes opt-out and disables future sends

### Integration
- Webhook called twice → single `message_log` row
- Twilio failure → `message_log.status=failed` with `retry_count=1`

### E2E (Playwright)
- Book + pay → appointment detail shows one confirmation message
