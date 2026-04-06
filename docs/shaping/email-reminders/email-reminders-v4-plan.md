# Email Reminders V4: Query + Message Infrastructure

**Slice:** V4 of 6
**Status:** ⏳ PENDING
**Goal:** Find appointments to remind and integrate with deduplication/logging

---

## Overview

This slice connects email sending with the existing message infrastructure. We'll create a query to find appointments needing reminders, build a manual send endpoint for testing, and integrate with the deduplication and logging systems that already handle SMS messages.

**What this slice does:**
- Creates `findAppointmentsForEmailReminder()` query to find appointments in 23-25 hour window
- Filters by `emailOptIn = true` and `status = "booked"`
- Creates manual send endpoint for testing individual appointments
- Integrates with `shouldSendMessage()` for deduplication
- Integrates with `logMessage()` for delivery tracking
- Uses template system from V2 to render emails

**What this slice does NOT do:**
- Automated cron job (V5)
- Batch processing (V5)
- Opt-out functionality on manage page (V6)
- Production scheduling (V6)

**Dependencies:**
- ✅ V1 complete (email sending works)
- ✅ V2 complete (schema + templates)
- ✅ V3 complete (opt-in preferences saved)

---

## Files to Create/Modify

### New Files

1. **`src/app/api/appointments/[id]/send-email-reminder/route.ts`** - Manual send endpoint
2. **`src/lib/__tests__/email-reminder-query.test.ts`** - Query unit tests
3. **`src/lib/__tests__/email-reminder-integration.test.ts`** - Integration tests

### Modified Files

1. **`src/lib/queries/appointments.ts`** - Add `findAppointmentsForEmailReminder()` query
2. **`src/lib/messages.ts`** - No changes needed (already supports email channel from V2)

---

## Implementation Steps

### Step 1: Create Query to Find Appointments for Reminders

**Modify `src/lib/queries/appointments.ts`:**

Add this query function (around line 350-400, after existing queries):

```typescript
/**
 * Find appointments that need email reminders
 *
 * Criteria:
 * - Appointment starts in 23-25 hours
 * - Status is "booked"
 * - Customer has emailOptIn = true (or no preference record, defaulting to true)
 *
 * Returns appointment details needed for email rendering
 */
export async function findAppointmentsForEmailReminder() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

  return db
    .select({
      appointmentId: appointments.id,
      customerId: customers.id,
      customerName: customers.fullName,
      customerEmail: customers.email,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      bookingUrl: appointments.bookingUrl,
      shopName: shops.name,
      shopId: shops.id,
      shopTimezone: shops.timezone,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(
      customerContactPrefs,
      eq(customerContactPrefs.customerId, customers.id)
    )
    .where(
      and(
        eq(appointments.status, "booked"), // Only booked appointments
        gte(appointments.startsAt, windowStart), // Starts after 23h from now
        lte(appointments.startsAt, windowEnd), // Starts before 25h from now
        or(
          eq(customerContactPrefs.emailOptIn, true), // Explicit opt-in
          isNull(customerContactPrefs.emailOptIn) // No preference = default true
        )
      )
    )
    .orderBy(appointments.startsAt);
}
```

**Key design decisions:**
- **23-25 hour window:** Gives 2-hour buffer to ensure daily cron job catches all appointments
- **Left join on preferences:** Handles customers without preference records (defaults to opt-in)
- **Status = "booked":** Excludes cancelled appointments
- **Returns bookingUrl:** Already generated during booking, no need to regenerate

**Verification:**
```bash
pnpm run typecheck
# Should pass without errors
```

---

### Step 2: Create Manual Send Endpoint

