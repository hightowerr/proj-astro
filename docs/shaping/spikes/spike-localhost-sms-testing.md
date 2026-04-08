# Spike: Localhost SMS Testing

## Context

Currently failing to send SMS reminders in localhost environment with error:
```
[appointment_reminder_24h v1 • failed
Reminder: Your appointment tomorrow at 3/16/26, 1:00 PM at Nice trim. Manage: http://localhost:3000/book/nicetrim?appointment=a4bb798e-7e38-461e-a1ba-64906e356b36 Reply STOP to opt out.

consent_missing: SMS opt-in not found]
```

Need to understand how to test SMS functionality locally without sending real messages or hitting consent requirements.

## Goal

Identify concrete steps to enable SMS testing in localhost that:
- Avoids sending real SMS messages
- Bypasses or satisfies consent requirements
- Allows verification of message content and delivery logic
- Works with existing Twilio integration

## Questions

| # | Question |
|---|----------|
| **Q1** | What is causing the "consent_missing: SMS opt-in not found" error? |
| **Q2** | How does `TWILIO_TEST_MODE=true` work in the codebase? Where is it implemented? |
| **Q3** | What are Twilio's "magic test numbers" and how do they bypass consent? |
| **Q4** | What code changes are needed to enable test mode for reminder jobs? |
| **Q5** | Are there alternatives to test mode (mock services, logging, etc.)? |

## Findings

### Q1: What is causing the "consent_missing: SMS opt-in not found" error?

**Location**: `src/lib/messages.ts:326-334` (reminder SMS) and `:216-224` (booking confirmation SMS)

**Root cause**:
- The consent check happens at the **message layer**, not the Twilio layer
- `sendAppointmentReminderSMS()` checks if `prefs?.smsOptIn === true` exists in the `customerContactPrefs` table
- If missing or false, it logs the failure and returns without calling Twilio
- This check happens **BEFORE** reaching the `sendTwilioSms()` function

**Data flow**:
```
sendAppointmentReminderSMS()
  ↓
  Query customerContactPrefs.smsOptIn
  ↓
  If NOT true → log "consent_missing" → return
  ↓
  If true → sendTwilioSms() → Twilio API
```

### Q2: How does `TWILIO_TEST_MODE=true` work in the codebase?

**Location**: `src/lib/twilio.ts:8-9`, `:40-46`

**Mechanism**:
- When `TWILIO_TEST_MODE=true`, the code uses Twilio magic test numbers:
  - FROM: `TWILIO_TEST_FROM_NUMBER` (defaults to `+15005550006`)
  - TO: `TWILIO_TEST_TO_NUMBER_OVERRIDE` (if set, overrides customer phone)
- **Still makes REAL API calls** to Twilio's API (just with test credentials)
- Magic numbers don't send actual SMS but validate the API request
- **Does NOT bypass the consent check** (consent check happens upstream in `messages.ts`)

### Q3: What are Twilio's "magic test numbers"?

**Magic test numbers** are special phone numbers provided by Twilio for testing:
- **`+15005550006`**: Valid test "from" number (success)
- **`+15005550009`**: Can be used to test specific error scenarios
- See: https://www.twilio.com/docs/iam/test-credentials

**Behavior**:
- No SMS actually delivered (no charges)
- Returns valid SID and success response
- Goes through full API validation

### Q4: What code changes are needed to enable test mode for reminder jobs?

**Three options identified**:

#### Option A: Set smsOptIn in customer data (RECOMMENDED)
**Where**: When creating appointments via the booking API
**How**: The booking endpoint already accepts `smsOptIn` in customer data:
- `src/app/api/bookings/create/route.ts:26` - schema includes `smsOptIn: z.boolean().optional()`
- `src/lib/queries/appointments.ts:582-588` - passes smsOptIn to `upsertCustomerContactPrefs()`

**Implementation**:
```typescript
// In test data or booking form
{
  customer: {
    fullName: "Test User",
    phone: "+15551234567",
    email: "test@example.com",
    smsOptIn: true  // ← Add this
  }
}
```

**Pros**:
- No code changes needed
- Respects real consent flow
- Works in all environments

**Cons**:
- Requires explicit flag in test data
- Must remember to set for each test booking

#### Option B: Use PLAYWRIGHT mock mode
**Where**: Set environment variable `PLAYWRIGHT=true` or `NODE_ENV=test`
**How**: `src/lib/twilio.ts:6-7` - `smsIsMocked()` checks these flags

**Behavior**:
- `sendTwilioSms()` returns mock SID without API calls
- **Still fails consent check** - doesn't bypass message layer validation

**Limitation**: Only mocks Twilio calls, doesn't solve consent issue

#### Option C: Add dev mode bypass for consent (NEW CODE REQUIRED)
**Where**: Would need to modify `src/lib/messages.ts`
**Risk**: Could accidentally bypass consent in production
**Recommendation**: Avoid this approach

### Q5: Are there alternatives to test mode (mock services, logging, etc.)?

**Current mock mode** (`PLAYWRIGHT=true` or `NODE_ENV=test`):
- Completely bypasses Twilio API calls
- Returns mock SID: `mock_{uuid}`
- Still respects consent check (will still fail with "consent_missing")

**Logging**:
- All messages are logged to `messageLog` table with status "failed" or "sent"
- Can query to verify message was attempted:
  ```sql
  SELECT * FROM message_log
  WHERE appointment_id = '...'
  ORDER BY created_at DESC;
  ```

**Database inspection**:
- Check `customerContactPrefs` table to see if `smsOptIn` is set
- Check `messageLog` for delivery status and error codes

## Solution

**Recommended approach for localhost SMS testing**:

1. **Enable test mode** - Set in `.env`:
   ```bash
   TWILIO_TEST_MODE=true
   TWILIO_TEST_FROM_NUMBER=+15005550006  # Optional, this is the default
   ```

2. **Ensure smsOptIn consent** - When creating test bookings:
   ```typescript
   // In your test or manual booking
   {
     customer: {
       fullName: "Test Customer",
       phone: "+15551234567",
       email: "test@example.com",
       smsOptIn: true  // ← Critical for SMS to work
     }
   }
   ```

3. **Verify in database**:
   ```sql
   -- Check that customer has consent
   SELECT c.full_name, c.phone, ccp.sms_opt_in
   FROM customers c
   LEFT JOIN customer_contact_prefs ccp ON ccp.customer_id = c.id
   WHERE c.phone = '+15551234567';

   -- Check message log
   SELECT purpose, status, error_code, error_message, rendered_body
   FROM message_log
   WHERE appointment_id = 'your-appointment-id'
   ORDER BY created_at DESC;
   ```

4. **Alternative: Mock mode for unit tests** - Set in test environment:
   ```bash
   NODE_ENV=test  # or PLAYWRIGHT=true
   ```
   This bypasses Twilio API entirely but still requires `smsOptIn: true`

## What We Learned

**The key insight**: The "consent_missing" error is **not** a Twilio configuration issue - it's an application-level consent check that happens before reaching Twilio. `TWILIO_TEST_MODE` only changes how Twilio is called, not whether the consent check passes.

**To test SMS in localhost**:
- ✅ Set `TWILIO_TEST_MODE=true` (prevents real SMS)
- ✅ Set `smsOptIn: true` when creating customers (passes consent check)
- ✅ Check `messageLog` table to verify sends

**No code changes required** - the system already supports this flow.
