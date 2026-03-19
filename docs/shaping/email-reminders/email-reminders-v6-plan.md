# Email Reminders V6: Production Ready

**Slice:** V6 of 6 (Final)
**Status:** ⏳ PENDING
**Goal:** End-to-end automation with opt-out control

---

## Overview

This final slice makes email reminders production-ready. We'll schedule the cron job in Vercel, add opt-out controls to the manage booking page, create E2E tests for the complete flow, and provide a production deployment checklist.

**What this slice does:**
- Schedules cron job in `vercel.json` (02:00 UTC daily)
- Adds email opt-out checkbox to manage booking page
- Creates API endpoint to update email preferences
- Creates E2E tests for complete booking → reminder flow
- Provides production deployment checklist
- Documents monitoring and alerting setup

**What this slice completes:**
- ✅ Full automation (no manual intervention)
- ✅ Customer control (opt-in/opt-out)
- ✅ Complete test coverage
- ✅ Production-ready deployment

**Dependencies:**
- ✅ V1 complete (email infrastructure)
- ✅ V2 complete (schema + templates)
- ✅ V3 complete (booking opt-in)
- ✅ V4 complete (query + send logic)
- ✅ V5 complete (automated cron job)

---

## Files to Create/Modify

### New Files

1. **`src/app/api/manage/[token]/update-preferences/route.ts`** - Update email preferences API
2. **`tests/e2e/email-reminders-flow.spec.ts`** - E2E tests
3. **`docs/production/email-reminders-deployment.md`** - Deployment checklist

### Modified Files

1. **`vercel.json`** - Add cron schedule
2. **`src/components/manage/manage-booking-view.tsx`** - Add opt-out checkbox
3. **`env.example`** - Document all email-related env vars

---

## Implementation Steps

### Step 1: Add Cron Schedule to vercel.json