**Create `src/app/api/appointments/[id]/send-email-reminder/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, customers, shops, customerContactPrefs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateTemplate, renderTemplate, shouldSendMessage, logMessage } from "@/lib/messages";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Manual email reminder endpoint for testing
 *
 * Usage: POST /api/appointments/{appointmentId}/send-email-reminder
 *
 * This endpoint is for testing/manual triggering only.
 * The automated cron job will be implemented in V5.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const appointmentId = params.id;

  try {
    // Fetch appointment with customer and shop details
    const [appointmentData] = await db
      .select({
        appointmentId: appointments.id,
        customerId: customers.id,
        customerName: customers.fullName,
        customerEmail: customers.email,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        bookingUrl: appointments.bookingUrl,
        shopName: shops.name,
        shopId: shops.id,
        shopTimezone: shops.timezone,
        appointmentStatus: appointments.status,
        emailOptIn: customerContactPrefs.emailOptIn,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(
        customerContactPrefs,
        eq(customerContactPrefs.customerId, customers.id)
      )
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointmentData) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check if appointment is booked
    if (appointmentData.appointmentStatus !== "booked") {
      return NextResponse.json(
        {
          error: "Cannot send reminder for non-booked appointment",
          status: appointmentData.appointmentStatus,
        },
        { status: 400 }
      );
    }

    // Check if customer has opted in (default to true if no preference)
    const hasOptedIn = appointmentData.emailOptIn ?? true;
    if (!hasOptedIn) {
      return NextResponse.json(
        {
          error: "Customer has not opted in to email reminders",
          emailOptIn: false,
        },
        { status: 400 }
      );
    }

    // Check deduplication - have we already sent this reminder?
    const dedupKey = `email-reminder-${appointmentId}`;
    const shouldSend = await shouldSendMessage(
      appointmentData.customerId,
      "appointment_reminder_24h",
      "email",
      dedupKey
    );

    if (!shouldSend) {
      return NextResponse.json(
        {
          error: "Email reminder already sent for this appointment",
          appointmentId,
          dedupKey,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Get email template
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    // Format dates for email (convert to shop's timezone)
    const timezone = appointmentData.shopTimezone || "UTC";
    const startInTz = toZonedTime(appointmentData.startsAt, timezone);
    const endInTz = toZonedTime(appointmentData.endsAt, timezone);

    const appointmentDate = format(startInTz, "EEEE, MMMM d, yyyy");
    const appointmentTime = `${format(startInTz, "h:mm a")} - ${format(endInTz, "h:mm a")}`;

    // Prepare template variables
    const templateData = {
      customerName: appointmentData.customerName,
      shopName: appointmentData.shopName,
      appointmentDate,
      appointmentTime,
      bookingUrl: appointmentData.bookingUrl,
    };

    // Render email
    const subject = renderTemplate(template.subjectTemplate!, templateData);
    const body = renderTemplate(template.bodyTemplate!, templateData);

    // Send email
    const emailResult = await sendEmail({
      to: appointmentData.customerEmail,
      subject,
      html: body,
    });

    if (!emailResult.success) {
      // Log failure
      await logMessage({
        customerId: appointmentData.customerId,
        purpose: "appointment_reminder_24h",
        channel: "email",
        recipient: appointmentData.customerEmail,
        status: "failed",
        errorMessage: emailResult.error,
        dedupKey,
      });

      return NextResponse.json(
        {
          error: "Failed to send email",
          details: emailResult.error,
        },
        { status: 500 }
      );
    }

    // Log success
    await logMessage({
      customerId: appointmentData.customerId,
      purpose: "appointment_reminder_24h",
      channel: "email",
      recipient: appointmentData.customerEmail,
      status: "sent",
      externalMessageId: emailResult.messageId,
      dedupKey,
    });

    console.log(
      `[email-reminder] Sent to ${appointmentData.customerEmail} for appointment ${appointmentId}`
    );

    return NextResponse.json({
      success: true,
      message: "Email reminder sent successfully",
      appointmentId,
      recipient: appointmentData.customerEmail,
      messageId: emailResult.messageId,
      subject,
    });
  } catch (error) {
    console.error("[email-reminder] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Key integration points:**
- **shouldSendMessage()** - Prevents duplicate sends
- **logMessage()** - Tracks all attempts (success and failure)
- **getOrCreateTemplate()** - Fetches email template from DB
- **renderTemplate()** - Populates template variables
- **sendEmail()** - Delivers via Resend (from V1)

**Required imports:**

```typescript
// Add to package.json if not already present
"date-fns": "^3.0.0",
"date-fns-tz": "^2.0.0"
```

```bash
pnpm add date-fns date-fns-tz
```

**Verification:**
```bash
pnpm run typecheck
pnpm lint
# Both should pass
```

---

### Step 3: Create Query Unit Tests

**Create `src/lib/__tests__/email-reminder-query.test.ts`:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import {
  appointments,
  customers,
  shops,
  customerContactPrefs,
} from "../schema";
import { findAppointmentsForEmailReminder } from "../queries/appointments";
import { eq } from "drizzle-orm";

describe("findAppointmentsForEmailReminder", () => {
  let testShopId: string;
  let testCustomerId: string;
  let testAppointmentId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Test Shop",
        slug: "test-shop-reminder",
        timezone: "America/New_York",
        // ... other required fields
      })
      .returning();
    testShopId = shop.id;

    // Create test customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test Customer",
        email: "test@example.com",
        phone: "+11234567890",
      })
      .returning();
    testCustomerId = customer.id;
  });

  afterEach(async () => {
    // Cleanup
    if (testAppointmentId) {
      await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
    }
    await db
      .delete(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should find appointments in 23-25 hour window with emailOptIn=true", async () => {
    // Create preference with email opt-in
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    // Create appointment 24 hours from now
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: testCustomerId,
        startsAt,
        endsAt,
        status: "booked",
        bookingUrl: "https://example.com/manage/test123",
        // ... other required fields
      })
      .returning();
    testAppointmentId = appointment.id;

    // Query appointments
    const results = await findAppointmentsForEmailReminder();

    // Should find the appointment
    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find((r) => r.appointmentId === testAppointmentId);
    expect(found).toBeDefined();
    expect(found?.customerEmail).toBe("test@example.com");
    expect(found?.shopName).toBe("Test Shop");
  });

  it("should NOT find appointments with emailOptIn=false", async () => {
    // Create preference with email opt-out
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: false, // Opted out
      smsOptIn: false,
    });

    // Create appointment 24 hours from now
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: testCustomerId,
        startsAt,
        endsAt,
        status: "booked",
        bookingUrl: "https://example.com/manage/test456",
      })
      .returning();
    testAppointmentId = appointment.id;

    // Query appointments
    const results = await findAppointmentsForEmailReminder();

    // Should NOT find the appointment
    const found = results.find((r) => r.appointmentId === testAppointmentId);
    expect(found).toBeUndefined();
  });

  it("should find appointments when customer has no preference record (default true)", async () => {
    // No preference record = default to true

    // Create appointment 24 hours from now
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: testCustomerId,
        startsAt,
        endsAt,
        status: "booked",
        bookingUrl: "https://example.com/manage/test789",
      })
      .returning();
    testAppointmentId = appointment.id;

    // Query appointments
    const results = await findAppointmentsForEmailReminder();

    // Should find the appointment (default opt-in)
    const found = results.find((r) => r.appointmentId === testAppointmentId);
    expect(found).toBeDefined();
  });

  it("should NOT find cancelled appointments", async () => {
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: testCustomerId,
        startsAt,
        endsAt,
        status: "cancelled", // Cancelled status
        bookingUrl: "https://example.com/manage/test000",
      })
      .returning();
    testAppointmentId = appointment.id;

    const results = await findAppointmentsForEmailReminder();

    // Should NOT find cancelled appointment
    const found = results.find((r) => r.appointmentId === testAppointmentId);
    expect(found).toBeUndefined();
  });

  it("should NOT find appointments outside 23-25 hour window", async () => {
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    // Create appointment 48 hours from now (outside window)
    const now = new Date();
    const startsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: testCustomerId,
        startsAt,
        endsAt,
        status: "booked",
        bookingUrl: "https://example.com/manage/test111",
      })
      .returning();
    testAppointmentId = appointment.id;

    const results = await findAppointmentsForEmailReminder();

    // Should NOT find appointment (too far in future)
    const found = results.find((r) => r.appointmentId === testAppointmentId);
    expect(found).toBeUndefined();
  });
});
```

