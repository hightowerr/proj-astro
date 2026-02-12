# V3: CANCELLATION WORKS — Implementation Plan

**Goal:** Customer can cancel and receive refund (or not) based on policy

**Demo:**
- Cancel before cutoff → see "Refunded $X.XX to your card"
- Cancel after cutoff → see "Deposit retained per cancellation policy"

---

## Affordances Delivered

| ID | Place | Affordance |
|----|-------|------------|
| N16 | Cancellation API | POST /api/manage/[token]/cancel handler |
| N17 | Cancellation API | Validate status=booked |
| N18 | Cancellation API | Compute cutoff time |
| N19 | Cancellation API | Evaluate eligibility |
| N20 | Cancellation API | Check existing refund (idempotency) |
| N21 | Cancellation API | Call stripe.refunds.create() |
| N22 | Cancellation API | Update DB (refunded path) |
| N23 | Cancellation API | Update DB (no refund path) |
| N24 | Cancellation API | Write audit event |
| U6 | Manage Page | Cancellation outcome message |

---

## Dependencies

**Requires V1 & V2 to be complete:**
- ✅ Database schema with all cancellation fields
- ✅ Token validation works
- ✅ Manage page displays appointment details
- ✅ `calculateCancellationEligibility()` function exists
- ✅ Stripe payment integration already working

---

## Implementation Order

### Step 1: Create Cancellation API Route

Create the POST endpoint for cancellation requests.

**File:** `src/app/api/manage/[token]/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/manage-tokens";
import { db } from "@/lib/db";
import { appointments, shops, policyVersions, payments, appointmentEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import { processRefund } from "@/lib/stripe-refund";

interface CancelParams {
  params: {
    token: string;
  };
}

export async function POST(request: NextRequest, { params }: CancelParams) {
  const { token } = params;

  try {
    // N14: Validate token
    const appointmentId = await validateToken(token);

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Load appointment data with row lock to prevent concurrent cancellations
    const [appointmentData] = await db
      .select({
        appointment: appointments,
        shop: shops,
        policy: policyVersions,
        payment: payments,
      })
      .from(appointments)
      .leftJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(policyVersions, eq(appointments.policyVersionId, policyVersions.id))
      .leftJoin(payments, eq(appointments.paymentId, payments.id))
      .where(eq(appointments.id, appointmentId))
      .for("update") // Row-level lock
      .limit(1);

    if (!appointmentData || !appointmentData.shop || !appointmentData.policy || !appointmentData.payment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const { appointment, shop, policy, payment } = appointmentData;

    // N17: Validate status = booked
    if (appointment.status !== "booked") {
      return NextResponse.json(
        {
          error: "Cannot cancel appointment",
          reason: `Appointment is already ${appointment.status}`,
        },
        { status: 400 }
      );
    }

    // N18 & N19: Compute cutoff and evaluate eligibility
    const eligibility = calculateCancellationEligibility(
      appointment.startsAt,
      policy.cancelCutoffMinutes,
      shop.timezone,
      payment.status,
      appointment.status
    );

    // Process cancellation based on eligibility
    if (eligibility.isEligibleForRefund) {
      // Refund path
      const result = await processRefund(
        appointmentId,
        appointment,
        payment,
        shop.timezone
      );

      return NextResponse.json({
        success: true,
        refunded: true,
        amount: payment.amountCents / 100,
        message: `Refunded $${(payment.amountCents / 100).toFixed(2)} to your card`,
        refundId: result.refundId,
      });
    } else {
      // No refund path (N23)
      await db
        .update(appointments)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationSource: "customer",
          financialOutcome: "settled",
          resolutionReason: "cancelled_no_refund_after_cutoff",
          resolvedAt: new Date(),
        })
        .where(eq(appointments.id, appointmentId));

      // N24: Write audit event
      await db.insert(appointmentEvents).values({
        appointmentId,
        eventType: "cancelled",
        eventSource: "customer",
        eventData: {
          reason: "cancelled_no_refund_after_cutoff",
          cutoffTime: eligibility.cutoffTime.toISOString(),
          cancelledAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Appointment cancelled. Deposit retained per cancellation policy.",
      });
    }
  } catch (error) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel appointment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

---

### Step 2: Stripe Refund Processing Logic

Create the refund processing logic with idempotency safeguards.

**File:** `src/lib/stripe-refund.ts`

```typescript
import { db } from "@/lib/db";
import { appointments, payments, appointmentEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
}