**Modify `vercel.json`:**

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
      "path": "/api/jobs/recompute-no-show-stats",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/jobs/send-email-reminders",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/jobs/send-reminders",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/jobs/send-confirmations",
      "schedule": "5 3 * * *"
    },
    {
      "path": "/api/jobs/expire-confirmations",
      "schedule": "10 3 * * *"
    },
    {
      "path": "/api/jobs/scan-calendar-conflicts",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**Schedule details:**
- **Time:** 02:00 UTC daily
- **Position:** Runs with other jobs at 02:00 (recompute-scores, recompute-no-show-stats)
- **Before SMS:** Email reminders (02:00) run 1 hour before SMS reminders (03:00)
- **Slot usage:** Uses 9th of 9 available slots in Vercel Hobby plan

**Cron syntax:** `"0 2 * * *"` = minute 0, hour 2, every day, every month, every day of week

**Verification:**
```bash
# Validate JSON syntax
cat vercel.json | jq .
# Should parse without errors
```

---

### Step 2: Add Opt-Out Control to Manage Booking Page

**Modify `src/components/manage/manage-booking-view.tsx`:**

Find the section where booking details are displayed (around line 50-100) and add the email preferences section:

```tsx
// Add state for email preferences (near other state declarations)
const [emailOptIn, setEmailOptIn] = useState(
  booking.customer.emailOptIn ?? true
);
const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);

// Add handler for updating preferences
const handleEmailPreferenceChange = async (checked: boolean) => {
  setIsUpdatingPreferences(true);
  setPreferencesMessage(null);

  try {
    const response = await fetch(
      `/api/manage/${token}/update-preferences`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOptIn: checked }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update preferences");
    }

    setEmailOptIn(checked);
    setPreferencesMessage(
      checked
        ? "You'll receive email reminders for future appointments"
        : "Email reminders have been turned off"
    );
  } catch (error) {
    console.error("Error updating preferences:", error);
    setPreferencesMessage("Failed to update preferences. Please try again.");
    // Revert checkbox state
    setEmailOptIn(!checked);
  } finally {
    setIsUpdatingPreferences(false);
  }
};

// Add JSX for email preferences section (after booking details, before cancellation section)
<div className="mt-8 border-t pt-6">
  <h2 className="text-lg font-semibold mb-4">Email Preferences</h2>

  <div className="space-y-4">
    <div className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Checkbox
        id="emailOptIn"
        checked={emailOptIn}
        onCheckedChange={handleEmailPreferenceChange}
        disabled={isUpdatingPreferences}
        className="mt-0.5"
      />
      <div className="flex-1">
        <label
          htmlFor="emailOptIn"
          className="text-sm font-medium leading-none cursor-pointer"
        >
          Send me email reminders
        </label>
        <p className="text-sm text-gray-600 mt-1">
          Get an email reminder 24 hours before your appointments.
        </p>
      </div>
    </div>

    {preferencesMessage && (
      <div className={`text-sm p-3 rounded ${
        preferencesMessage.includes("Failed")
          ? "bg-red-50 text-red-700"
          : "bg-green-50 text-green-700"
      }`}>
        {preferencesMessage}
      </div>
    )}
  </div>
</div>
```

**Design notes:**
- Checkbox reflects current preference
- Disabled during update (prevents double-clicks)
- Success/error messages provide feedback
- Reverts on failure (optimistic UI with rollback)

**Verification:**
```bash
pnpm run typecheck
pnpm lint
# Both should pass
```

---

### Step 3: Create Update Preferences API Endpoint

**Create `src/app/api/manage/[token]/update-preferences/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, customers, customerContactPrefs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { validateManageToken } from "@/lib/manage-tokens";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  emailOptIn: z.boolean(),
});

/**
 * Update customer email preferences from manage booking page
 *
 * POST /api/manage/{token}/update-preferences
 * Body: { emailOptIn: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Validate token and get appointment
    const appointment = await validateManageToken(token);

    if (!appointment) {
      return NextResponse.json(
        { error: "Invalid or expired booking link" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const validation = updatePreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { emailOptIn } = validation.data;

    // Update or create customer preferences
    const existingPref = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, appointment.customerId))
      .limit(1);

    if (existingPref.length > 0) {
      // Update existing preference
      await db
        .update(customerContactPrefs)
        .set({
          emailOptIn,
          updatedAt: new Date(),
        })
        .where(eq(customerContactPrefs.customerId, appointment.customerId));
    } else {
      // Create new preference record
      await db.insert(customerContactPrefs).values({
        customerId: appointment.customerId,
        emailOptIn,
        smsOptIn: false, // Default for new records
      });
    }

    console.log(
      `[update-preferences] Customer ${appointment.customerId} set emailOptIn=${emailOptIn}`
    );

    return NextResponse.json({
      success: true,
      emailOptIn,
      message: emailOptIn
        ? "Email reminders enabled"
        : "Email reminders disabled",
    });
  } catch (error) {
    console.error("[update-preferences] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Security note:** Uses `validateManageToken()` to ensure only the customer with the valid manage link can update their preferences.

**Verification:**
```bash
pnpm run typecheck
pnpm lint
# Both should pass
```

---

### Step 4: Create E2E Tests

**Create `tests/e2e/email-reminders-flow.spec.ts`:**

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  shops,
  customerContactPrefs,
  messageLog,
  messageDedup,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

// Mock email sending for tests
test.beforeEach(async () => {
  // In test environment, emails are mocked via TWILIO_TEST_MODE pattern
  // or similar for email provider
});

test.describe("Email Reminders Complete Flow", () => {
  let testEmail: string;
  let testToken: string;
  let testAppointmentId: string;

  test.beforeEach(() => {
    testEmail = `test-${Date.now()}@example.com`;
  });

  test("should complete full flow: book → opt in → send reminder → opt out", async ({
    page,
  }) => {
    // STEP 1: Book appointment with email opt-in
    await page.goto("/book/test-shop-slug");

    await page.fill('input[name="fullName"]', "E2E Test User");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', "+11234567890");

    // Verify email opt-in checkbox is checked by default
    const emailOptInCheckbox = page.locator('input[id="emailOptIn"]');
    await expect(emailOptInCheckbox).toBeChecked();

    // Select time slot 24 hours in future
    await page.click('button:has-text("2:00 PM")');

    // Submit booking
    await page.click('button[type="submit"]:has-text("Book")');

    // Wait for success
    await expect(page.locator('text=Booking confirmed')).toBeVisible({
      timeout: 10000,
    });

    // Extract manage token from success page
    const manageLink = await page.locator('a:has-text("Manage")').getAttribute("href");
    testToken = manageLink?.split("/manage/")[1] || "";
    expect(testToken).toBeTruthy();

    // STEP 2: Verify preference in database
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    expect(customer.length).toBe(1);
    testAppointmentId = (
      await db
        .select()
        .from(appointments)
        .where(eq(appointments.customerId, customer[0].id))
        .limit(1)
    )[0].id;

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, customer[0].id))
      .limit(1);

    expect(prefs.length).toBe(1);
    expect(prefs[0].emailOptIn).toBe(true);

    // STEP 3: Trigger email reminder job (simulate cron)
    const cronResponse = await fetch(
      "http://localhost:3000/api/jobs/send-email-reminders",
      {
        method: "POST",
        headers: {
          "x-cron-secret": process.env.CRON_SECRET!,
        },
      }
    );

    expect(cronResponse.status).toBe(200);
    const cronData = await cronResponse.json();
    expect(cronData.sent).toBeGreaterThanOrEqual(1);

    // STEP 4: Verify email was logged
    const emailLogs = await db
      .select()
      .from(messageLog)
      .where(
        and(
          eq(messageLog.customerId, customer[0].id),
          eq(messageLog.channel, "email"),
          eq(messageLog.purpose, "appointment_reminder_24h")
        )
      );

    expect(emailLogs.length).toBe(1);
    expect(emailLogs[0].status).toBe("sent");

    // STEP 5: Navigate to manage booking page
    await page.goto(`/manage/${testToken}`);

    // Verify booking details are shown
    await expect(page.locator('text=E2E Test User')).toBeVisible();

    // Verify email opt-in checkbox is checked
    const manageOptInCheckbox = page.locator('input[id="emailOptIn"]');
    await expect(manageOptInCheckbox).toBeChecked();

    // STEP 6: Opt out of email reminders
    await manageOptInCheckbox.uncheck();

    // Wait for success message
    await expect(
      page.locator('text=Email reminders have been turned off')
    ).toBeVisible({ timeout: 5000 });

    // STEP 7: Verify preference updated in database
    const updatedPrefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, customer[0].id))
      .limit(1);

    expect(updatedPrefs[0].emailOptIn).toBe(false);

    // STEP 8: Verify future reminders would be blocked
    // Create another appointment for same customer
    const now = new Date();
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

    await db.insert(appointments).values({
      shopId: customer[0].shopId,
      customerId: customer[0].id,
      startsAt: futureStart,
      endsAt: futureEnd,
      status: "booked",
      bookingUrl: `https://example.com/manage/test-${Date.now()}`,
    });

    // Query appointments for reminders
    const { findAppointmentsForEmailReminder } = await import(
      "@/lib/queries/appointments"
    );
    const eligibleAppointments = await findAppointmentsForEmailReminder();

    // Should NOT include opted-out customer
    const foundOptedOut = eligibleAppointments.find(
      (apt) => apt.customerId === customer[0].id
    );
    expect(foundOptedOut).toBeUndefined();
  });

  test("should not send reminders to opted-out customers", async ({ page }) => {
    // Book appointment
    await page.goto("/book/test-shop-slug");

    await page.fill('input[name="fullName"]', "Opt Out Test");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', "+11234567891");

    // Uncheck email opt-in during booking
    const emailOptInCheckbox = page.locator('input[id="emailOptIn"]');
    await emailOptInCheckbox.uncheck();
    await expect(emailOptInCheckbox).not.toBeChecked();

    await page.click('button:has-text("2:00 PM")');
    await page.click('button[type="submit"]:has-text("Book")');

    await expect(page.locator('text=Booking confirmed')).toBeVisible({
      timeout: 10000,
    });

    // Verify preference in database
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, customer[0].id))
      .limit(1);

    expect(prefs[0].emailOptIn).toBe(false);

    // Trigger reminder job
    const cronResponse = await fetch(
      "http://localhost:3000/api/jobs/send-email-reminders",
      {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET! },
      }
    );

    expect(cronResponse.status).toBe(200);

    // Verify NO email was logged for this customer
    const emailLogs = await db
      .select()
      .from(messageLog)
      .where(
        and(
          eq(messageLog.customerId, customer[0].id),
          eq(messageLog.channel, "email")
        )
      );

    expect(emailLogs.length).toBe(0);
  });

  test.afterEach(async () => {
    // Cleanup test data
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    if (customer.length > 0) {
      await db
        .delete(messageDedup)
        .where(eq(messageDedup.customerId, customer[0].id));
      await db
        .delete(messageLog)
        .where(eq(messageLog.customerId, customer[0].id));
      await db
        .delete(appointments)
        .where(eq(appointments.customerId, customer[0].id));
      await db
        .delete(customerContactPrefs)
        .where(eq(customerContactPrefs.customerId, customer[0].id));
      await db.delete(customers).where(eq(customers.id, customer[0].id));
    }
  });
});
```

**Run E2E tests:**
```bash
pnpm test:e2e tests/e2e/email-reminders-flow.spec.ts
```

**Expected output:**
```
✓ tests/e2e/email-reminders-flow.spec.ts (2 tests)
  ✓ Email Reminders Complete Flow (2)
    ✓ should complete full flow: book → opt in → send reminder → opt out
    ✓ should not send reminders to opted-out customers