**Run tests:**
```bash
pnpm test src/lib/__tests__/email-reminder-query.test.ts
```

**Expected output:**
```
✓ src/lib/__tests__/email-reminder-query.test.ts (5 tests)
  ✓ findAppointmentsForEmailReminder (5)
    ✓ should find appointments in 23-25 hour window with emailOptIn=true
    ✓ should NOT find appointments with emailOptIn=false
    ✓ should find appointments when customer has no preference record
    ✓ should NOT find cancelled appointments
    ✓ should NOT find appointments outside 23-25 hour window

Test Files  1 passed (1)
     Tests  5 passed (5)
```

---

### Step 4: Create Integration Tests

**Create `src/lib/__tests__/email-reminder-integration.test.ts`:**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "../db";
import {
  appointments,
  customers,
  shops,
  customerContactPrefs,
  messageLog,
  messageDedup,
} from "../schema";
import { sendEmail } from "../email";
import { eq } from "drizzle-orm";

// Mock sendEmail
vi.mock("../email", () => ({
  sendEmail: vi.fn(),
}));

describe("Email Reminder Integration", () => {
  let testShopId: string;
  let testCustomerId: string;
  let testAppointmentId: string;

  beforeEach(async () => {
    // Create test data
    const [shop] = await db.insert(shops).values({
      name: "Test Shop",
      slug: "test-shop-integration",
      timezone: "America/New_York",
    }).returning();
    testShopId = shop.id;

    const [customer] = await db.insert(customers).values({
      shopId: testShopId,
      fullName: "Integration Test",
      email: "integration@example.com",
      phone: "+11234567890",
    }).returning();
    testCustomerId = customer.id;

    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [appointment] = await db.insert(appointments).values({
      shopId: testShopId,
      customerId: testCustomerId,
      startsAt,
      endsAt,
      status: "booked",
      bookingUrl: "https://example.com/manage/integration123",
    }).returning();
    testAppointmentId = appointment.id;

    // Reset mock
    vi.mocked(sendEmail).mockReset();
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(messageDedup).where(eq(messageDedup.customerId, testCustomerId));
    await db.delete(messageLog).where(eq(messageLog.customerId, testCustomerId));
    await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
    await db.delete(customerContactPrefs).where(eq(customerContactPrefs.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should send email and log message on success", async () => {
    // Mock successful email send
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: "msg_integration_123",
    });

    // Call manual send endpoint (simulate)
    const response = await fetch(
      `http://localhost:3000/api/appointments/${testAppointmentId}/send-email-reminder`,
      { method: "POST" }
    );

    expect(response.status).toBe(200);

    // Verify email was sent
    expect(sendEmail).toHaveBeenCalledOnce();
    const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
    expect(emailCall.to).toBe("integration@example.com");
    expect(emailCall.subject).toContain("Reminder");
    expect(emailCall.html).toContain("Integration Test");

    // Verify message was logged
    const logs = await db
      .select()
      .from(messageLog)
      .where(eq(messageLog.customerId, testCustomerId));

    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe("sent");
    expect(logs[0].channel).toBe("email");
    expect(logs[0].purpose).toBe("appointment_reminder_24h");
  });

  it("should prevent duplicate sends via deduplication", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: "msg_dedup_123",
    });

    // First send
    const response1 = await fetch(
      `http://localhost:3000/api/appointments/${testAppointmentId}/send-email-reminder`,
      { method: "POST" }
    );
    expect(response1.status).toBe(200);

    // Second send (should be blocked)
    const response2 = await fetch(
      `http://localhost:3000/api/appointments/${testAppointmentId}/send-email-reminder`,
      { method: "POST" }
    );
    expect(response2.status).toBe(409); // Conflict

    const data = await response2.json();
    expect(data.error).toContain("already sent");

    // Verify email was only sent once
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("should log failure when email send fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      error: "SMTP connection failed",
    });

    const response = await fetch(
      `http://localhost:3000/api/appointments/${testAppointmentId}/send-email-reminder`,
      { method: "POST" }
    );

    expect(response.status).toBe(500);

    // Verify failure was logged
    const logs = await db
      .select()
      .from(messageLog)
      .where(eq(messageLog.customerId, testCustomerId));

    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe("failed");
    expect(logs[0].errorMessage).toContain("SMTP");
  });
});
```

**Run integration tests:**
```bash
pnpm test src/lib/__tests__/email-reminder-integration.test.ts
```

---

## Testing Strategy

### 1. Query Unit Tests ✅

**What:** Test `findAppointmentsForEmailReminder()` query logic
**How:** Run `pnpm test src/lib/__tests__/email-reminder-query.test.ts`
**Covers:**
- Finds appointments with emailOptIn=true
- Excludes appointments with emailOptIn=false
- Defaults to true when no preference record
- Excludes cancelled appointments
- Respects 23-25 hour time window

**Success criteria:** All 5 tests pass

---

### 2. Integration Tests ✅

**What:** Test complete send flow with message infrastructure
**How:** Run `pnpm test src/lib/__tests__/email-reminder-integration.test.ts`
**Covers:**
- Successful send logs message
- Deduplication prevents duplicate sends
- Failures are logged with error messages

**Success criteria:** All 3 tests pass

---

### 3. Manual Send Testing ✅

**What:** Manually trigger email reminder via API endpoint
**How:** See Demo Script below
**Covers:**
- Template rendering with real data
- Email delivery via Resend
- Message logging in database
- Deduplication on second attempt

**Success criteria:** Email received, logged in database, dedup works

---

### 4. Database Verification ✅

**What:** Verify message log and dedup tables updated correctly
**How:** Check tables after manual send
**Covers:**
- messageLog has entry with status "sent"
- messageDedup has entry with dedupKey
- externalMessageId matches Resend messageId

**Success criteria:** Database reflects email send accurately

---

## Demo Script

### Prerequisites

1. **V1-V3 complete:**
   ```bash
   # Verify email infrastructure works
   ls src/lib/email.ts
   # Verify schema has emailOptIn
   pnpm db:studio
   # Verify template exists
   # Check message_templates table for email template
   ```

2. **Dev server running:**
   ```bash
   pnpm dev
   ```

3. **Test appointment created:**
   - Create a booking through the UI or database
   - Appointment should be 24 hours in the future
   - Customer should have emailOptIn=true

---

### Demo Steps

**Step 1: Create test appointment 24 hours in future**

You can either:
- **Option A:** Book through UI (see V3 demo)
- **Option B:** Insert directly in database

**Option B (Database insert):**

```bash
pnpm db:studio
```

**In appointments table, insert:**
- `shop_id`: [your test shop ID]
- `customer_id`: [customer with emailOptIn=true]
- `starts_at`: [24 hours from now]
- `ends_at`: [25 hours from now]
- `status`: "booked"
- `booking_url`: "https://example.com/manage/test123"

**Note the appointment ID** for the next step.

---

**Step 2: Verify appointment is queryable**

Create a test script to check query:

```typescript
// scripts/test-email-reminder-query.ts
import { findAppointmentsForEmailReminder } from "@/lib/queries/appointments";

