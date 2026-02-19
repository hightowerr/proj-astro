# V4: Automated Reminders

**Goal:** Send automated SMS reminders to high-risk customers 24 hours before appointments

**Appetite:** 1 day

**Demo:** Create high-risk appointment for tomorrow → run reminder job manually → see SMS sent and logged in messageLog. High-risk customers get proactive intervention to reduce no-shows.

---

## Overview

V4 adds automated intervention to the no-show prediction system. When an appointment is flagged as high-risk (from V2 scoring), the system automatically sends an SMS reminder 24 hours before the appointment time. This gives customers a chance to cancel on-time (before cutoff) rather than no-showing. The reminder system respects SMS opt-in preferences, prevents duplicate messages, and logs all activity for audit trails.

### What's Built

- Query function: `findHighRiskAppointments()` (24-hour window, high-risk only)
- Dedup check: `checkReminderAlreadySent()` (prevents duplicate reminders)
- Message template: "appointment_reminder_24h" with customizable body
- Reminder job: `POST /api/jobs/send-reminders` (hourly cron)
- Template management: `ensureReminderTemplate()` (auto-create if missing)
- Message logging: Full audit trail in messageLog table
- Cron configuration: Hourly execution in vercel.json
- Unit tests for query and dedup logic

---

## Scope

### In Scope

- Find appointments: `startsAt` between now+23h and now+25h (2-hour window)
- Filter: `status='booked'`, `noShowRisk='high'`, customer has `smsOptIn=true`
- Dedup: Check messageLog for existing `appointment_reminder_24h` entry
- SMS message: "Reminder: Your appointment tomorrow at [time] at [shop]. Manage booking: [link]"
- Template system: Store template in messageTemplates, version control
- Message logging: Log all attempts (sent, failed, consent_missing, already_sent)
- Cron job: Hourly execution (catches appointments as they enter 24h window)
- Error handling: Continue processing on individual failures, return summary
- Advisory lock: Prevent concurrent job execution

### Out of Scope

- Multiple reminder windows (only 24h, not 1h or 1 week)
- Customizable reminder timing per shop (future enhancement)
- Customer preferences for reminder opt-out (uses existing smsOptIn)
- Reminder effectiveness tracking/analytics (future enhancement)
- Email reminders (SMS only for V4)
- Reminder for low/medium risk (high-risk only to minimize spam)

---

## Implementation Steps

### Step 1: Update Schema Enum (Sync Code with Migration)

**File:** `src/lib/schema.ts` (update existing enum)

The migration `0013_no_show_infra.sql` already added the enum values to the database, but the TypeScript schema definition needs to be updated:

```typescript
export const messagePurposeEnum = pgEnum("message_purpose", [
  "booking_confirmation",
  "cancellation_confirmation",      // Added in migration 0013
  "slot_recovery_offer",            // Added in migration 0013
  "appointment_reminder_24h",       // Added in migration 0013 - NEEDED FOR V4
]);
```

**Note:** No new migration needed. This just syncs the TypeScript types with the existing database enum.

---

### Step 2: Query Function for High-Risk Appointments

**File:** `src/lib/queries/appointments.ts` (add to existing)

```typescript
import { appointments, customers, customerContactPrefs } from "@/lib/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

/**
 * Find high-risk appointments in the 24-hour reminder window.
 *
 * Returns appointments that:
 * - Start between 23-25 hours from now (2-hour window for hourly cron)
 * - Are marked as high no-show risk (from V2 scoring)
 * - Are still booked (not cancelled)
 * - Customer has SMS opt-in enabled
 *
 * Used by send-reminders job to find candidates for automated reminders.
 *
 * @returns Array of appointments with customer contact info
 */
export async function findHighRiskAppointments(): Promise<
  Array<{
    appointmentId: string;
    shopId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    startsAt: Date;
    endsAt: Date;
    bookingUrl: string | null;
    shopName: string;
    shopTimezone: string;
  }>
> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // now + 23 hours
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // now + 25 hours

  const rows = await db
    .select({
      appointmentId: appointments.id,
      shopId: appointments.shopId,
      customerId: appointments.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      bookingUrl: appointments.bookingUrl,
      shopName: shops.name,
      shopTimezone: bookingSettings.timezone,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(
      customerContactPrefs,
      eq(appointments.customerId, customerContactPrefs.customerId)
    )
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
    .where(
      and(
        eq(appointments.status, "booked"),                    // Not cancelled
        eq(appointments.noShowRisk, "high"),                   // High risk only
        gte(appointments.startsAt, windowStart),               // Starts in 23+ hours
        lte(appointments.startsAt, windowEnd),                 // Starts in <25 hours
        eq(customerContactPrefs.smsOptIn, true)                // Customer consented
      )
    );

  return rows.map((row) => ({
    ...row,
    shopTimezone: row.shopTimezone ?? "UTC",
  }));
}
```