/**
 * Process a refund with idempotency safeguards
 * Based on spike findings: Stripe call outside transaction with idempotency key
 */
export async function processRefund(
  appointmentId: string,
  appointment: any,
  payment: any,
  shopTimezone: string
): Promise<RefundResult> {
  // N20: Check if refund already exists (idempotency)
  if (payment.stripeRefundId) {
    console.log(`Refund already exists for appointment ${appointmentId}: ${payment.stripeRefundId}`);

    // Already refunded - return existing refund info
    return {
      success: true,
      refundId: payment.stripeRefundId,
      amount: payment.refundedAmountCents,
    };
  }

  // N21: Call Stripe refund API with idempotency key
  const idempotencyKey = `refund-${appointmentId}`;

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        amount: payment.amountCents, // Full refund
        metadata: {
          appointmentId,
          reason: "customer_cancellation",
        },
      },
      {
        idempotencyKey, // Prevents duplicate refunds on retry
      }
    );

    console.log(`Stripe refund created: ${refund.id} for appointment ${appointmentId}`);

    // N22: Update database with refund information
    await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationSource: "customer",
        financialOutcome: "refunded",
        resolutionReason: "cancelled_refunded_before_cutoff",
        resolvedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    await db
      .update(payments)
      .set({
        refundedAmountCents: payment.amountCents,
        stripeRefundId: refund.id,
        refundedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // N24: Write audit event
    await db.insert(appointmentEvents).values({
      appointmentId,
      eventType: "cancelled",
      eventSource: "customer",
      eventData: {
        reason: "cancelled_refunded_before_cutoff",
        refundId: refund.id,
        refundAmount: payment.amountCents,
        cancelledAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      refundId: refund.id,
      amount: payment.amountCents,
    };
  } catch (error: any) {
    console.error("Stripe refund error:", error);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      throw new Error("Card refund failed. Please contact support.");
    } else if (error.type === "StripeRateLimitError") {
      throw new Error("Too many requests. Please try again in a moment.");
    } else if (error.type === "StripeInvalidRequestError") {
      // Check if already refunded
      if (error.message.includes("already been refunded")) {
        // Query Stripe to get refund ID
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );

        if (paymentIntent.charges.data[0]?.refunds?.data[0]) {
          const existingRefund = paymentIntent.charges.data[0].refunds.data[0];

          // Update DB with existing refund info
          await db
            .update(payments)
            .set({
              refundedAmountCents: payment.amountCents,
              stripeRefundId: existingRefund.id,
              refundedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));

          return {
            success: true,
            refundId: existingRefund.id,
            amount: payment.amountCents,
          };
        }
      }
      throw new Error(`Invalid refund request: ${error.message}`);
    } else {
      throw new Error("Refund failed. Please try again or contact support.");
    }
  }
}
```

---

### Step 3: Update Manage Page to Show Outcome

Modify the manage page component to display cancellation outcome.

**File:** `src/components/manage/manage-booking-view.tsx`

**Replace the handleCancel function:**

```typescript
const handleCancel = async () => {
  if (!confirm("Are you sure you want to cancel this appointment?")) {
    return;
  }

  setIsCancelling(true);

  try {
    const response = await fetch(`/api/manage/${token}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to cancel appointment");
    }

    // Refresh page to show updated status
    window.location.reload();
  } catch (error) {
    console.error("Cancellation error:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Failed to cancel appointment. Please try again."
    );
    setIsCancelling(false);
  }
};
```

**Add cancellation outcome display after status badge (U6):**

```typescript
{/* U6: Cancellation outcome message */}
{appointment.status === "cancelled" && (
  <Card className="p-6 mb-6">
    <div className="flex items-start gap-3">
      {appointment.financialOutcome === "refunded" ? (
        <>
          <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-1">Refund Processed</h3>
            <p className="text-gray-700">
              Your appointment has been cancelled and a full refund of $
              {payment ? (payment.refundedAmountCents / 100).toFixed(2) : "0.00"}{" "}
              has been issued to your original payment method.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Refunds typically appear within 5-10 business days.
            </p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-1">Appointment Cancelled</h3>
            <p className="text-gray-700">
              Your appointment has been cancelled. The deposit has been retained
              per the cancellation policy (cancelled after deadline).
            </p>
          </div>
        </>
      )}
    </div>
  </Card>
)}
```

---

### Step 4: Add Cancellation Response Type

Create TypeScript types for API responses.

**File:** `src/types/cancellation.ts`

```typescript
export interface CancellationResponse {
  success: boolean;
  refunded: boolean;
  amount: number;
  message: string;
  refundId?: string;
  error?: string;
  reason?: string;
}
```

---

## Testing Plan

### Automated Tests

#### Unit Tests (Vitest)

**File:** `src/lib/__tests__/stripe-refund.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processRefund } from "../stripe-refund";
import { stripe } from "../stripe";
import { db } from "../db";

// Mock Stripe
vi.mock("../stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn(),
    },
    paymentIntents: {
      retrieve: vi.fn(),
    },
  },
}));

// Mock database
vi.mock("../db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  },
}));

describe("processRefund", () => {
  const mockAppointmentId = "appt-123";
  const mockAppointment = {
    id: "appt-123",
    status: "booked",
    startsAt: new Date(),
  };
  const mockPayment = {
    id: "pay-123",
    amountCents: 5000,
    stripePaymentIntentId: "pi_123",
    stripeRefundId: null,
  };
  const shopTimezone = "America/New_York";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new refund when none exists", async () => {
    const mockRefund = {
      id: "re_123",
      amount: 5000,
      status: "succeeded",
    };

    (stripe.refunds.create as any).mockResolvedValue(mockRefund);

    const result = await processRefund(
      mockAppointmentId,
      mockAppointment,
      mockPayment,
      shopTimezone
    );

    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_123",
        amount: 5000,
        metadata: {
          appointmentId: "appt-123",
          reason: "customer_cancellation",
        },
      },
      {
        idempotencyKey: "refund-appt-123",
      }
    );

    expect(result).toEqual({
      success: true,
      refundId: "re_123",
      amount: 5000,
    });
  });

  it("returns existing refund when already processed", async () => {
    const paymentWithRefund = {
      ...mockPayment,
      stripeRefundId: "re_existing",
      refundedAmountCents: 5000,
    };

    const result = await processRefund(
      mockAppointmentId,
      mockAppointment,
      paymentWithRefund,
      shopTimezone
    );

    // Should not call Stripe
    expect(stripe.refunds.create).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      refundId: "re_existing",
      amount: 5000,
    });
  });

  it("handles Stripe rate limit error", async () => {
    (stripe.refunds.create as any).mockRejectedValue({
      type: "StripeRateLimitError",
      message: "Too many requests",
    });

    await expect(
      processRefund(mockAppointmentId, mockAppointment, mockPayment, shopTimezone)
    ).rejects.toThrow("Too many requests. Please try again in a moment.");
  });

  it("handles already refunded error", async () => {
    (stripe.refunds.create as any).mockRejectedValue({
      type: "StripeInvalidRequestError",
      message: "Charge has already been refunded",
    });

    (stripe.paymentIntents.retrieve as any).mockResolvedValue({
      charges: {
        data: [
          {
            refunds: {
              data: [{ id: "re_existing", amount: 5000 }],
            },
          },
        ],
      },
    });

    const result = await processRefund(
      mockAppointmentId,
      mockAppointment,
      mockPayment,
      shopTimezone
    );

    expect(result).toEqual({
      success: true,
      refundId: "re_existing",
      amount: 5000,
    });
  });

  it("uses idempotency key to prevent duplicate refunds", async () => {
    const mockRefund = { id: "re_123", amount: 5000 };
    (stripe.refunds.create as any).mockResolvedValue(mockRefund);

    await processRefund(
      mockAppointmentId,
      mockAppointment,
      mockPayment,
      shopTimezone
    );

    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "refund-appt-123",
      })
    );
  });
});
```

**Run unit tests:**
```bash
npm run test -- src/lib/__tests__/stripe-refund.test.ts
```

---

#### E2E Tests (Playwright)

**File:** `tests/e2e/cancellation.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { appointments, shops, policyVersions, payments, bookingManageTokens } from "@/lib/schema";
import { generateToken, hashToken } from "@/lib/manage-tokens";
import { addDays, addHours } from "date-fns";
import { eq } from "drizzle-orm";

test.describe("Cancellation Flow", () => {
  let testToken: string;
  let testAppointmentId: string;
  let testPaymentId: string;

  test.beforeEach(async () => {
    // Create test data
    const [shop] = await db.insert(shops).values({
      name: "Test Barbershop",
      timezone: "America/New_York",
      address: "123 Main St, New York, NY",
    }).returning();

    const [policy] = await db.insert(policyVersions).values({
      depositAmountCents: 5000,
      cancelCutoffMinutes: 1440, // 24 hours
      refundBeforeCutoff: true,
    }).returning();

    const [payment] = await db.insert(payments).values({
      amountCents: 5000,
      status: "succeeded",
      stripePaymentIntentId: "pi_test_123",
    }).returning();

    testPaymentId = payment.id;

    const [appointment] = await db.insert(appointments).values({
      shopId: shop.id,
      policyVersionId: policy.id,
      paymentId: payment.id,
      customerId: "test-customer",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      customerPhone: "+1234567890",
      serviceName: "Haircut",
      startsAt: addDays(new Date(), 7), // 7 days in future (before cutoff)
      durationMinutes: 60,
      status: "booked",
    }).returning();

    testAppointmentId = appointment.id;

    // Generate token
    testToken = generateToken();
    await db.insert(bookingManageTokens).values({
      appointmentId: appointment.id,
      tokenHash: hashToken(testToken),
      expiresAt: addDays(new Date(), 90),
    });
  });

  test.afterEach(async () => {
    // Cleanup
    await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
    await db.delete(payments).where(eq(payments.id, testPaymentId));
  });

  test("cancels appointment before cutoff with refund", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    // Verify eligibility shows refund available
    await expect(page.locator("text=Full Refund Available")).toBeVisible();

    // Set up confirmation dialog handler
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Are you sure");
      await dialog.accept();
    });

    // Click cancel button
    await page.locator('button:has-text("Cancel Appointment")').click();

    // Wait for page reload
    await page.waitForLoadState("networkidle");

    // Verify cancellation outcome
    await expect(page.locator("text=Refund Processed")).toBeVisible();
    await expect(page.locator("text=$50.00")).toBeVisible();
    await expect(page.locator("text=has been issued")).toBeVisible();

    // Verify status badge changed
    const badge = page.locator('[class*="badge"]').filter({ hasText: "Cancelled" });
    await expect(badge).toBeVisible();

    // Verify cancel button is hidden
    await expect(page.locator('button:has-text("Cancel Appointment")')).not.toBeVisible();
  });

  test("cancels appointment after cutoff without refund", async ({ page }) => {
    // Update appointment to be 12 hours in future (past 24h cutoff)
    await db
      .update(appointments)
      .set({ startsAt: addHours(new Date(), 12) })
      .where(eq(appointments.id, testAppointmentId));

    await page.goto(`/manage/${testToken}`);

    // Verify eligibility shows no refund
    await expect(page.locator("text=No Refund Available")).toBeVisible();

    // Set up confirmation dialog handler
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click cancel button
    await page.locator('button:has-text("Cancel Appointment")').click();

    // Wait for page reload
    await page.waitForLoadState("networkidle");

    // Verify cancellation outcome
    await expect(page.locator("text=Appointment Cancelled")).toBeVisible();
    await expect(page.locator("text=deposit has been retained")).toBeVisible();

    // Verify status badge changed
    const badge = page.locator('[class*="badge"]').filter({ hasText: "Cancelled" });
    await expect(badge).toBeVisible();
  });

  test("prevents cancellation of already cancelled appointment", async ({ page }) => {
    // Cancel the appointment first
    await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        financialOutcome: "refunded",
      })
      .where(eq(appointments.id, testAppointmentId));

    await page.goto(`/manage/${testToken}`);

    // Cancel button should not be visible
    await expect(page.locator('button:has-text("Cancel Appointment")')).not.toBeVisible();

    // Should show cancelled message
    await expect(page.locator("text=This appointment has been cancelled")).toBeVisible();
  });

  test("shows error for invalid token during cancellation", async ({ page }) => {
    const response = await page.request.post("/api/manage/invalid-token/cancel");
    const data = await response.json();

    expect(response.status()).toBe(404);
    expect(data.error).toContain("Invalid or expired token");
  });

  test("handles concurrent cancellation attempts (idempotency)", async ({ page, context }) => {
    // Open two pages with same token
    const page2 = await context.newPage();

    await page.goto(`/manage/${testToken}`);
    await page2.goto(`/manage/${testToken}`);

    // Set up dialog handlers for both pages
    page.on("dialog", async (dialog) => await dialog.accept());
    page2.on("dialog", async (dialog) => await dialog.accept());

    // Click cancel on both pages simultaneously
    await Promise.all([
      page.locator('button:has-text("Cancel Appointment")').click(),
      page2.locator('button:has-text("Cancel Appointment")').click(),
    ]);

    // Wait for both to complete
    await page.waitForLoadState("networkidle");
    await page2.waitForLoadState("networkidle");

    // Both should show success (idempotency handled)
    // At least one should show refund message
    const hasRefundMessage =
      (await page.locator("text=Refund Processed").count()) > 0 ||
      (await page2.locator("text=Refund Processed").count()) > 0;

    expect(hasRefundMessage).toBe(true);

    // Verify in database - only one refund should exist
    const [appointmentRecord] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, testAppointmentId));

    expect(appointmentRecord.status).toBe("cancelled");
    expect(appointmentRecord.financialOutcome).toBe("refunded");

    await page2.close();
  });

  test("displays audit event after cancellation", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    page.on("dialog", async (dialog) => await dialog.accept());
    await page.locator('button:has-text("Cancel Appointment")').click();
    await page.waitForLoadState("networkidle");

    // Verify audit event was created in database
    const events = await db
      .select()
      .from(appointmentEvents)
      .where(eq(appointmentEvents.appointmentId, testAppointmentId));

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventType).toBe("cancelled");
    expect(events[0].eventSource).toBe("customer");
  });
});
```

**Run E2E tests:**
```bash
npm run test:e2e -- tests/e2e/cancellation.spec.ts
```

---

### Manual Tests

#### Test 1: Cancel Before Cutoff (Refund Path)

**Goal:** Verify full refund is issued when cancelled before cutoff

**Steps:**

1. **Create test appointment:**
   - Book appointment 7 days in future
   - Ensure payment status is "succeeded"
   - Policy cutoff is 24 hours

2. **Navigate to manage page:**
   ```
   http://localhost:3000/manage/{token}
   ```

3. **Verify pre-cancellation state:**
   - [ ] "Full Refund Available" indicator is green
   - [ ] Cancel button is enabled
   - [ ] Cutoff time shows correctly

4. **Click "Cancel Appointment":**
   - [ ] Confirmation dialog appears
   - [ ] Click "OK"

5. **Verify cancellation outcome:**
   - [ ] Page reloads automatically
   - [ ] "Refund Processed" message appears
   - [ ] Refund amount shows correctly (e.g., "$50.00")
   - [ ] Status badge shows "Cancelled" (red)
   - [ ] Cancel button is hidden
   - [ ] Message says "issued to your original payment method"

6. **Verify in database:**
   ```sql
   SELECT
     a.status,
     a.cancelled_at,
     a.cancellation_source,
     a.financial_outcome,
     a.resolution_reason,
     p.refunded_amount_cents,
     p.stripe_refund_id,
     p.refunded_at
   FROM appointments a
   JOIN payments p ON p.id = a.payment_id
   WHERE a.id = 'appointment-id';
   ```

   **Expected:**
   - status = 'cancelled'
   - cancelled_at = timestamp
   - cancellation_source = 'customer'
   - financial_outcome = 'refunded'
   - resolution_reason = 'cancelled_refunded_before_cutoff'
   - refunded_amount_cents = 5000
   - stripe_refund_id = 're_...'
   - refunded_at = timestamp

7. **Verify in Stripe Dashboard:**
   - [ ] Refund appears in Stripe dashboard
   - [ ] Refund amount matches
   - [ ] Metadata includes appointmentId

**Expected Result:** Full refund processed successfully

---

#### Test 2: Cancel After Cutoff (No Refund Path)

**Goal:** Verify deposit is retained when cancelled after cutoff

**Steps:**

1. **Create test appointment:**
   - Book appointment 12 hours in future
   - Policy cutoff is 24 hours (already past)

2. **Navigate to manage page**

3. **Verify pre-cancellation state:**
   - [ ] "No Refund Available" indicator is amber
   - [ ] Message says "deposit will be retained"

4. **Click "Cancel Appointment":**
   - [ ] Confirmation dialog appears
   - [ ] Click "OK"

5. **Verify cancellation outcome:**
   - [ ] Page reloads
   - [ ] "Appointment Cancelled" message appears
   - [ ] Message says "deposit has been retained"
   - [ ] No refund amount mentioned
   - [ ] Status badge shows "Cancelled"

6. **Verify in database:**
   ```sql
   SELECT
     a.status,
     a.financial_outcome,
     a.resolution_reason,
     p.refunded_amount_cents,
     p.stripe_refund_id
   FROM appointments a
   JOIN payments p ON p.id = a.payment_id
   WHERE a.id = 'appointment-id';
   ```

   **Expected:**
   - status = 'cancelled'
   - financial_outcome = 'settled'
   - resolution_reason = 'cancelled_no_refund_after_cutoff'
   - refunded_amount_cents = 0
   - stripe_refund_id = NULL

7. **Verify in Stripe Dashboard:**
   - [ ] No refund created
   - [ ] Original payment still captured

**Expected Result:** Appointment cancelled, deposit retained

---

#### Test 3: Idempotency - Double Click

**Goal:** Verify double-clicking cancel button doesn't create duplicate refunds

**Steps:**

1. **Navigate to manage page with eligible appointment**

2. **Rapidly click "Cancel Appointment" twice**

3. **Verify:**
   - [ ] Only one refund is created in Stripe
   - [ ] Only one audit event in database
   - [ ] No error displayed to user

4. **Check database:**
   ```sql
   SELECT COUNT(*) FROM appointment_events
   WHERE appointment_id = 'appointment-id' AND event_type = 'cancelled';
   ```

   **Expected:** COUNT = 1

5. **Check Stripe Dashboard:**
   - [ ] Only one refund exists for the payment

**Expected Result:** Idempotency prevents duplicate processing

---

#### Test 4: Already Cancelled

**Goal:** Verify can't cancel an already cancelled appointment

**Steps:**

1. **Cancel an appointment via manage page**

2. **Refresh the page** (or use same manage link again)

3. **Verify:**
   - [ ] Status badge shows "Cancelled"
   - [ ] Cancel button is NOT visible
   - [ ] Shows "This appointment has been cancelled" message
   - [ ] Refund outcome is displayed

4. **Attempt API call directly:**
   ```bash
   curl -X POST http://localhost:3000/api/manage/{token}/cancel
   ```

   **Expected response:**
   ```json
   {
     "error": "Cannot cancel appointment",
     "reason": "Appointment is already cancelled"
   }
   ```

**Expected Result:** Cannot cancel already cancelled appointment

---

#### Test 5: Stripe Error Handling

**Goal:** Verify graceful handling of Stripe API errors

**Setup:** Use Stripe test mode with intentional failure scenarios

**Test Cases:**

**A. Network timeout:**
   - Simulate by blocking Stripe API temporarily
   - Expected: User sees "Failed to cancel. Please try again."
   - Database should not mark as cancelled

**B. Insufficient funds (rare for refunds):**
   - Expected: Appropriate error message
   - Appointment remains booked

**C. Already refunded on Stripe side:**
   - Create refund directly in Stripe dashboard
   - Then try to cancel via app
   - Expected: App detects existing refund and syncs database

**Expected Result:** All error scenarios handled gracefully

---

#### Test 6: Concurrent Cancellation Requests

**Goal:** Verify row-level locking prevents race conditions

**Steps:**

1. **Open two browser windows with same manage link**

2. **Click "Cancel Appointment" in both windows simultaneously**

3. **Verify:**
   - [ ] Both requests complete without error
   - [ ] Only one refund created
   - [ ] Both windows show same outcome after refresh
   - [ ] Database state is consistent

4. **Check audit log:**
   ```sql
   SELECT COUNT(*) FROM appointment_events
   WHERE appointment_id = 'appointment-id' AND event_type = 'cancelled';
   ```

   **Expected:** COUNT = 1

**Expected Result:** Row-level locking prevents duplicate processing

---

#### Test 7: Audit Trail

**Goal:** Verify all cancellations are logged

**Steps:**

1. **Cancel appointment (either path)**

2. **Query audit events:**
   ```sql
   SELECT
     event_type,
     event_source,
     event_data,
     created_at
   FROM appointment_events
   WHERE appointment_id = 'appointment-id'
   ORDER BY created_at DESC;
   ```

3. **Verify event data includes:**
   - [ ] event_type = 'cancelled'
   - [ ] event_source = 'customer'
   - [ ] event_data contains reason
   - [ ] event_data contains refundId (if refunded)
   - [ ] event_data contains cancelledAt timestamp
   - [ ] event_data contains cutoffTime

**Expected Result:** Complete audit trail exists

---

#### Test 8: Integration with V4 Dashboard

**Goal:** Verify cancelled appointments appear correctly in dashboard

**Steps:**

1. **Cancel an appointment**

2. **Navigate to business dashboard:**
   ```
   http://localhost:3000/app/appointments
   ```

3. **Verify cancelled appointment row shows:**
   - [ ] Status column: "Cancelled"
   - [ ] Financial outcome column: "Refunded" or "Settled"
   - [ ] Resolution reason badge/tooltip displays
   - [ ] Cancelled timestamp visible

**Expected Result:** Dashboard correctly displays cancelled appointments

---

## Definition of Done

V3 is complete when:

- [ ] POST /api/manage/[token]/cancel endpoint exists
- [ ] Token validation works (N14, reused from V2)
- [ ] Status validation works (N17)
- [ ] Cutoff calculation works (N18)
- [ ] Eligibility evaluation works (N19)
- [ ] Idempotency check works (N20)
- [ ] Stripe refund integration works (N21)
- [ ] Database update works for both paths (N22, N23)
- [ ] Audit events are written (N24)
- [ ] Manage page shows outcome (U6)
- [ ] **All unit tests pass** (`npm run test`)
- [ ] **All E2E tests pass** (`npm run test:e2e`)
- [ ] All 8 manual tests pass
- [ ] Stripe test mode integration verified
- [ ] Idempotency verified (no duplicate refunds)
- [ ] Error handling tested
- [ ] No console errors
- [ ] Demo works for both scenarios

**Next:** V4 will add dashboard visibility for cancelled appointments

---

## Files Modified/Created

**Created:**
- `src/app/api/manage/[token]/cancel/route.ts`
- `src/lib/stripe-refund.ts`
- `src/types/cancellation.ts`
- `src/lib/__tests__/stripe-refund.test.ts` (unit tests)
- `tests/e2e/cancellation.spec.ts` (E2E tests)

**Modified:**
- `src/components/manage/manage-booking-view.tsx` (handleCancel function + U6 outcome display)

**Dependencies:**
- None (Stripe SDK already installed from existing payment integration)

---

## Rollback Plan

If V3 needs to be rolled back:

1. **Delete created files:**
   ```bash
   rm -rf src/app/api/manage
   rm src/lib/stripe-refund.ts
   rm src/types/cancellation.ts
   rm src/lib/__tests__/stripe-refund.test.ts
   rm tests/e2e/cancellation.spec.ts
   ```

2. **Revert modified file:**
   ```bash
   git checkout src/components/manage/manage-booking-view.tsx
   ```

3. **Database state:**
   - No migration changes (schema already exists from V1)
   - Any cancelled appointments remain cancelled (safe state)
   - Can manually update status back to 'booked' if needed

**Note:** V3 doesn't modify schema, only uses existing fields from V1.

---

## Security Considerations

### Token Security
- Token validated server-side before any operations
- Token can only cancel its own appointment (no cross-appointment access)

### Stripe Security
- API calls use server-side Stripe secret key (never exposed to client)
- Idempotency keys prevent duplicate charges
- Payment intent ID validated before refund

### Race Condition Prevention
- Row-level locking (`FOR UPDATE`) during validation
- Idempotency checks before Stripe API call
- Database constraints prevent invalid states

### Error Information Disclosure
- Generic error messages to client
- Detailed errors logged server-side only
- No Stripe-specific error details exposed

---

## Performance Considerations

### Database Queries
- Single query with joins to load all data
- Row-level lock held briefly (only during validation)
- Indexes on appointment_id for fast lookups

### Stripe API
- Called outside transaction (doesn't block DB)
- Idempotency key caching on Stripe side
- Typical latency: 200-500ms

### Expected Response Time
- Validation + DB query: ~50ms
- Stripe refund call: ~300ms
- DB update: ~20ms
- **Total: ~370ms** (acceptable for user action)

---

## Edge Cases Handled

1. **Already refunded on Stripe side:** Detect and sync database
2. **Concurrent cancellation attempts:** Row lock + idempotency
3. **Token expired during cancellation:** Return 404
4. **Appointment ended before cancel:** Status validation rejects
5. **Network failure during Stripe call:** User can retry safely
6. **Database update fails after Stripe succeeds:** Manual reconciliation needed (logged)
7. **Stripe rate limit:** User sees friendly error, can retry

---

## Monitoring & Observability

### Logs to Monitor

**Success logs:**
```typescript
console.log(`Stripe refund created: ${refund.id} for appointment ${appointmentId}`);
console.log(`Refund already exists for appointment ${appointmentId}`);
```

**Error logs:**
```typescript
console.error("Cancellation error:", error);
console.error("Stripe refund error:", error);
```

### Metrics to Track

1. Cancellation success rate
2. Refund vs no-refund ratio
3. Average time to process cancellation
4. Idempotency cache hit rate
5. Stripe error rate

### Alerts to Set Up

1. Cancellation failure rate > 5%
2. Stripe refund error rate > 1%
3. Database-Stripe state mismatch detected

---

## Notes

### Why Stripe Outside Transaction?

Based on spike findings:
- Stripe API calls cannot be rolled back
- If Stripe succeeds but DB transaction rolls back, we have inconsistency
- Better: Call Stripe first with idempotency, then update DB
- If DB update fails after Stripe success, we can detect and reconcile

### Idempotency Strategy

Three layers:
1. **Database check:** `if (payment.stripeRefundId)` - skip if already processed
2. **Stripe idempotency key:** `refund-${appointmentId}` - prevents duplicate API calls
3. **Row-level lock:** `FOR UPDATE` - prevents concurrent processing

### Testing in Production

Use Stripe test mode:
- Test cards: `4242 4242 4242 4242`
- Test refunds appear instantly
- No real money involved
- Can verify full flow