async function testQuery() {
  const results = await findAppointmentsForEmailReminder();
  console.log(`Found ${results.length} appointments needing reminders:`);
  console.log(JSON.stringify(results, null, 2));
}

testQuery();
```

```bash
pnpm tsx --env-file=.env scripts/test-email-reminder-query.ts
```

**Expected output:**
```json
Found 1 appointments needing reminders:
[
  {
    "appointmentId": "uuid-here",
    "customerId": "customer-uuid",
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "startsAt": "2026-03-18T14:00:00.000Z",
    "endsAt": "2026-03-18T15:00:00.000Z",
    "bookingUrl": "https://example.com/manage/test123",
    "shopName": "Test Shop",
    "shopId": "shop-uuid",
    "shopTimezone": "America/New_York"
  }
]
```

✅ **Success:** Query finds the appointment

---

**Step 3: Manually send email reminder**

```bash
# Replace {appointmentId} with actual ID from Step 1
curl -X POST http://localhost:3000/api/appointments/{appointmentId}/send-email-reminder
```

**Expected response:**
```json
{
  "success": true,
  "message": "Email reminder sent successfully",
  "appointmentId": "uuid-here",
  "recipient": "test@example.com",
  "messageId": "msg_abc123xyz",
  "subject": "Reminder: Your appointment at Test Shop"
}
```

**Check console logs:**
```
[sendEmail] Email sent successfully: msg_abc123xyz
[email-reminder] Sent to test@example.com for appointment uuid-here
```

✅ **Success:** Email sent

---

**Step 4: Check email in inbox**

**Open your email inbox:**

**Expected email:**
- **To:** test@example.com
- **Subject:** "Reminder: Your appointment tomorrow at Test Shop"
- **Body:**
  - Greeting with customer name
  - Shop name, date, time
  - "Manage Your Booking" button
  - Styling applied (colors, borders, padding)

✅ **Success:** Email received with formatted content

---

**Step 5: Verify message logged in database**

```bash
pnpm db:studio
```

**Navigate to `message_log` table:**

**Find entry with:**
- `customer_id` = [your test customer ID]
- `purpose` = "appointment_reminder_24h"
- `channel` = "email"
- `status` = "sent"
- `recipient` = "test@example.com"
- `external_message_id` = "msg_abc123xyz" (Resend message ID)
- `created_at` = recent timestamp

✅ **Success:** Message logged correctly

---

**Step 6: Verify deduplication works**

**Try sending again:**

```bash
curl -X POST http://localhost:3000/api/appointments/{appointmentId}/send-email-reminder
```

**Expected response:**
```json
{
  "error": "Email reminder already sent for this appointment",
  "appointmentId": "uuid-here",
  "dedupKey": "email-reminder-uuid-here"
}
```

**HTTP status:** 409 Conflict

**Check inbox:**
- Should NOT receive a second email

**Check message_log:**
- Should still only have 1 entry (not 2)

✅ **Success:** Deduplication prevents duplicate send

---

**Step 7: Check dedup table**

```bash
pnpm db:studio
```

**Navigate to `message_dedup` table:**

**Find entry with:**
- `customer_id` = [your test customer ID]
- `message_key` = "appointment_reminder_24h"
- `channel` = "email"
- `dedup_key` = "email-reminder-{appointmentId}"
- `created_at` = timestamp of first send

✅ **Success:** Dedup record prevents duplicates

---

**Step 8: Test with opted-out customer**

**Create appointment for customer with emailOptIn=false:**

```bash
pnpm db:studio
```

**Update customerContactPrefs:**
- Find customer
- Set `email_opt_in` = `false`

**Try to send:**

```bash
curl -X POST http://localhost:3000/api/appointments/{appointmentId2}/send-email-reminder
```

**Expected response:**
```json
{
  "error": "Customer has not opted in to email reminders",
  "emailOptIn": false
}
```

**HTTP status:** 400 Bad Request

**Check inbox:**
- Should NOT receive email

✅ **Success:** Opt-out prevents sending

---

**Step 9: Test with cancelled appointment**

**Cancel appointment:**

```bash
pnpm db:studio
```

**Update appointment:**
- Set `status` = "cancelled"

**Try to send:**

```bash
curl -X POST http://localhost:3000/api/appointments/{appointmentId}/send-email-reminder
```

**Expected response:**
```json
{
  "error": "Cannot send reminder for non-booked appointment",
  "status": "cancelled"
}
```

**HTTP status:** 400 Bad Request

✅ **Success:** Cancelled appointments excluded

---

### Demo Success Criteria

✅ Query finds appointments in 23-25 hour window
✅ Query respects emailOptIn=true filter
✅ Manual send endpoint works
✅ Email delivered to inbox with formatted content
✅ Message logged in database with correct details
✅ Deduplication prevents second send
✅ Opted-out customers don't receive emails
✅ Cancelled appointments don't send emails
✅ Template variables render correctly (no {{}})
✅ Unit tests pass (5/5)
✅ Integration tests pass (3/3)
✅ `pnpm lint && pnpm typecheck` passes

---

## Troubleshooting

### Query returns no results

**Symptom:** `findAppointmentsForEmailReminder()` returns empty array

**Possible causes:**
1. No appointments in 23-25 hour window
2. All customers have emailOptIn=false
3. All appointments are cancelled

**Debug:**
```typescript
// Check raw query
const now = new Date();
console.log("Now:", now);
console.log("Window start:", new Date(now.getTime() + 23 * 60 * 60 * 1000));
console.log("Window end:", new Date(now.getTime() + 25 * 60 * 60 * 1000));