---

### Step 3: Dedup Check Function

**File:** `src/lib/queries/messages.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { messageLog } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

/**
 * Check if a reminder has already been sent for an appointment.
 *
 * Prevents duplicate reminders by checking messageLog for existing
 * 'appointment_reminder_24h' entry.
 *
 * @param appointmentId - Appointment UUID
 * @returns true if reminder already sent, false otherwise
 */
export async function checkReminderAlreadySent(
  appointmentId: string
): Promise<boolean> {
  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.appointmentId, appointmentId),
        eq(messageLog.purpose, "appointment_reminder_24h")
      )
    )
    .limit(1);

  return existing.length > 0;
}
```

---

### Step 4: Reminder Template Management

**File:** `src/lib/messages.ts` (extend existing file)

Add reminder template alongside booking template:

```typescript
const REMINDER_TEMPLATE_KEY = "appointment_reminder_24h";
const DEFAULT_REMINDER_TEMPLATE_VERSION = 1;
const DEFAULT_REMINDER_TEMPLATE_BODY =
  "Reminder: Your appointment tomorrow at {{time}} at {{shop_name}}. {{manage_link}}Reply STOP to opt out.";

/**
 * Ensure reminder message template exists.
 *
 * Creates template on first use if missing.
 * Returns latest version of template.
 */
const ensureReminderTemplate = async () => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, REMINDER_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      key: REMINDER_TEMPLATE_KEY,
      version: DEFAULT_REMINDER_TEMPLATE_VERSION,
      channel: "sms",
      bodyTemplate: DEFAULT_REMINDER_TEMPLATE_BODY,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  // Retry in case of race condition
  const retry = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, REMINDER_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (retry.length === 0) {
    throw new Error("Reminder template missing");
  }

  return retry[0];
};
```

---

### Step 5: Send Reminder SMS Function

**File:** `src/lib/messages.ts` (extend existing file)

Add reminder sending function alongside `sendBookingConfirmationSMS`:

```typescript
import { checkReminderAlreadySent } from "@/lib/queries/messages";

/**
 * Send appointment reminder SMS.
 *
 * Called by send-reminders job for high-risk appointments 24h before start.
 * Respects SMS opt-in, prevents duplicates, logs all attempts.
 *
 * @param appointmentId - Appointment UUID
 * @param shopId - Shop UUID
 * @param customerId - Customer UUID
 * @param customerName - Customer full name
 * @param customerPhone - Customer phone number
 * @param startsAt - Appointment start time
 * @param bookingUrl - Manage booking URL
 * @param shopName - Shop name
 * @param shopTimezone - Shop timezone for formatting
 */
export async function sendAppointmentReminderSMS(params: {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
}): Promise<void> {
  const {
    appointmentId,
    shopId,
    customerId,
    customerName,
    customerPhone,
    startsAt,
    bookingUrl,
    shopName,
    shopTimezone,
  } = params;

  // Check if reminder already sent (dedup)
  const alreadySent = await checkReminderAlreadySent(appointmentId);
  if (alreadySent) {
    console.log(
      `[sendAppointmentReminderSMS] Reminder already sent for appointment ${appointmentId}, skipping`
    );
    return;
  }

  // Load template
  const template = await ensureReminderTemplate();
  if (!template) {
    throw new Error("Failed to load or create reminder template");
  }

  // Format appointment time
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimezone,
    dateStyle: "short",
    timeStyle: "short",
  });

  // Render message body
  const renderedBody = renderTemplate(template.bodyTemplate, {
    shop_name: shopName,
    time: timeFormatter.format(startsAt),
    manage_link: bookingUrl ? `Manage: ${bookingUrl} ` : "",
  });
  const bodyHash = hashBody(renderedBody);

  // Base log entry
  const baseLog = {
    shopId,
    appointmentId,
    customerId,
    channel: "sms" as const,
    purpose: "appointment_reminder_24h" as const,
    toPhone: customerPhone,
    provider: "twilio",
    bodyHash,
    templateId: template.id,
    templateKey: template.key,
    templateVersion: template.version,
    renderedBody,
    retryCount: 0,
  };

  // Send SMS
  try {
    const { sid } = await sendTwilioSms({
      to: customerPhone,
      body: renderedBody,
    });

    await db.insert(messageLog).values({
      ...baseLog,
      status: "sent",
      providerMessageId: sid,
      sentAt: new Date(),
    });

    console.log(
      `[sendAppointmentReminderSMS] Sent reminder for appointment ${appointmentId} (SID: ${sid})`
    );
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string | number }).code)
        : undefined;

    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      retryCount: 1,
      errorCode,
      errorMessage: (error as Error).message ?? "SMS send failed",
    });

    console.error(
      `[sendAppointmentReminderSMS] Failed to send reminder for appointment ${appointmentId}:`,
      error
    );

    // Re-throw to allow job to track errors
    throw error;
  }
}
```