Test Files  1 passed (1)
     Tests  2 passed (2)
```

---

### Step 5: Update env.example Documentation

**Modify `env.example`:**

Add comprehensive documentation for all email-related variables:

```bash
# =============================================================================
# Email Reminders (Resend)
# =============================================================================

# Resend API key
# Get from: https://resend.com/api-keys
# Required for: Sending email reminders
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email "from" address
# Format: name@yourdomain.com
# Note: Domain must be verified in Resend dashboard for production
# For testing: Any email works without verification
EMAIL_FROM_ADDRESS=reminders@yourdomain.com
```

---

### Step 6: Create Production Deployment Checklist

**Create `docs/production/email-reminders-deployment.md`:**

```markdown
# Email Reminders Production Deployment Checklist

## Pre-Deployment

### 1. Environment Variables

Verify all environment variables are set in production:

```bash
# Required for email sending
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=reminders@yourdomain.com

# Required for cron authentication
CRON_SECRET=your-secure-secret-here

# Database (already configured)
POSTGRES_URL=postgresql://...

# Other existing vars
# ... (STRIPE, TWILIO, etc.)
```

**Action items:**
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Add `EMAIL_FROM_ADDRESS` to Vercel environment variables
- [ ] Verify domain in Resend dashboard (required for production emails)
- [ ] Test email sending in staging environment

