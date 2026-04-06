# Demo SMS Testing Corrections

## Issues Found in Original Demo

The original demo section had critical issues that would prevent SMS functionality from working in localhost testing.

### Issue 1: Missing smsOptIn ❌

**Problem:** Demo doesn't mention setting `smsOptIn: true` when creating test appointments.

**Impact:** SMS confirmation requests will fail with `consent_missing` error and be logged as failed in `message_log` table.

**Root cause:** The consent check happens at application level (in `src/lib/messages.ts`) before reaching Twilio, so `TWILIO_TEST_MODE` alone won't fix this.

### Issue 2: "Customer Replies YES" Won't Work in Localhost ⚠️

**Problem:** Demo assumes customer can reply via SMS without explaining webhook requirements.

**Impact:** In localhost, Twilio can't deliver webhook to your machine unless you use ngrok or manually simulate the reply.

**Options:**
- **Production/Deployed:** Configure Twilio webhook to your public URL
- **Localhost with ngrok:** Tunnel to expose localhost to Twilio
- **Localhost simulation:** Manually POST to `/api/twilio/inbound` to simulate reply

### Issue 3: TWILIO_TEST_MODE Limitation ⚠️

When `TWILIO_TEST_MODE=true`:
- SMS is "sent" to Twilio API with magic test numbers
- No actual SMS delivered (no charges)
- Customer can't reply via real SMS
- Must manually call webhook API to simulate replies

---

## Corrected Demo Section

After implementing this slice, you can:

### Setup

1. **Create test appointment for high-risk customer** (tier=risk OR score<40) starting in 36 hours:
   ```typescript
   await createAppointment({
     shopId: shop.id,
     startsAt: in36Hours,
     customer: {
       fullName: "Risk Customer",
       phone: "+15551234567",
       email: "risk@example.com",
       smsOptIn: true,  // ⚠️ REQUIRED for SMS to work
     },
   });
   ```

2. **Ensure customer has tier=risk OR score<40** (check `customer_scores` table)

3. **Trigger confirmation send:**
   ```bash
   # Wait for next hour, or manually trigger
   curl -X POST http://localhost:3000/api/jobs/send-confirmations \
     -H "x-cron-secret: $CRON_SECRET"
   ```

### Auto-Confirmation Flow

- Appointment appears in dashboard with `confirmationStatus='pending'`
- Customer receives SMS automatically (verify in `message_log` table)
- Dashboard shows **Pending** badge
- 24-hour deadline is set

### Customer Confirms (Choose One)

#### Option A: Production/ngrok (Real SMS)

**Setup:**
```bash
# Start ngrok tunnel
ngrok http 3000

# Configure Twilio webhook to:
# https://your-ngrok-url.ngrok.io/api/twilio/inbound
```

**Test:**
- Customer replies "YES" via SMS
- Twilio webhook calls `/api/twilio/inbound`
- Dashboard updates to **Confirmed** badge
- Appointment stays booked

#### Option B: Localhost Simulation

**Test:**
```bash
# Manually simulate YES reply
curl -X POST http://localhost:3000/api/twilio/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+15551234567&Body=YES"
```

**Result:**
- Dashboard updates to **Confirmed** badge
- Appointment stays booked
- `confirmationStatus` changes from `pending` to `confirmed`

### Customer Doesn't Confirm

1. **Wait 24 hours** (or manually update `confirmationDeadline` to past):
   ```sql
   UPDATE appointments
   SET confirmation_deadline = NOW() - INTERVAL '1 hour'
   WHERE id = 'your-appointment-id';
   ```

2. **Trigger expiration job:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/expire-confirmations \
     -H "x-cron-secret: $CRON_SECRET"
   ```

3. **Verify auto-cancellation:**
   - Appointment cancelled automatically
   - Refund issued (if payment succeeded)
   - Slot recovery offer loop triggered
   - Dashboard shows appointment removed or `status=cancelled`

### Verification Queries

**Check confirmation request was sent:**
```sql
SELECT purpose, status, error_code, error_message, rendered_body, created_at
FROM message_log
WHERE appointment_id = 'your-appointment-id'
ORDER BY created_at DESC;
```

**Check appointment confirmation status:**
```sql
SELECT
  id,
  confirmation_status,
  confirmation_sent_at,
  confirmation_deadline,
  status,
  financial_outcome
FROM appointments
WHERE id = 'your-appointment-id';
```

**Check customer consent:**
```sql
SELECT c.full_name, c.phone, ccp.sms_opt_in
FROM customers c
LEFT JOIN customer_contact_prefs ccp ON ccp.customer_id = c.id
WHERE c.phone = '+15551234567';
```

**Check refund (if expired):**
```sql
SELECT
  appointment_id,
  amount_cents,
  stripe_refund_id,
  refunded_at
FROM payments
WHERE appointment_id = 'your-appointment-id';
```

---

## Quick Troubleshooting

### Issue: "consent_missing: SMS opt-in not found"

**Cause:** `smsOptIn` not set when creating appointment

**Fix:**
```typescript
// Add smsOptIn to customer data
customer: {
  fullName: "Test Customer",
  phone: "+15551234567",
  email: "test@example.com",
  smsOptIn: true,  // ← Add this
}
```

**Verify:**
```bash
pnpm verify:sms  # Run diagnostic script
```

### Issue: SMS never sent

**Check:**
1. Environment variables configured:
   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   echo $TWILIO_TEST_MODE
   ```

2. Message log for errors:
   ```sql
   SELECT * FROM message_log
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. Console logs for warnings:
   ```
   [booking-sms] consent_missing
   [reminder-sms] consent_missing
   ```

### Issue: Customer reply "YES" not recognized

**Check:**
1. Phone number matches exactly (including +1 country code)
2. Webhook is configured and reachable
3. Appointment still has `confirmationStatus='pending'`
4. Deadline hasn't expired yet

**Manual test:**
```bash
# Simulate reply with exact phone number
curl -X POST http://localhost:3000/api/twilio/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+15551234567&Body=YES"
```

---

## Environment Setup for Testing

**Localhost with test mode:**
```env
# .env
TWILIO_TEST_MODE=true
TWILIO_TEST_FROM_NUMBER=+15005550006
TWILIO_ACCOUNT_SID=your_test_sid
TWILIO_AUTH_TOKEN=your_test_token
CRON_SECRET=your_cron_secret
```

**Production/ngrok:**
```env
# .env
TWILIO_TEST_MODE=false
TWILIO_PHONE_NUMBER=+15551234567  # Your real Twilio number
TWILIO_ACCOUNT_SID=your_live_sid
TWILIO_AUTH_TOKEN=your_live_token
```

**Twilio webhook configuration:**
- URL: `https://your-domain.com/api/twilio/inbound` (production)
- URL: `https://your-ngrok.ngrok.io/api/twilio/inbound` (ngrok)
- Method: `POST`
- Message comes in: Webhook enabled

---

## Related Documentation

- **SMS Testing Spike:** `docs/shaping/spike-localhost-sms-testing.md`
- **Implementation Plan:** `docs/shaping/spike-localhost-sms-testing-v1-plan.md`
- **README SMS Testing:** See "Testing SMS Functionality Locally" section
- **CLAUDE.md Critical Rule #9:** SMS testing requirements