// Check appointments exist
const allAppts = await db.select().from(appointments).where(eq(appointments.status, "booked"));
console.log("Total booked appointments:", allAppts.length);
```

---

### Email not sent but API returns success

**Symptom:** API returns 200, but no email arrives

**Possible causes:**
1. Resend API key invalid
2. Email address invalid
3. Resend rate limit reached

**Debug:**
```bash
# Check Resend dashboard
# https://resend.com/emails

# Check server logs for sendEmail errors
# Look for "[sendEmail] Resend API error:"

# Test email infrastructure separately
curl "http://localhost:3000/api/test-email?to=your@email.com"
```

---

### Deduplication not working

**Symptom:** Can send same reminder multiple times

**Possible causes:**
1. dedupKey not consistent
2. messageDedup table not being written
3. shouldSendMessage() returning true incorrectly

**Debug:**
```typescript
// Add logging
console.log("Dedup key:", dedupKey);
const shouldSend = await shouldSendMessage(...);
console.log("Should send?", shouldSend);

// Check messageDedup table
const dedupRecords = await db.select().from(messageDedup)
  .where(eq(messageDedup.customerId, customerId));
console.log("Dedup records:", dedupRecords);
```

---

### Template variables not rendering

**Symptom:** Email shows {{customerName}} instead of actual name

**Possible causes:**
1. Template data keys don't match template placeholders
2. renderTemplate() not called
3. Template variables misspelled

**Debug:**
```typescript
// Log template data
console.log("Template data:", templateData);