---

### 2. Domain Verification (Resend)

**Why:** Production emails require verified domain to prevent spam filtering.

**Steps:**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records provided by Resend:
   - SPF record (TXT)
   - DKIM records (TXT)
   - DMARC record (TXT, optional but recommended)
5. Wait for DNS propagation (15 minutes - 48 hours)
6. Click "Verify" in Resend dashboard

**Verification:**
```bash
# Check SPF record
dig TXT yourdomain.com | grep "v=spf1"

# Check DKIM record
dig TXT resend._domainkey.yourdomain.com

# Test send after verification
curl -X POST https://yourapp.com/api/test-email?to=your@email.com
```

- [ ] Domain added to Resend
- [ ] DNS records configured
- [ ] Domain verified (green checkmark in dashboard)
- [ ] Test email sent successfully from verified domain

---

### 3. Database Migrations

Ensure all migrations from V2 are applied:

```bash
# Check current migration status
pnpm db:studio
# Verify:
# - customerContactPrefs has email_opt_in column
# - message_channel enum includes "email"
# - message_templates has email template

# If needed, run migrations
pnpm db:migrate
```

- [ ] Schema includes email support (V2 migration applied)
- [ ] Email template exists in message_templates table
- [ ] No pending migrations

---

### 4. Cron Job Configuration

Verify `vercel.json` is correct:

```json
{
  "crons": [
    {
      "path": "/api/jobs/send-email-reminders",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**After deployment, verify in Vercel dashboard:**
1. Go to Vercel project → Settings → Cron Jobs
2. Confirm `send-email-reminders` is listed
3. Schedule shows "0 2 * * *" (02:00 UTC daily)
4. Status is "Active"

- [ ] Cron job appears in Vercel dashboard
- [ ] Schedule is correct (02:00 UTC)
- [ ] Job is active

---

### 5. Monitoring Setup

Configure monitoring for email delivery:

**Resend Dashboard:**
- Email list: https://resend.com/emails
- Shows all sent emails, delivery status, opens, clicks
- Set up email alerts for delivery failures

**Vercel Logs:**
- View cron job logs: Vercel → Deployments → Functions
- Filter by: `/api/jobs/send-email-reminders`
- Look for: sent count, failed count, errors

**Database Monitoring:**
Query `messageLog` table for stats:

```sql
-- Email sent in last 24 hours
SELECT COUNT(*) FROM message_log
WHERE channel = 'email'
  AND purpose = 'appointment_reminder_24h'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Failed emails in last 24 hours
