# Localhost SMS Testing - V1 Implementation Plan

## Context

The spike revealed that SMS testing failures in localhost are caused by missing `smsOptIn` consent, not Twilio configuration. While the system already supports everything needed, we should improve the developer experience to prevent this confusion.

**From spike**: `docs/shaping/spike-localhost-sms-testing.md`

**Problem**: Developers don't realize they need to set `smsOptIn: true` when creating test bookings, leading to "consent_missing" errors that appear to be Twilio configuration issues.

**Solution**: Make SMS opt-in explicit in documentation, test fixtures, and provide helpful diagnostics.

---

## Implementation Steps

### 1. Update Documentation

**File**: `README.md` and `CLAUDE.md`

**Changes**:

#### README.md - Add SMS Testing Section

Add after the "Testing" section:

```markdown
### Testing SMS Functionality Locally

SMS requires customer consent to send. When creating test bookings, include `smsOptIn: true`:

\`\`\`typescript
// Example booking request
{
  customer: {
    fullName: "Test Customer",
    phone: "+15551234567",
    email: "test@example.com",
    smsOptIn: true  // Required for SMS to work
  }
}
\`\`\`

**Configure test mode** in `.env`:
\`\`\`bash
TWILIO_TEST_MODE=true  # Uses magic test numbers, no real SMS sent
\`\`\`

**Verify messages** in the database:
\`\`\`sql
SELECT purpose, status, error_code, error_message
FROM message_log
WHERE appointment_id = 'your-appointment-id'
ORDER BY created_at DESC;
\`\`\`
```

#### CLAUDE.md - Add to "Critical Rules" Section

Add rule after #8:

```markdown
9. **SMS testing:** Always set `smsOptIn: true` in customer data for test bookings. The consent check happens before Twilio, so `TWILIO_TEST_MODE` alone won't fix "consent_missing" errors.
```