---

### Step 6: Reminder Job Handler

**File:** `src/app/api/jobs/send-reminders/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { findHighRiskAppointments } from "@/lib/queries/appointments";
import { sendAppointmentReminderSMS } from "@/lib/messages";

/**
 * Send automated appointment reminders to high-risk customers.
 *
 * Scheduled to run hourly via Vercel Cron.
 *
 * Finds high-risk appointments starting in 24 hours (23-25h window),
 * sends SMS reminders to customers who have opted in,
 * prevents duplicates via messageLog check.
 *
 * Uses PostgreSQL advisory lock (482178) to prevent concurrent execution.
 *
 * Authentication: x-cron-secret header (same pattern as other jobs)
 */

export const runtime = "nodejs";

const LOCK_ID = 482178; // Advisory lock ID (unique from other jobs)

export async function POST(request: NextRequest) {
  // Authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-cron-secret");
  if (!provided || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[send-reminders] Starting reminder job");

  // Acquire advisory lock
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${LOCK_ID}) as locked`
  );
  const locked = lockResult.rows[0]?.locked === true;

  if (!locked) {
    console.log("[send-reminders] Another job is running, skipping");
    return NextResponse.json(
      { message: "Another reminder job is running, skipped" },
      { status: 200 }
    );
  }

  try {
    // Find high-risk appointments in 24h window
    const appointments = await findHighRiskAppointments();

    console.log(
      `[send-reminders] Found ${appointments.length} high-risk appointments in 24h window`
    );

    let sentCount = 0;
    let skippedCount = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    // Send reminder for each appointment
    for (const appointment of appointments) {
      try {
        await sendAppointmentReminderSMS({
          appointmentId: appointment.appointmentId,
          shopId: appointment.shopId,
          customerId: appointment.customerId,
          customerName: appointment.customerName,
          customerPhone: appointment.customerPhone,
          startsAt: appointment.startsAt,
          bookingUrl: appointment.bookingUrl,
          shopName: appointment.shopName,
          shopTimezone: appointment.shopTimezone,
        });

        sentCount++;
      } catch (error) {
        // Check if it was a dedup skip (not a real error)
        if (
          error instanceof Error &&
          error.message.includes("already sent")
        ) {
          skippedCount++;
        } else {
          console.error(
            `[send-reminders] Error sending reminder for appointment ${appointment.appointmentId}:`,
            error
          );
          errors.push({
            appointmentId: appointment.appointmentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    console.log(
      `[send-reminders] Completed: ${sentCount} sent, ${skippedCount} skipped, ${errors.length} errors`
    );

    return NextResponse.json({
      total: appointments.length,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Return first 10 errors
    });
  } finally {
    // Release advisory lock
    await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_ID})`);
  }
}
```

---

### Step 7: Update Vercel Cron Configuration

**File:** `vercel.json` (extend existing)

The vercel.json file already has cron jobs. Add the reminder job:

```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/jobs/recompute-scores",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/jobs/send-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Hourly (every hour on the hour) to catch appointments as they enter the 24h window.

---

### Step 8: Unit Tests

**File:** `src/lib/__tests__/reminder-job.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  customerContactPrefs,
  shops,
  bookingSettings,
} from "@/lib/schema";
import { findHighRiskAppointments } from "@/lib/queries/appointments";
import { checkReminderAlreadySent } from "@/lib/queries/messages";

describe("findHighRiskAppointments", () => {
  it("returns high-risk appointments in 24h window", async () => {
    // Setup: Create high-risk appointment starting in 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create shop, customer, appointment with high risk
    // ... (test setup code) ...

    const results = await findHighRiskAppointments();

    expect(results.length).toBe(1);
    expect(results[0].appointmentId).toBeDefined();
  });

  it("excludes appointments outside 24h window", async () => {
    // Setup: Create appointment in 48 hours (outside window)
    // ... (test setup code) ...

    const results = await findHighRiskAppointments();

    expect(results.length).toBe(0);
  });

  it("excludes low and medium risk appointments", async () => {
    // Setup: Create appointment with low risk
    // ... (test setup code) ...

    const results = await findHighRiskAppointments();

    expect(results.length).toBe(0);
  });

  it("excludes customers without SMS opt-in", async () => {
    // Setup: Create high-risk appointment but customer has smsOptIn=false
    // ... (test setup code) ...

    const results = await findHighRiskAppointments();

    expect(results.length).toBe(0);
  });

  it("excludes cancelled appointments", async () => {
    // Setup: Create high-risk appointment but status='cancelled'
    // ... (test setup code) ...

    const results = await findHighRiskAppointments();

    expect(results.length).toBe(0);
  });
});

describe("checkReminderAlreadySent", () => {
  it("returns true if reminder already sent", async () => {
    // Setup: Insert messageLog entry with purpose='appointment_reminder_24h'
    // ... (test setup code) ...

    const result = await checkReminderAlreadySent(appointmentId);

    expect(result).toBe(true);
  });

  it("returns false if no reminder sent yet", async () => {
    // Setup: Appointment with no messageLog entries
    // ... (test setup code) ...

    const result = await checkReminderAlreadySent(appointmentId);

    expect(result).toBe(false);
  });

  it("returns false if only booking confirmation sent", async () => {
    // Setup: messageLog has booking_confirmation but not reminder
    // ... (test setup code) ...

    const result = await checkReminderAlreadySent(appointmentId);

    expect(result).toBe(false);
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Create test appointment:**
   ```bash
   # In Drizzle Studio:
   # 1. Create appointment with startsAt = now + 24 hours
   # 2. Set noShowRisk = 'high'
   # 3. Set status = 'booked'
   # 4. Ensure customer has smsOptIn = true
   ```

2. **Run reminder job manually:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/send-reminders \
     -H "x-cron-secret: $CRON_SECRET"
   ```

   **Verify:**
   - ✅ Job returns 200 with sent count
   - ✅ Response: `{ total: 1, sent: 1, skipped: 0, errors: 0 }`

3. **Check messageLog:**
   - Open Drizzle Studio
   - View messageLog table

   **Verify:**
   - ✅ New entry with purpose='appointment_reminder_24h'
   - ✅ status='sent' (or 'failed' with error details)
   - ✅ providerMessageId (Twilio SID) populated
   - ✅ renderedBody contains appointment time + shop name
   - ✅ sentAt timestamp set

4. **Check SMS (if using Twilio test mode):**
   - Check Twilio console
   - Or check phone if using real credentials

   **Verify:**
   - ✅ SMS received with correct content
   - ✅ Contains appointment time
   - ✅ Contains shop name
   - ✅ Contains manage booking link

5. **Test deduplication:**
   - Run job again with same appointment

   **Verify:**
   - ✅ Job completes successfully
   - ✅ Response: `{ total: 1, sent: 0, skipped: 1, errors: 0 }`
   - ✅ Only one messageLog entry (no duplicate)

6. **Test filtering:**
   Create multiple appointments:
   - One high-risk in 24h (should send)
   - One low-risk in 24h (should skip)
   - One high-risk in 48h (should skip)
   - One high-risk in 24h but customer smsOptIn=false (should skip)
   - One high-risk in 24h but status='cancelled' (should skip)

   Run job and verify only the first appointment gets reminder.

7. **Test error handling:**
   - Set invalid phone number
   - Run job

   **Verify:**
   - ✅ Job continues processing other appointments
   - ✅ Error logged in messageLog with status='failed'
   - ✅ errorCode and errorMessage populated
   - ✅ Response includes error count

8. **Test advisory lock:**
   - Start job in terminal 1
   - Immediately start job in terminal 2

   **Verify:**
   - ✅ Second job returns "Another reminder job is running, skipped"
   - ✅ Only first job processes appointments

9. **Code quality:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

   **Expected:**
   - ✅ No linting errors
   - ✅ No TypeScript errors

### Automated Testing

```bash
pnpm test src/lib/__tests__/reminder-job.test.ts
```

**Expected:**
- ✅ All query filter tests pass
- ✅ Dedup logic works correctly
- ✅ Edge cases handled (cancelled, low-risk, no opt-in)

---

## Acceptance Criteria

- ✅ `findHighRiskAppointments()` query implemented
- ✅ Query filters by 23-25h window, high-risk, booked, SMS opt-in
- ✅ `checkReminderAlreadySent()` dedup check implemented
- ✅ `ensureReminderTemplate()` creates template on first use
- ✅ `sendAppointmentReminderSMS()` function implemented
- ✅ Reminder message includes appointment time, shop name, manage link
- ✅ `POST /api/jobs/send-reminders` endpoint created
- ✅ Job uses advisory lock (482178) to prevent concurrent execution
- ✅ Job continues processing on individual errors
- ✅ Job returns summary (total, sent, skipped, errors)
- ✅ All reminders logged to messageLog table
- ✅ Cron configured in vercel.json (hourly)
- ✅ Schema enum updated to include 'appointment_reminder_24h'
- ✅ Unit tests pass with ≥80% coverage
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Dependencies

**Required:**
- V1: Database schema (messageLog, messageTemplates, customerContactPrefs)
- V2: noShowRisk column populated on appointments
- Existing Twilio integration (`src/lib/twilio.ts`)
- Existing message template system (`src/lib/messages.ts`)
- CRON_SECRET environment variable

**Enables:**
- Proactive intervention for high-risk appointments
- Reduces no-shows through timely reminders
- Provides audit trail of all reminder attempts
- Complements V5 no-show detection (prevent before detect)

---

## Cut Strategy

If time runs short:

**Must have (core reminder):**
- ✅ Query function (N12)
- ✅ Dedup check (N8)
- ✅ Reminder job (N5)
- ✅ Message logging (N13)

**Nice to have:**
- Template versioning (can use hardcoded template)
- Comprehensive unit tests (can add incrementally)
- Error recovery/retry logic (can add later)

**Can cut entirely:**
- Template customization UI (future enhancement)
- Reminder effectiveness analytics (future enhancement)

Core reminder functionality is more important than polish.

---

## Notes

### Design Principles

1. **Non-intrusive:** Only high-risk appointments get reminders (minimizes spam)
2. **Respectful:** Honors SMS opt-in preferences
3. **Reliable:** Dedup prevents duplicate messages
4. **Transparent:** All attempts logged for audit
5. **Resilient:** Individual failures don't stop job

### Message Design

- **Tone:** Helpful reminder, not accusatory
- **Brevity:** Short message (SMS length limits)
- **Actionable:** Includes manage link for easy cancellation
- **Clear:** States time, shop name, purpose

### Timing Rationale

- **24-hour window:** Gives customer time to cancel before cutoff
- **Hourly cron:** Catches appointments as they enter window
- **23-25h range:** 2-hour window accounts for hourly schedule

### SMS Opt-In Compliance

- Respects `customerContactPrefs.smsOptIn` flag
- Includes "Reply STOP to opt out" in message
- Logs consent checks in messageLog

### Performance Considerations

- Single query for all high-risk appointments (efficient)
- Advisory lock prevents stampeding herd
- Hourly schedule (low overhead)
- Estimated runtime: <30 seconds for 100 reminders

### Future Enhancements (Out of Scope)

- Multiple reminder windows (1h, 1 week)
- Shop-specific reminder timing preferences
- A/B testing reminder effectiveness
- Email reminders in addition to SMS
- Reminder templates per shop
- Analytics dashboard (reminder → show-up rate)

---

## Rollback Plan

If V4 causes issues:

1. **Disable cron:** Comment out reminder job in vercel.json, redeploy
2. **Stop job:** Job is idempotent, safe to stop and restart
3. **Check logs:** messageLog table has full audit trail
4. **No data loss:** Messages logged even on failure

V4 is purely additive. No impact on booking flow or existing features. Safe to deploy and rollback.

---

## Next Steps

After V4 ships:

1. Monitor reminder job execution (Vercel cron logs)
2. Check messageLog for send failures (investigate Twilio errors)
3. Measure reminder effectiveness (compare no-show rates)
4. Gather feedback from businesses (are reminders helping?)
5. Consider expanding to medium-risk appointments (A/B test)
6. Begin V5: No-Show Detection + Slot Recovery Integration

V4 completes the proactive loop: predict risk (V2) → explain why (V3) → intervene automatically (V4).