SELECT COUNT(*) FROM message_log
WHERE channel = 'email'
  AND status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Email delivery rate
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*),
    2
  ) as delivery_rate_percent
FROM message_log
WHERE channel = 'email'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Recommended alerts:**
- Email delivery rate < 95% (investigate)
- Failed email count > 10 in 1 hour (investigate)
- Cron job failed to run (critical)

- [ ] Resend dashboard monitored
- [ ] Vercel logs accessible
- [ ] Database queries set up
- [ ] Alerts configured (optional but recommended)

---

### 6. Test in Staging

Before production deployment, test in staging environment:

**Create test bookings:**
```bash
# Book appointment 24 hours in future
# Use real email address you can check

# Wait for cron job to run (or trigger manually)
curl -X POST https://staging.yourapp.com/api/jobs/send-email-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```

**Verify:**
- [ ] Email arrives in inbox
- [ ] Email is formatted correctly (HTML renders)
- [ ] All variables are replaced (no {{}})
- [ ] "Manage Your Booking" button works
- [ ] Opt-out on manage page works
- [ ] Second reminder is blocked (deduplication)

---

### 7. Rollout Plan

**Phase 1: Soft Launch (Week 1)**
- Deploy to production
- Monitor closely for first 7 days
- Check email delivery daily
- Check for customer complaints
- Verify deduplication working

**Phase 2: Monitor (Week 2-4)**
- Review delivery rate weekly
- Monitor messageLog for failures
- Check Resend dashboard for bounces
- Measure no-show rate impact

**Phase 3: Optimize (Month 2+)**
- Adjust reminder timing if needed (currently 24h)
- A/B test email templates
- Add multiple reminder times (if needed)
- Gather customer feedback

- [ ] Soft launch plan in place
- [ ] Team aware of launch timeline
- [ ] Monitoring schedule defined
- [ ] Rollback plan documented (if needed)

---

## Post-Deployment

### 1. Verify Cron Job Ran

Check Vercel logs after 02:00 UTC:

```bash
# Go to Vercel → Deployments → Functions
# Find: /api/jobs/send-email-reminders
# Check timestamp matches scheduled time
# Verify: "Job completed: X sent, 0 failed"
```

- [ ] Cron job ran at 02:00 UTC
- [ ] Job completed successfully
- [ ] Emails sent (if appointments existed)

---

### 2. Check First Emails

Monitor first emails sent:

- [ ] Check Resend dashboard for deliveries
- [ ] Verify no bounces or spam reports
- [ ] Check customer inboxes (if possible)
- [ ] Verify no customer complaints

---

### 3. Monitor for 7 Days

Daily checks for first week:

**Day 1-7 checklist:**
- [ ] Cron job ran successfully
- [ ] Email delivery rate > 95%
- [ ] No critical errors in logs
- [ ] No customer complaints
- [ ] Database queries show expected data

**Red flags:**
- Delivery rate < 90% → Investigate immediately
- Multiple bounces → Check domain verification
- Customer complaints → Review email content
- Cron job failures → Check CRON_SECRET, advisory locks

---

## Troubleshooting

### Emails not being sent

**Check 1: Cron job running?**
```bash
# Vercel → Functions → Filter by send-email-reminders
# Should see logs at 02:00 UTC daily
```

**Check 2: CRON_SECRET correct?**
```bash
# Vercel → Settings → Environment Variables
# Verify CRON_SECRET matches expected value
```

**Check 3: Domain verified?**
```bash
# Resend → Domains
# Green checkmark should appear
```

**Check 4: Appointments exist?**
```sql
-- Check if any appointments are in window
SELECT COUNT(*) FROM appointments
WHERE status = 'booked'
  AND starts_at >= NOW() + INTERVAL '23 hours'
  AND starts_at <= NOW() + INTERVAL '25 hours';
```