**Files changed**:
- `README.md` (add SMS testing section)
- `CLAUDE.md` (add critical rule #9)

---

### 2. Update Test Fixtures

**File**: Look for test helpers/fixtures that create bookings

**Goal**: Ensure all test bookings default to `smsOptIn: true`

**Search for files**:
```bash
# Find test helpers that create bookings
grep -r "createBooking\|booking.*helper" tests/ --include="*.ts"
grep -r "customer.*fullName.*phone" tests/ --include="*.ts"
```

**Expected changes**:
- If test helpers exist, add `smsOptIn: true` to customer data
- If no helpers exist, document this step as N/A

**Example change**:
```typescript
// Before
export const createTestBooking = async (overrides = {}) => {
  return await createAppointment({
    customer: {
      fullName: "Test Customer",
      phone: "+15551234567",
      email: "test@example.com",
      ...overrides.customer
    },
    ...overrides
  });
};

// After
export const createTestBooking = async (overrides = {}) => {
  return await createAppointment({
    customer: {
      fullName: "Test Customer",
      phone: "+15551234567",
      email: "test@example.com",
      smsOptIn: true,  // ← Add this
      ...overrides.customer
    },
    ...overrides
  });
};
```

---

### 3. Improve Error Messages (Optional Enhancement)

**File**: `src/lib/messages.ts`

**Current behavior**: Logs "consent_missing" to database but throws no error to caller

**Enhancement**: Make the error more discoverable in logs

**Changes**:

#### At line 326-334 (in `sendAppointmentReminderSMS`)

```typescript
// Before
if (!prefs?.smsOptIn) {
  await db.insert(messageLog).values({
    ...baseLog,
    status: "failed",
    errorCode: "consent_missing",
    errorMessage: "SMS opt-in not found",
  });
  return "consent_missing";
}

// After
if (!prefs?.smsOptIn) {
  console.warn("[reminder-sms] consent_missing", {
    customerId,
    appointmentId,
    message: "Customer has not opted in to SMS. Set smsOptIn=true when creating bookings to enable SMS.",
  });

  await db.insert(messageLog).values({
    ...baseLog,
    status: "failed",
    errorCode: "consent_missing",
    errorMessage: "SMS opt-in not found",
  });
  return "consent_missing";
}
```

#### At line 216-224 (in `sendBookingConfirmationSMS`)

```typescript
// Before
if (!prefs?.smsOptIn) {
  await db.insert(messageLog).values({
    ...baseLog,
    status: "failed",
    errorCode: "consent_missing",
    errorMessage: "SMS opt-in not found",
  });
  return;
}

// After
if (!prefs?.smsOptIn) {
  console.warn("[booking-sms] consent_missing", {
    customerId: appointment.customerId,
    appointmentId: appointment.id,
    message: "Customer has not opted in to SMS. Set smsOptIn=true when creating bookings to enable SMS.",
  });

  await db.insert(messageLog).values({
    ...baseLog,
    status: "failed",
    errorCode: "consent_missing",
    errorMessage: "SMS opt-in not found",
  });
  return;
}
```

**Benefit**: Developers see helpful console warnings pointing them to the solution

---

### 4. Verify env.example

**File**: `env.example`

**Check**: Ensure `TWILIO_TEST_MODE` is documented

**Current state** (lines 52-57):
```bash
# Twilio test mode for e2e (optional)
# Uses Twilio test credentials + magic numbers, no real SMS delivery/charges.
TWILIO_TEST_MODE=false
TWILIO_TEST_FROM_NUMBER=+15005550006
# Optional failure simulation number (e.g. +15005550009)
TWILIO_TEST_TO_NUMBER_OVERRIDE=
```

**Status**: ✅ Already documented correctly

**Action**: No changes needed

---

### 5. Add Helper Script (Optional)

**File**: `scripts/verify-sms-config.ts` (new)

**Purpose**: Quick diagnostic script to check if SMS is properly configured

```typescript
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getServerEnv } from "@/lib/env";

async function verifyConfig() {
  console.log("🔍 Verifying SMS Configuration\n");

  // Check env vars
  const env = getServerEnv();
  console.log("Environment Variables:");
  console.log(`  TWILIO_ACCOUNT_SID: ${env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${env.TWILIO_PHONE_NUMBER || '❌ Missing'}`);
  console.log(`  TWILIO_TEST_MODE: ${process.env.TWILIO_TEST_MODE || 'false'}`);
  console.log();

  // Check recent appointments for smsOptIn
  const recentAppointments = await db.query.appointments.findMany({
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      customer: {
        with: {
          contactPrefs: true,
        },
      },
    },
  });

  console.log("Recent Appointments (Last 5):");
  for (const apt of recentAppointments) {
    const hasConsent = apt.customer?.contactPrefs?.smsOptIn;
    console.log(`  ${apt.id.slice(0, 8)}... ${hasConsent ? '✅' : '❌'} smsOptIn=${hasConsent}`);
  }
  console.log();

  // Check message log for recent failures
  const failedMessages = await db.query.messageLog.findMany({
    where: (table, { eq }) => eq(table.status, 'failed'),
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (failedMessages.length > 0) {
    console.log("Recent Failed Messages:");
    for (const msg of failedMessages) {
      console.log(`  ${msg.errorCode}: ${msg.errorMessage}`);
    }
    console.log();
  }

  console.log("💡 Tips:");
  console.log("  - Set TWILIO_TEST_MODE=true in .env for localhost testing");
  console.log("  - Include smsOptIn:true when creating test bookings");
  console.log("  - Check message_log table for delivery status");

  process.exit(0);
}

verifyConfig().catch(console.error);
```

**Add to package.json**:
```json
{
  "scripts": {
    "verify:sms": "tsx scripts/verify-sms-config.ts"
  }
}
```

**Usage**:
```bash
pnpm verify:sms
```

---

## Testing Plan

### 1. Documentation Changes
- [ ] Build the docs and verify markdown renders correctly
- [ ] Read through updated sections to ensure clarity

### 2. Test Fixture Changes
- [ ] Run existing tests to ensure nothing breaks
- [ ] Verify test bookings now include smsOptIn
- [ ] Check that SMS-related tests pass

### 3. Error Message Improvements
- [ ] Create a test booking without smsOptIn
- [ ] Verify console warning appears with helpful message
- [ ] Check that message_log still records the error

### 4. Helper Script
- [ ] Run `pnpm verify:sms` on clean database
- [ ] Run after creating test bookings with/without smsOptIn
- [ ] Verify output is clear and actionable

---

## Success Criteria

✅ Developers can quickly understand SMS testing requirements from README
✅ Test fixtures default to smsOptIn=true, preventing confusion
✅ Console logs provide actionable guidance when consent is missing
✅ Diagnostic script helps troubleshoot SMS issues quickly

---

## Future Enhancements (Out of Scope)

- Seed script to create test customers with smsOptIn=true
- Admin UI toggle to bulk-update smsOptIn for existing test customers
- Better visualization of consent status in dashboard
- Webhook/SMS delivery tracking UI

---

## Rollout

1. **Phase 1**: Documentation updates (no risk, immediate value)
2. **Phase 2**: Test fixture updates (low risk, requires test verification)
3. **Phase 3**: Error message improvements (low risk, better DX)
4. **Phase 4**: Helper script (optional, nice-to-have)

**Estimated effort**: 1-2 hours total
**Risk level**: Low (mostly documentation, no breaking changes)
