# V4: Automatic Confirmation System

High-risk appointments automatically receive confirmation requests 24-48h before, auto-cancel if not confirmed.

---

## What Gets Built

- Auto-confirmation cron job (runs hourly)
- Auto-cancellation cron job (runs hourly)
- Vercel Cron configuration
- Integration with existing slot recovery system
- Automated SMS sending for high-risk appointments
- Automated cancellation for expired confirmations

---

## Demo

After implementing this slice, you can:

**Setup:**
1. Create test appointment for high-risk customer (tier=risk OR score<40) starting in 36 hours
2. Wait for next hour (or manually trigger cron job)

**Auto-confirmation:**
- Appointment appears in dashboard with confirmationStatus='pending'
- Customer receives SMS automatically
- Dashboard shows Pending badge

**Customer confirms:**
- Customer replies "YES"
- Dashboard updates to Confirmed badge
- Appointment stays booked

**Customer doesn't confirm:**
- Wait 24 hours (or manually update confirmationDeadline to past)
- Auto-cancellation cron runs
- Appointment cancelled automatically
- Slot recovery offer loop triggered
- Dashboard shows appointment removed or status=cancelled

---

## Implementation Steps

### Step 1: Create Auto-Confirmation Cron Job

Create `/app/api/jobs/send-confirmations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, customers } from "@/lib/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { sendConfirmationRequest } from "@/lib/confirmation";

/**
 * Auto-confirmation cron job
 * Runs every hour to send confirmation requests to high-risk appointments 24-48h away
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron sends this header)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find high-risk appointments in the 24-48h window that haven't been sent confirmations
    const appointmentsToConfirm = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        customerTier: customers.tier,
        customerScore: customers.score,
        voidedLast90Days: customers.voidedLast90Days,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .where(
        and(
          eq(appointments.status, "booked"),
          eq(appointments.confirmationStatus, "none"),
          gte(appointments.startsAt, twentyFourHoursFromNow),
          lte(appointments.startsAt, fortyEightHoursFromNow),
          sql`(
            ${customers.tier} = 'risk' OR
            ${customers.score} < 40 OR
            ${customers.voidedLast90Days} >= 2
          )`
        )
      );

    console.log(`Found ${appointmentsToConfirm.length} appointments to send confirmations`);

    const results = [];

    for (const appointment of appointmentsToConfirm) {
      try {
        await sendConfirmationRequest(appointment.id);
        results.push({ appointmentId: appointment.id, success: true });
      } catch (error) {
        console.error(`Failed to send confirmation for ${appointment.id}:`, error);
        results.push({ appointmentId: appointment.id, success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("Auto-confirmation cron error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
```

### Step 2: Create Auto-Cancellation Cron Job

Create `/app/api/jobs/expire-confirmations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/schema";
import { and, eq, lt } from "drizzle-orm";
import { cancelAppointment } from "@/lib/cancellation";
import { processSlotRecovery } from "@/lib/slot-recovery";

/**
 * Auto-cancellation cron job
 * Runs every hour to cancel appointments with expired confirmations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find appointments with pending confirmations past their deadline
    const expiredConfirmations = await db.query.appointments.findMany({
      where: and(
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "pending"),
        lt(appointments.confirmationDeadline, now)
      ),
      with: {
        customer: true,
        shop: true,
      },
    });

    console.log(`Found ${expiredConfirmations.length} expired confirmations to cancel`);

    const results = [];

    for (const appointment of expiredConfirmations) {
      try {
        // Update confirmation status to expired
        await db
          .update(appointments)
          .set({
            confirmationStatus: "expired",
          })
          .where(eq(appointments.id, appointment.id));

        // Cancel the appointment
        await cancelAppointment({
          appointmentId: appointment.id,
          reason: "confirmation_expired",
          issueRefund: true, // Issue refund since customer didn't confirm
        });

        // Trigger slot recovery
        await processSlotRecovery(appointment.id);

        results.push({ appointmentId: appointment.id, success: true });
      } catch (error) {
        console.error(`Failed to cancel expired confirmation ${appointment.id}:`, error);
        results.push({ appointmentId: appointment.id, success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      cancelled: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("Auto-cancellation cron error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
```

### Step 3: Create Cancellation Helper (if not exists)

Create or update `src/lib/cancellation.ts`:

```typescript
import { db } from "@/lib/db";
import { appointments, payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { refundPayment } from "@/lib/stripe-refund";

export async function cancelAppointment({
  appointmentId,
  reason,
  issueRefund,
}: {
  appointmentId: string;
  reason: string;
  issueRefund: boolean;
}) {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
    with: {
      payment: true,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "booked") {
    throw new Error("Appointment is not booked");
  }

  // Update appointment status
  await db
    .update(appointments)
    .set({
      status: "cancelled",
      financialOutcome: issueRefund ? "refunded" : "settled",
    })
    .where(eq(appointments.id, appointmentId));

  // Issue refund if requested
  if (issueRefund && appointment.payment) {
    await refundPayment(appointment.payment.id, "Confirmation expired");
  }

  return { success: true };
}
```

### Step 4: Configure Vercel Cron

Update or create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/send-confirmations",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/jobs/expire-confirmations",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Cron schedule format:**
- `0 * * * *` = Every hour at minute 0
- Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` header

### Step 5: Add CRON_SECRET to Environment Variables

Update `.env.local` and Vercel environment variables:

```bash
CRON_SECRET=your-secure-random-string-here
```

Generate a secure random string:
```bash
openssl rand -base64 32
```

### Step 6: Update Environment Schema

Update `src/lib/env.ts`:

```typescript
// Add to environment schema
CRON_SECRET: z.string().min(1),
```

### Step 7: Test Cron Jobs Locally

Create a test script `scripts/test-cron.ts`:

```typescript
async function testAutoConfirmation() {
  const response = await fetch("http://localhost:3000/api/jobs/send-confirmations", {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const data = await response.json();
  console.log("Auto-confirmation result:", data);
}

async function testAutoCancellation() {
  const response = await fetch("http://localhost:3000/api/jobs/expire-confirmations", {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const data = await response.json();
  console.log("Auto-cancellation result:", data);
}

// Run tests
testAutoConfirmation();
testAutoCancellation();
```

Run with:
```bash
tsx scripts/test-cron.ts
```

### Step 8: Add Cron Job Tests

Create `src/app/api/jobs/__tests__/send-confirmations.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../send-confirmations/route";
import { db } from "@/lib/db";
import { appointments, customers, shops } from "@/lib/schema";

vi.mock("@/lib/confirmation", () => ({
  sendConfirmationRequest: vi.fn(() => Promise.resolve({ success: true })),
}));

describe("Auto-confirmation Cron Job", () => {
  it("should find appointments 24-48h away", async () => {
    // Setup: Create high-risk appointment 36h from now
    const futureDate = new Date(Date.now() + 36 * 60 * 60 * 1000);

    // ... create test data

    const request = new Request("http://localhost:3000/api/jobs/send-confirmations", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.sent).toBeGreaterThan(0);
  });

  it("should reject unauthorized requests", async () => {
    const request = new Request("http://localhost:3000/api/jobs/send-confirmations", {
      headers: {
        Authorization: "Bearer wrong-secret",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

Create `src/app/api/jobs/__tests__/expire-confirmations.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../expire-confirmations/route";
import { db } from "@/lib/db";
import { appointments } from "@/lib/schema";

vi.mock("@/lib/cancellation", () => ({
  cancelAppointment: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/slot-recovery", () => ({
  processSlotRecovery: vi.fn(() => Promise.resolve()),
}));

describe("Auto-cancellation Cron Job", () => {
  it("should cancel appointments with expired confirmations", async () => {
    // Setup: Create appointment with expired confirmation
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago

    // ... create test data with confirmationStatus='pending', confirmationDeadline=pastDate

    const request = new Request("http://localhost:3000/api/jobs/expire-confirmations", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cancelled).toBeGreaterThan(0);
  });
});
```

### Step 9: Add Monitoring and Logging

Create `src/lib/cron-logger.ts`:

```typescript
/**
 * Log cron job execution results for monitoring
 */
export function logCronExecution(jobName: string, results: any) {
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] Cron job: ${jobName}`);
  console.log(`Success: ${results.success}`);
  console.log(`Processed: ${results.sent || results.cancelled || 0}`);
  console.log(`Failed: ${results.failed || 0}`);

  if (results.failed > 0) {
    console.error(`Failed items:`, results.results.filter((r: any) => !r.success));
  }
}
```

Update cron routes to use logger:

```typescript
import { logCronExecution } from "@/lib/cron-logger";

// At the end of each cron job:
logCronExecution("send-confirmations", results);
```

### Step 10: Deploy and Verify

1. **Deploy to Vercel:**
```bash
git add .
git commit -m "Add automatic confirmation system"
git push origin main
```

2. **Verify Cron Jobs in Vercel Dashboard:**
- Go to Vercel project → Cron Jobs tab
- Verify both jobs are listed and scheduled

3. **Monitor First Execution:**
- Check Vercel logs after the first hour
- Verify jobs are running successfully

### Step 11: Run Lint and Typecheck

```bash
pnpm lint
pnpm typecheck
```

---

## Testing

### Integration Tests

Create `tests/integration/cron-jobs.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { appointments, customers, shops } from "@/lib/schema";

test.describe("Automatic Confirmation System", () => {
  test("should auto-send confirmation to high-risk appointment", async () => {
    // Create test appointment 36h in future with high-risk customer
    const futureDate = new Date(Date.now() + 36 * 60 * 60 * 1000);

    // ... create appointment

    // Trigger cron job manually
    const response = await fetch("/api/jobs/send-confirmations", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBeGreaterThan(0);

    // Verify appointment status updated
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, testAppointmentId),
    });

    expect(appointment?.confirmationStatus).toBe("pending");
  });

  test("should auto-cancel appointment with expired confirmation", async () => {
    // Create appointment with expired confirmation
    // ... setup

    // Trigger cancellation job
    const response = await fetch("/api/jobs/expire-confirmations", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify appointment cancelled
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, testAppointmentId),
    });

    expect(appointment?.status).toBe("cancelled");
    expect(appointment?.confirmationStatus).toBe("expired");
  });
});
```

### E2E Tests

Create `tests/e2e/automatic-confirmation.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Automatic Confirmation E2E", () => {
  test("full auto-confirmation flow", async ({ page }) => {
    // 1. Create high-risk appointment 36h in future via UI
    // 2. Wait for cron to run (or trigger manually)
    // 3. Verify dashboard shows Pending status
    // 4. Simulate customer YES reply via Twilio webhook
    // 5. Verify dashboard shows Confirmed status
  });

  test("full auto-cancellation flow", async ({ page }) => {
    // 1. Create high-risk appointment with expired confirmation
    // 2. Trigger cancellation cron
    // 3. Verify appointment no longer in dashboard (or shows cancelled)
    // 4. Verify slot recovery was triggered
  });
});
```

---

## Acceptance Criteria

- [ ] Auto-confirmation cron job runs every hour
- [ ] Cron finds high-risk appointments 24-48h away
- [ ] Confirmation SMS sent automatically
- [ ] Appointment status updated to 'pending'
- [ ] Auto-cancellation cron job runs every hour
- [ ] Cron finds pending confirmations past deadline
- [ ] Expired appointments cancelled automatically
- [ ] Refunds issued for expired confirmations
- [ ] Slot recovery triggered after cancellation
- [ ] Cron jobs secured with CRON_SECRET
- [ ] Unauthorized requests rejected (401)
- [ ] Execution results logged for monitoring
- [ ] Vercel Cron configuration working
- [ ] Lint and typecheck pass
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

---

## Deployment Checklist

- [ ] CRON_SECRET added to Vercel environment variables
- [ ] vercel.json cron configuration deployed
- [ ] Cron jobs visible in Vercel dashboard
- [ ] First execution successful (check logs)
- [ ] Error monitoring set up (Sentry, Vercel logs, etc.)
- [ ] Alert notifications configured for failed cron executions

---

## Monitoring

After deployment, monitor:

1. **Vercel Logs** - Check cron execution logs hourly
2. **Database** - Verify confirmationStatus updates
3. **Twilio Logs** - Verify SMS delivery
4. **Error Rate** - Track failed confirmations/cancellations
5. **Customer Response Rate** - Track how many customers confirm

---

## Next Steps

After completing V4, the full dashboard feature is complete! Consider:

1. **Analytics Dashboard** - Track confirmation rates, cancellation rates
2. **Configurable Timing** - Allow shop owners to customize 24-48h window
3. **Escalation** - Send second reminder if no response after 12h
4. **A/B Testing** - Test different SMS message wording

---

## Related Documentation

- Vercel Cron Documentation: https://vercel.com/docs/cron-jobs
- Twilio API Documentation: https://www.twilio.com/docs/sms
- Existing Slot Recovery: `src/lib/slot-recovery.ts`
- Existing Cancellation Logic: `src/lib/cancellation.ts`