---

### High bounce rate

**Possible causes:**
1. Domain not verified → Verify in Resend
2. Invalid email addresses → Add validation
3. Customers marking as spam → Review email content

**Actions:**
- Check Resend dashboard for bounce reasons
- Verify domain SPF/DKIM records
- Review email template (too salesy?)
- Add unsubscribe link (already have opt-out)

---

### Customer complaints

**Common issues:**
- "I didn't sign up for emails" → Check opt-in checkbox is visible
- "Too many emails" → Verify deduplication working
- "Email looks like spam" → Review template design
- "Can't opt out" → Test manage page opt-out

**Actions:**
- Review opt-in language on booking form
- Check deduplication in messageDedup table
- A/B test email subject lines
- Verify opt-out saves to database

---

## Success Metrics

Track these metrics after deployment:

**Email Delivery (Target: >95%)**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*),
    2
  ) as delivery_rate
FROM message_log
WHERE channel = 'email'
  AND created_at > NOW() - INTERVAL '30 days';
```

**No-Show Rate Impact (Target: 5-10% reduction)**
```sql
-- Compare no-show rate before/after email reminders
-- Need 30+ days of data for statistical significance
```

**Opt-Out Rate (Acceptable: <5%)**
```sql
SELECT
  COUNT(*) FILTER (WHERE email_opt_in = false) as opted_out,
  COUNT(*) as total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE email_opt_in = false) / COUNT(*),
    2
  ) as opt_out_rate
FROM customer_contact_prefs
WHERE updated_at > NOW() - INTERVAL '30 days';
```

**Customer Satisfaction**
- Monitor support tickets about reminders
- Track spam reports in Resend dashboard
- Survey customers about reminder usefulness

---

## Rollback Plan

If critical issues arise:

**Option 1: Disable cron job (keep code)**
```json
// In vercel.json, comment out:
// {
//   "path": "/api/jobs/send-email-reminders",
//   "schedule": "0 2 * * *"
// }

// Redeploy
```

**Option 2: Revert deployment**
```bash
# Vercel → Deployments → Find previous deployment
# Click "..." → Promote to Production
```

**Option 3: Emergency disable in code**
```typescript
// In send-email-reminders/route.ts, add at top:
return NextResponse.json({
  message: "Email reminders temporarily disabled",
  processed: 0
});
```

---

## Contact

**Team:**
- Engineering: [engineering@team.com]
- Support: [support@team.com]

**External:**
- Resend Support: support@resend.com
- Vercel Support: vercel.com/support

**Documentation:**
- Resend Docs: https://resend.com/docs
- Vercel Cron Docs: https://vercel.com/docs/cron-jobs
```

---

## Testing Strategy

### 1. E2E Tests ✅

**What:** Complete flow from booking to opt-out
**How:** Run `pnpm test:e2e tests/e2e/email-reminders-flow.spec.ts`
**Covers:**
- Booking with opt-in
- Email reminder sent
- Message logged
- Opt-out on manage page
- Preference updated
- Future reminders blocked

**Success criteria:** Both E2E tests pass

---

### 2. Staging Deployment Test ✅

**What:** Deploy to staging and verify end-to-end
**How:** See production checklist above
**Covers:**
- Cron job runs in Vercel
- Email delivered via Resend
- All integrations work
- Opt-out works

**Success criteria:** Complete flow works in staging

---

### 3. Production Smoke Test ✅

**What:** Verify production deployment successful
**How:** Monitor first cron run after deployment
**Covers:**
- Cron job triggered
- Emails sent
- No errors in logs

**Success criteria:** First production run succeeds

---

### 4. Ongoing Monitoring ✅

**What:** Track metrics and health
**How:** Daily checks for first week, weekly after
**Covers:**
- Delivery rate
- Failed emails
- Customer complaints
- No-show rate impact

**Success criteria:** Metrics within targets (>95% delivery, <5% opt-out)

---

## Demo Script

### Prerequisites

1. **All V1-V5 complete and working in development**
2. **Staging environment available**
3. **Production deployment ready**

---

### Staging Demo

**Step 1: Deploy to staging**

```bash
# Push to staging branch (adjust for your workflow)
git checkout staging
git merge main
git push origin staging

# Verify deployment in Vercel dashboard
# Check: Deployment successful, cron job configured
```