// Log rendered output
console.log("Rendered subject:", subject);
console.log("Rendered body preview:", body.substring(0, 200));

// Check for remaining {{}}
const hasPlaceholders = body.includes("{{");
console.log("Has unreplaced placeholders?", hasPlaceholders);
```

---

### Date formatting errors

**Symptom:** Dates show as "[Invalid Date]" or wrong timezone

**Possible causes:**
1. date-fns-tz not installed
2. Invalid timezone string
3. Date is null/undefined

**Debug:**
```typescript
// Check date values
console.log("startsAt:", appointmentData.startsAt);
console.log("timezone:", timezone);

// Test date-fns
import { format } from "date-fns";
const testDate = new Date();
console.log("Formatted:", format(testDate, "EEEE, MMMM d, yyyy"));
```

**Fix:**
```bash
pnpm add date-fns date-fns-tz
```

---

## Success Criteria

V4 is complete when:

- ✅ `findAppointmentsForEmailReminder()` query created
- ✅ Query finds appointments in 23-25 hour window
- ✅ Query filters by emailOptIn=true
- ✅ Query excludes cancelled appointments
- ✅ Manual send endpoint created
- ✅ Endpoint integrates with shouldSendMessage() (dedup)
- ✅ Endpoint integrates with logMessage() (tracking)
- ✅ Endpoint uses template system (getOrCreateTemplate, renderTemplate)
- ✅ Email sent successfully via manual trigger
- ✅ Message logged in database
- ✅ Deduplication prevents duplicate sends
- ✅ Unit tests pass (5/5)
- ✅ Integration tests pass (3/3)
- ✅ Manual testing: All scenarios work
- ✅ `pnpm lint && pnpm typecheck` passes with no errors

---

## Next: V5

Once V4 is complete, proceed to V5: Automated Cron Job

V5 will:
- Create `send-email-reminders` cron job
- Add CRON_SECRET authentication
- Implement PostgreSQL advisory locks
- Process appointments in batches
- Handle errors gracefully (continue processing on individual failures)

The query, deduplication, and message logging from V4 will be used by V5's automated job.