---

**Step 2: Verify cron job scheduled**

1. Go to Vercel → Project → Settings → Cron Jobs
2. Find `send-email-reminders`
3. Verify schedule: "0 2 * * *"
4. Status: Active

✅ **Success:** Cron job is scheduled

---

**Step 3: Create test booking in staging**

```bash
# Open staging URL
https://staging.yourapp.com/book/test-shop

# Book appointment:
# - Use real email you can check
# - Set time 24 hours in future
# - Email opt-in checked
```

---

**Step 4: Manually trigger cron job in staging**

```bash
curl -X POST https://staging.yourapp.com/api/jobs/send-email-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```

**Expected response:**
```json
{
  "processed": 1,
  "sent": 1,
  "failed": 0,
  "skipped": 0,
  "duration": 523
}
```

✅ **Success:** Job runs in staging

---

**Step 5: Check email in inbox**

- Open inbox
- Find email from reminders@yourdomain.com
- Verify formatting, content, links work

✅ **Success:** Email delivered and formatted correctly

---

**Step 6: Test opt-out**

1. Click "Manage Your Booking" in email
2. Navigate to manage page
3. Uncheck "Send me email reminders"
4. Wait for success message

✅ **Success:** Opt-out works

---

**Step 7: Verify opt-out saved**

```bash
# Run job again
curl -X POST https://staging.yourapp.com/api/jobs/send-email-reminders \
  -H "x-cron-secret: $CRON_SECRET"

# Expected: skipped=1 (customer opted out)
```

✅ **Success:** Opted-out customer excluded

---

### Production Demo

**Step 1: Deploy to production**

```bash
git checkout main
git push origin main

# Verify deployment in Vercel
```

---

**Step 2: Monitor first cron run**

- Wait for 02:00 UTC
- Check Vercel logs
- Verify job completed successfully

✅ **Success:** First production run succeeds

---

**Step 3: Check Resend dashboard**

- Go to https://resend.com/emails
- Verify emails show "Delivered" status
- Check for any bounces or failures

✅ **Success:** Emails delivered in production

---

**Step 4: Monitor for 7 days**

- Daily checks for first week
- Use production checklist above
- Track delivery rate, failures, complaints

✅ **Success:** Stable for 1 week

---

### Demo Success Criteria

✅ Cron job configured in vercel.json
✅ Opt-out control works on manage page
✅ Update preferences API works
✅ E2E tests pass (2/2)
✅ Staging deployment successful
✅ Manual trigger works in staging
✅ Email delivered in staging
✅ Opt-out works in staging
✅ Production deployment successful
✅ First production cron run succeeds
✅ Emails delivered in production
✅ Monitoring set up
✅ No critical issues for 7 days

---

## Success Criteria

V6 is complete when:

- ✅ Cron schedule added to `vercel.json`
- ✅ Opt-out checkbox added to manage booking page
- ✅ Update preferences API endpoint created
- ✅ E2E tests created and passing (2/2)
- ✅ Production deployment checklist created
- ✅ env.example documented
- ✅ Staging deployment successful
- ✅ Production deployment successful
- ✅ First production cron run succeeds
- ✅ Monitoring in place
- ✅ All slices V1-V6 complete and working
- ✅ Feature is table stakes complete (matches Calendly, Timely, Cal.com)

---

## Feature Complete! 🎉

After V6, you have:

- ✅ **Email infrastructure** (V1) - Resend integration
- ✅ **Database support** (V2) - Schema, templates, channel enum
- ✅ **Booking opt-in** (V3) - Customer consent during booking
- ✅ **Query & send logic** (V4) - Find appointments, send with dedup/logging
- ✅ **Automated job** (V5) - Cron job with auth, locks, error handling
- ✅ **Production ready** (V6) - Scheduled, opt-out, tests, monitoring

**Result:** Professional, production-ready email reminder system that:
- Sends automated reminders 24h before appointments
- Respects customer preferences (opt-in/opt-out)
- Integrates with existing message infrastructure
- Handles errors gracefully
- Logs all activity for monitoring
- Prevents duplicate sends
- Works within Vercel constraints

**Next steps:**
- Monitor delivery rate and no-show impact
- Gather customer feedback
- Consider enhancements (multiple reminder times, custom templates, A/B testing)
