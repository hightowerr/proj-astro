# V2: MANAGE PAGE — Implementation Plan

**Goal:** Customer can view appointment details and cancellation eligibility

**Demo:** Click manage link → see appointment details, cutoff time, eligibility status, and cancel button

---

## Affordances Delivered

| ID | Place | Affordance |
|----|-------|------------|
| N13 | Manage Page | GET /manage/[token] handler |
| N14 | Manage Page | Validate token |
| N15 | Manage Page | Load appointment + shop + policy |
| U2 | Manage Page | Appointment details display |
| U3 | Manage Page | Policy cutoff time display |
| U4 | Manage Page | Refund eligibility indicator |
| U5 | Manage Page | Cancel button |

---

## Dependencies

**Requires V1 to be complete:**
- ✅ `booking_manage_tokens` table exists
- ✅ `validateToken()` function available
- ✅ Policy extensions (cancel_cutoff_minutes, refund_before_cutoff) exist
- ✅ Appointment status enum includes 'cancelled'

---

## Implementation Order

### Step 1: Create Route Structure

Create the dynamic route for the manage page.

**File:** `src/app/manage/[token]/page.tsx`

**Directory structure:**
```
src/app/manage/
├── [token]/
│   └── page.tsx
└── error.tsx (optional - for error handling)
```

---

### Step 2: Data Loading Logic

Implement server component that loads all required data.

**File:** `src/app/manage/[token]/page.tsx`

```typescript
import { notFound } from "next/navigation";
import { validateToken } from "@/lib/manage-tokens";
import { db } from "@/lib/db";
import { appointments, shops, policyVersions, payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ManageBookingView } from "@/components/manage/manage-booking-view";

interface ManagePageProps {
  params: {
    token: string;
  };
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { token } = params;

  // N14: Validate token
  const appointmentId = await validateToken(token);

  if (!appointmentId) {
    notFound();
  }

  // N15: Load appointment + shop + policy + payment
  const [appointmentData] = await db
    .select({
      appointment: appointments,
      shop: shops,
      policy: policyVersions,
      payment: payments,
    })
    .from(appointments)
    .leftJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(
      policyVersions,
      eq(appointments.policyVersionId, policyVersions.id)
    )
    .leftJoin(payments, eq(appointments.paymentId, payments.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointmentData || !appointmentData.shop || !appointmentData.policy) {
    notFound();
  }

  return (
    <ManageBookingView
      appointment={appointmentData.appointment}
      shop={appointmentData.shop}
      policy={appointmentData.policy}
      payment={appointmentData.payment}
      token={token}
    />
  );
}
```

---

### Step 3: Cutoff Calculation Utility

Create utility for computing cutoff time and eligibility.

**File:** `src/lib/cancellation.ts`

```typescript
import { formatInTimeZone } from "date-fns-tz";
import { isBefore, addMinutes } from "date-fns";

export interface CancellationEligibility {
  cutoffTime: Date;
  isEligibleForRefund: boolean;
  timeUntilCutoff: number; // milliseconds (negative if past cutoff)
  cutoffTimeFormatted: string; // Human-readable in shop timezone
}

/**
 * Calculate cancellation eligibility based on policy
 */
export function calculateCancellationEligibility(
  appointmentStartsAt: Date,
  cancelCutoffMinutes: number,
  shopTimezone: string,
  paymentStatus: string | null,
  appointmentStatus: string
): CancellationEligibility {
  const now = new Date();

  // Calculate cutoff time (all in UTC)
  const cutoffTime = addMinutes(appointmentStartsAt, -cancelCutoffMinutes);

  // Time until cutoff (negative if past)
  const timeUntilCutoff = cutoffTime.getTime() - now.getTime();

  // Eligible if:
  // 1. Current time is before cutoff
  // 2. Payment succeeded
  // 3. Appointment status is 'booked' (not already cancelled/ended)
  const isEligibleForRefund =
    isBefore(now, cutoffTime) &&
    paymentStatus === "succeeded" &&
    appointmentStatus === "booked";

  // Format cutoff time in shop timezone for display
  const cutoffTimeFormatted = formatInTimeZone(
    cutoffTime,
    shopTimezone,
    "MMM d, yyyy 'at' h:mm a zzz"
  );

  return {
    cutoffTime,
    isEligibleForRefund,
    timeUntilCutoff,
    cutoffTimeFormatted,
  };
}
```

**Dependencies to install:**
```bash
npm install date-fns date-fns-tz
```

---

### Step 4: Manage Booking View Component

Create the main UI component for the manage page.

**File:** `src/components/manage/manage-booking-view.tsx`

```typescript
"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ManageBookingViewProps {
  appointment: {
    id: string;
    startsAt: Date;
    durationMinutes: number;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    serviceName: string | null;
  };
  shop: {
    id: string;
    name: string;
    timezone: string;
    address: string | null;
  };
  policy: {
    id: string;
    cancelCutoffMinutes: number;
    refundBeforeCutoff: boolean;
  };
  payment: {
    id: string;
    status: string;
    amountCents: number;
  } | null;
  token: string;
}

export function ManageBookingView({
  appointment,
  shop,
  policy,
  payment,
  token,
}: ManageBookingViewProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  // Calculate eligibility
  const eligibility = calculateCancellationEligibility(
    appointment.startsAt,
    policy.cancelCutoffMinutes,
    shop.timezone,
    payment?.status ?? null,
    appointment.status
  );

  // Format appointment time in shop timezone
  const appointmentTimeFormatted = formatInTimeZone(
    appointment.startsAt,
    shop.timezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
  );

  const handleCancel = async () => {
    // V2: Button is visible but doesn't do anything yet
    // V3 will implement the actual cancellation logic
    setIsCancelling(true);
    alert("Cancellation will be implemented in V3");
    setIsCancelling(false);
  };

  // Status badge component
  const StatusBadge = () => {
    if (appointment.status === "cancelled") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      );
    }
    if (appointment.status === "ended") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Confirmed
      </Badge>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Your Booking</h1>

      {/* U2: Appointment Details */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">Appointment Details</h2>
          <StatusBadge />
        </div>

        <div className="space-y-4">
          {/* Service */}
          {appointment.serviceName && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-medium">{appointment.serviceName}</p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">{appointmentTimeFormatted}</p>
              <p className="text-sm text-gray-500">
                Duration: {appointment.durationMinutes} minutes
              </p>
            </div>
          </div>

          {/* Shop */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{shop.name}</p>
              {shop.address && (
                <p className="text-sm text-gray-500">{shop.address}</p>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{appointment.customerName}</p>
              <p className="text-sm text-gray-500">{appointment.customerEmail}</p>
              <p className="text-sm text-gray-500">{appointment.customerPhone}</p>
            </div>
          </div>

          {/* Payment */}
          {payment && (
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Payment</p>
                <p className="font-medium">
                  ${(payment.amountCents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  Status: {payment.status}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* U3 & U4: Cancellation Policy and Eligibility */}
      {appointment.status === "booked" && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cancellation Policy</h2>

          <div className="space-y-4">
            {/* U3: Policy cutoff time display */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Cancellation Deadline</p>
                <p className="font-medium">{eligibility.cutoffTimeFormatted}</p>
                <p className="text-sm text-gray-500">
                  (
                  {policy.cancelCutoffMinutes / 60 === 24
                    ? "24 hours"
                    : `${policy.cancelCutoffMinutes / 60} hours`}{" "}
                  before appointment)
                </p>
              </div>
            </div>

            <Separator />

            {/* U4: Refund eligibility indicator */}
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                eligibility.isEligibleForRefund
                  ? "bg-green-50 border border-green-200"
                  : "bg-amber-50 border border-amber-200"
              }`}
            >
              {eligibility.isEligibleForRefund ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold mb-1">
                  {eligibility.isEligibleForRefund
                    ? "Full Refund Available"
                    : "No Refund Available"}
                </p>
                {eligibility.isEligibleForRefund ? (
                  <p className="text-sm text-gray-700">
                    If you cancel now, you'll receive a full refund of $
                    {payment ? (payment.amountCents / 100).toFixed(2) : "0.00"}{" "}
                    to your original payment method.
                  </p>
                ) : (
                  <p className="text-sm text-gray-700">
                    The cancellation deadline has passed. If you cancel now, your
                    deposit will be retained per the cancellation policy.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Already cancelled message */}
      {appointment.status === "cancelled" && (
        <Card className="p-6 mb-6 bg-gray-50">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-semibold">This appointment has been cancelled</p>
              <p className="text-sm text-gray-600 mt-1">
                You cannot make changes to a cancelled appointment.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* U5: Cancel button */}
      {appointment.status === "booked" && (
        <div className="flex flex-col gap-4">
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Processing..." : "Cancel Appointment"}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By clicking "Cancel Appointment", you understand that{" "}
            {eligibility.isEligibleForRefund
              ? "you will receive a full refund"
              : "your deposit will be retained per the cancellation policy"}
            .
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### Step 5: Error Handling

Create custom error page for invalid tokens.

**File:** `src/app/manage/[token]/not-found.tsx`

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-md p-6 flex items-center justify-center min-h-screen">
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-gray-600 mb-6">
          This booking link is invalid, expired, or has already been used.
          Please check the link and try again.
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </Card>
    </div>
  );
}
```

---

## Testing Plan

### Automated Tests

#### Unit Tests (Vitest)

**File:** `src/lib/__tests__/cancellation.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { calculateCancellationEligibility } from "../cancellation";
import { addDays, addHours, subHours } from "date-fns";

describe("calculateCancellationEligibility", () => {
  const shopTimezone = "America/New_York";

  it("returns eligible when before cutoff and payment succeeded", () => {
    const appointmentTime = addDays(new Date(), 7); // 7 days in future
    const cutoffMinutes = 1440; // 24 hours
    const paymentStatus = "succeeded";
    const appointmentStatus = "booked";

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      paymentStatus,
      appointmentStatus
    );

    expect(result.isEligibleForRefund).toBe(true);
    expect(result.timeUntilCutoff).toBeGreaterThan(0);
  });

  it("returns not eligible when past cutoff", () => {
    const appointmentTime = addHours(new Date(), 12); // 12 hours in future
    const cutoffMinutes = 1440; // 24 hours (cutoff is in the past)
    const paymentStatus = "succeeded";
    const appointmentStatus = "booked";

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      paymentStatus,
      appointmentStatus
    );

    expect(result.isEligibleForRefund).toBe(false);
    expect(result.timeUntilCutoff).toBeLessThan(0);
  });

  it("returns not eligible when payment not succeeded", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;
    const paymentStatus = "pending";
    const appointmentStatus = "booked";

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      paymentStatus,
      appointmentStatus
    );

    expect(result.isEligibleForRefund).toBe(false);
  });

  it("returns not eligible when appointment already cancelled", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;
    const paymentStatus = "succeeded";
    const appointmentStatus = "cancelled";

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      paymentStatus,
      appointmentStatus
    );

    expect(result.isEligibleForRefund).toBe(false);
  });

  it("calculates cutoff time correctly", () => {
    const appointmentTime = new Date("2025-03-01T14:00:00Z");
    const cutoffMinutes = 1440; // 24 hours

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "booked"
    );

    // Cutoff should be 24 hours before appointment
    const expectedCutoff = new Date("2025-02-28T14:00:00Z");
    expect(result.cutoffTime.getTime()).toBe(expectedCutoff.getTime());
  });

  it("formats cutoff time in correct timezone", () => {
    const appointmentTime = new Date("2025-03-01T14:00:00Z"); // 9am EST
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      "America/New_York",
      "succeeded",
      "booked"
    );

    // Should include timezone abbreviation (EST or EDT)
    expect(result.cutoffTimeFormatted).toMatch(/EST|EDT/);
  });

  it("handles different cutoff windows", () => {
    const appointmentTime = addDays(new Date(), 3);

    // 48 hour cutoff
    const result48h = calculateCancellationEligibility(
      appointmentTime,
      2880, // 48 hours
      shopTimezone,
      "succeeded",
      "booked"
    );

    // 2 hour cutoff
    const result2h = calculateCancellationEligibility(
      appointmentTime,
      120, // 2 hours
      shopTimezone,
      "succeeded",
      "booked"
    );

    expect(result48h.cutoffTime).not.toEqual(result2h.cutoffTime);
    expect(result48h.timeUntilCutoff).toBeGreaterThan(result2h.timeUntilCutoff);
  });
});
```

**Run unit tests:**
```bash
npm run test -- src/lib/__tests__/cancellation.test.ts
```

---

#### E2E Tests (Playwright)

**File:** `tests/e2e/manage-booking.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { appointments, shops, policyVersions, payments, bookingManageTokens } from "@/lib/schema";
import { generateToken, hashToken } from "@/lib/manage-tokens";
import { addDays } from "date-fns";

test.describe("Manage Booking Page", () => {
  let testToken: string;
  let testAppointmentId: string;

  test.beforeEach(async ({ page }) => {
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

    const [appointment] = await db.insert(appointments).values({
      shopId: shop.id,
      policyVersionId: policy.id,
      paymentId: payment.id,
      customerId: "test-customer",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      customerPhone: "+1234567890",
      serviceName: "Haircut",
      startsAt: addDays(new Date(), 7), // 7 days in future
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
    // Cleanup test data
    await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
  });

  test("displays appointment details correctly", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Manage Your Booking");

    // Check appointment details
    await expect(page.locator("text=Appointment Details")).toBeVisible();
    await expect(page.locator("text=Haircut")).toBeVisible();
    await expect(page.locator("text=Test Barbershop")).toBeVisible();
    await expect(page.locator("text=123 Main St, New York, NY")).toBeVisible();
    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=john@example.com")).toBeVisible();
    await expect(page.locator("text=+1234567890")).toBeVisible();
    await expect(page.locator("text=$50.00")).toBeVisible();
    await expect(page.locator("text=Duration: 60 minutes")).toBeVisible();
  });

  test("shows confirmed status badge for booked appointments", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    const badge = page.locator('[class*="badge"]').filter({ hasText: "Confirmed" });
    await expect(badge).toBeVisible();
  });

  test("displays cancellation policy section", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    await expect(page.locator("text=Cancellation Policy")).toBeVisible();
    await expect(page.locator("text=Cancellation Deadline")).toBeVisible();
    await expect(page.locator("text=24 hours before appointment")).toBeVisible();
  });

  test("shows full refund available when before cutoff", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    await expect(page.locator("text=Full Refund Available")).toBeVisible();
    await expect(page.locator("text=you'll receive a full refund")).toBeVisible();
  });

  test("displays cancel button for booked appointments", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    const cancelButton = page.locator('button:has-text("Cancel Appointment")');
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();
  });

  test("shows placeholder alert when cancel button clicked", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    // Set up dialog handler
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Cancellation will be implemented in V3");
      await dialog.accept();
    });

    // Click cancel button
    await page.locator('button:has-text("Cancel Appointment")').click();
  });

  test("shows not found page for invalid token", async ({ page }) => {
    await page.goto("/manage/invalid-token-xyz");

    await expect(page.locator("text=Booking Not Found")).toBeVisible();
    await expect(page.locator("text=This booking link is invalid")).toBeVisible();
    await expect(page.locator('button:has-text("Return Home")')).toBeVisible();
  });

  test("shows no refund available when past cutoff", async ({ page }) => {
    // Update appointment to be 12 hours in future (past 24h cutoff)
    await db
      .update(appointments)
      .set({ startsAt: addDays(new Date(), 0.5) }) // 12 hours
      .where(eq(appointments.id, testAppointmentId));

    await page.goto(`/manage/${testToken}`);

    await expect(page.locator("text=No Refund Available")).toBeVisible();
    await expect(page.locator("text=deposit will be retained")).toBeVisible();
  });

  test("hides cancellation section for cancelled appointments", async ({ page }) => {
    // Update appointment to cancelled
    await db
      .update(appointments)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(appointments.id, testAppointmentId));

    await page.goto(`/manage/${testToken}`);

    // Should show cancelled badge
    const badge = page.locator('[class*="badge"]').filter({ hasText: "Cancelled" });
    await expect(badge).toBeVisible();

    // Should show cancelled message
    await expect(page.locator("text=This appointment has been cancelled")).toBeVisible();

    // Should NOT show cancellation policy section
    await expect(page.locator("text=Cancellation Policy")).not.toBeVisible();

    // Should NOT show cancel button
    await expect(page.locator('button:has-text("Cancel Appointment")')).not.toBeVisible();
  });

  test("displays times in correct shop timezone", async ({ page }) => {
    await page.goto(`/manage/${testToken}`);

    // Times should include EST or EDT (depending on date)
    const pageContent = await page.content();
    expect(pageContent).toMatch(/EST|EDT/);
  });

  test("is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/manage/${testToken}`);

    // Check key elements are visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Appointment Details")).toBeVisible();
    await expect(page.locator('button:has-text("Cancel Appointment")')).toBeVisible();

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBe(clientWidth);
  });
});
```

**Run E2E tests:**
```bash
npm run test:e2e -- tests/e2e/manage-booking.spec.ts
```

---

### Manual Tests

### Test 1: Valid Token - Happy Path

**Goal:** Verify manage page loads correctly with valid token

**Steps:**

1. **Use token from V1 test:**
   - Get the manage link from V1 testing (saved from booking confirmation)
   - Example: `http://localhost:3000/manage/abc123...xyz789`

2. **Navigate to manage page:**
   ```bash
   # Start dev server if not running
   npm run dev
   ```
   - Open the manage link in browser

3. **Verify page content:**

   **U2: Appointment Details Section**
   - [ ] Card shows "Appointment Details" heading
   - [ ] Status badge shows "Confirmed" (green)
   - [ ] Service name is displayed
   - [ ] Date/time is formatted correctly in shop timezone
   - [ ] Duration is shown
   - [ ] Shop name and address are visible
   - [ ] Customer name, email, phone are correct
   - [ ] Payment amount is correct (e.g., "$50.00")
   - [ ] Payment status is shown

   **U3: Policy Cutoff Time Display**
   - [ ] "Cancellation Policy" section exists
   - [ ] "Cancellation Deadline" shows formatted time
   - [ ] Shows hours before appointment (e.g., "24 hours before")

   **U4: Refund Eligibility Indicator**
   - [ ] Eligibility box is visible
   - [ ] Shows either "Full Refund Available" (green) or "No Refund Available" (amber)
   - [ ] Correct icon (CheckCircle or AlertCircle)
   - [ ] Explanation text is clear

   **U5: Cancel Button**
   - [ ] "Cancel Appointment" button is visible
   - [ ] Button is red (destructive variant)
   - [ ] Helper text below button is appropriate
   - [ ] Clicking shows "Cancellation will be implemented in V3" alert

4. **Check browser console:**
   - [ ] No errors
   - [ ] No warnings

**Expected Result:**
All checkboxes pass, page displays correctly with accurate data.

---

### Test 2: Invalid Token

**Goal:** Verify proper error handling for invalid tokens

**Steps:**

1. **Generate invalid token:**
   ```
   http://localhost:3000/manage/invalid-token-12345
   ```

2. **Navigate to URL**

3. **Verify error page:**
   - [ ] Shows custom 404 page (not default Next.js 404)
   - [ ] Shows "Booking Not Found" heading
   - [ ] Shows AlertCircle icon
   - [ ] Shows helpful error message
   - [ ] Shows "Return Home" button

**Expected Result:**
Custom not-found page displays with clear messaging.

---

### Test 3: Expired Token

**Goal:** Verify expired tokens are rejected

**Steps:**

1. **Create appointment with expired token in database:**
   ```sql
   -- First create a test appointment
   INSERT INTO appointments (id, shop_id, customer_id, starts_at, duration_minutes, status)
   VALUES (
     gen_random_uuid(),
     'your-test-shop-id',
     'test-customer',
     now() + interval '7 days',
     60,
     'booked'
   )
   RETURNING id;

   -- Then create an expired token (expires_at in the past)
   INSERT INTO booking_manage_tokens (appointment_id, token_hash, expires_at)
   VALUES (
     'appointment-id-from-above',
     encode(sha256('expired-test-token'::bytea), 'hex'),
     now() - interval '1 day'  -- Already expired
   );
   ```

2. **Navigate to manage page:**
   ```
   http://localhost:3000/manage/expired-test-token
   ```

3. **Verify error page shows:**
   - [ ] "Booking Not Found" error page
   - [ ] Token is rejected despite existing in database

**Expected Result:**
Expired tokens are rejected and error page is shown.

---

### Test 4: Cutoff Time Calculation

**Goal:** Verify cutoff time is calculated correctly in shop timezone

**Steps:**

1. **Create test appointments with different cutoffs:**

   **Test Case A: Before cutoff (eligible for refund)**
   ```sql
   -- Appointment 7 days in future, 24-hour cutoff
   -- Current time is before cutoff
   INSERT INTO appointments (...)
   VALUES (..., now() + interval '7 days', ...);
   ```

   **Test Case B: After cutoff (not eligible for refund)**
   ```sql
   -- Appointment 12 hours in future, 24-hour cutoff
   -- Current time is past cutoff
   INSERT INTO appointments (...)
   VALUES (..., now() + interval '12 hours', ...);
   ```

2. **View each appointment's manage page**

3. **Verify cutoff calculation:**

   **For Test Case A:**
   - [ ] Eligibility box is GREEN ("Full Refund Available")
   - [ ] Cutoff time is 24 hours before appointment
   - [ ] Cutoff time is in correct timezone (shop.timezone)
   - [ ] Message says "you'll receive a full refund"

   **For Test Case B:**
   - [ ] Eligibility box is AMBER ("No Refund Available")
   - [ ] Cutoff time shows correctly (already passed)
   - [ ] Message says "deposit will be retained"

4. **Manual calculation verification:**
   ```typescript
   // In browser console or test file
   const appointmentTime = new Date('2025-02-20T14:00:00Z');
   const cutoffMinutes = 1440; // 24 hours
   const cutoff = new Date(appointmentTime.getTime() - cutoffMinutes * 60 * 1000);
   console.log('Expected cutoff:', cutoff);
   // Compare with displayed cutoff time
   ```

**Expected Result:**
Cutoff calculations are accurate and eligibility is correct based on current time vs cutoff.

---

### Test 5: Different Appointment Statuses

**Goal:** Verify UI adapts to different appointment statuses

**Steps:**

1. **Create test appointments with different statuses:**

   **Status: booked**
   ```sql
   UPDATE appointments SET status = 'booked' WHERE id = 'test-id';
   ```

   **Status: cancelled**
   ```sql
   UPDATE appointments SET status = 'cancelled', cancelled_at = now() WHERE id = 'test-id';
   ```

   **Status: ended**
   ```sql
   UPDATE appointments SET status = 'ended' WHERE id = 'test-id';
   ```

2. **View manage page for each status:**

   **For status='booked':**
   - [ ] Status badge shows "Confirmed" (default/green variant)
   - [ ] Cancellation policy section is visible
   - [ ] Eligibility indicator is visible
   - [ ] Cancel button is visible

   **For status='cancelled':**
   - [ ] Status badge shows "Cancelled" (destructive/red variant)
   - [ ] XCircle icon in badge
   - [ ] Shows "This appointment has been cancelled" message
   - [ ] Cancellation policy section is hidden
   - [ ] Cancel button is hidden

   **For status='ended':**
   - [ ] Status badge shows "Completed" (secondary/gray variant)
   - [ ] CheckCircle icon in badge
   - [ ] Cancellation policy section is hidden
   - [ ] Cancel button is hidden

**Expected Result:**
UI correctly adapts to each appointment status.

---

### Test 6: Timezone Handling

**Goal:** Verify times are displayed in correct shop timezone

**Steps:**

1. **Create appointments in shops with different timezones:**
   ```sql
   -- Update shop timezone
   UPDATE shops SET timezone = 'America/New_York' WHERE id = 'shop-1';
   UPDATE shops SET timezone = 'America/Los_Angeles' WHERE id = 'shop-2';
   UPDATE shops SET timezone = 'Europe/London' WHERE id = 'shop-3';
   ```

2. **View manage pages for each shop**

3. **Verify timezone display:**
   - [ ] Appointment time shows correct timezone abbreviation (EST, PST, GMT, etc.)
   - [ ] Cutoff time shows correct timezone abbreviation
   - [ ] Times are calculated correctly for each timezone
   - [ ] "at 2:00 PM EST" format is clear and readable

4. **Cross-check with external tool:**
   - Use https://www.timeanddate.com/worldclock/converter.html
   - Verify displayed times match expected times in each timezone

**Expected Result:**
All times are correctly displayed in shop timezone with proper formatting.

---

### Test 7: Responsive Design

**Goal:** Verify page works on different screen sizes

**Steps:**

1. **Test on different viewports:**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

2. **Check each viewport:**
   - [ ] Cards stack properly
   - [ ] Text is readable (no overflow)
   - [ ] Icons align correctly
   - [ ] Buttons are full-width on mobile
   - [ ] No horizontal scroll

3. **Use browser DevTools:**
   - Chrome DevTools → Toggle device toolbar
   - Test common devices (iPhone 12, iPad, etc.)

**Expected Result:**
Page is fully responsive and usable on all screen sizes.

---

### Test 8: Integration with V1

**Goal:** Verify seamless flow from V1 → V2

**Steps:**

1. **Complete booking flow (V1):**
   - Create new appointment
   - Reach confirmation page
   - See manage link

2. **Click manage link immediately:**
   - Should navigate to manage page
   - Should load without errors
   - All data should be accurate

3. **Copy link and test later:**
   - Copy manage link URL
   - Close browser
   - Open new browser window
   - Paste link
   - Verify page still loads (token persists)

**Expected Result:**
Smooth transition from V1 to V2 with no broken links or data issues.

---

## Definition of Done

V2 is complete when:

- [ ] Route `/manage/[token]` exists and loads
- [ ] Token validation works (N14)
- [ ] Data loading works (N15)
- [ ] All UI components render (U2, U3, U4, U5)
- [ ] Cutoff time calculation is accurate
- [ ] Eligibility indicator shows correct status
- [ ] Cancel button is visible (placeholder functionality)
- [ ] Custom 404 page for invalid tokens
- [ ] **All unit tests pass** (`npm run test`)
- [ ] **All E2E tests pass** (`npm run test:e2e`)
- [ ] All 8 manual tests pass
- [ ] Responsive design works on all screen sizes
- [ ] No console errors
- [ ] Demo works: Click manage link → see full page

**Next:** V3 will implement the actual cancellation logic (POST handler, Stripe refund)

---

## Files Modified/Created

**Created:**
- `src/app/manage/[token]/page.tsx`
- `src/app/manage/[token]/not-found.tsx`
- `src/components/manage/manage-booking-view.tsx`
- `src/lib/cancellation.ts`
- `src/lib/__tests__/cancellation.test.ts` (unit tests)
- `tests/e2e/manage-booking.spec.ts` (E2E tests)

**Modified:**
- None (V2 is purely additive)

**Dependencies Added:**
```bash
npm install date-fns date-fns-tz
npm install -D @playwright/test  # If not already installed
```

**Existing shadcn/ui components used:**
- Card
- Button
- Badge
- Separator

**Icons from lucide-react:**
- Calendar, Clock, MapPin, User, CreditCard
- AlertCircle, CheckCircle, XCircle

---

## Rollback Plan

If V2 needs to be rolled back:

1. **Delete created files:**
   ```bash
   rm -rf src/app/manage
   rm src/components/manage/manage-booking-view.tsx
   rm src/lib/cancellation.ts
   rm src/lib/__tests__/cancellation.test.ts
   rm tests/e2e/manage-booking.spec.ts
   ```

2. **Uninstall dependencies (optional):**
   ```bash
   npm uninstall date-fns date-fns-tz
   ```

**Note:** V2 is purely additive (no database changes, no modifications to existing files). Rollback is clean and safe.

---

## Notes

### Token Security in V2

- Token is passed via URL parameter (standard for password reset, etc.)
- No authentication required (token acts as proof of ownership)
- Token can only access one specific appointment
- Server-side validation prevents unauthorized access

### Cancel Button in V2

The cancel button in V2 is **visible but non-functional**:
- Shows placeholder alert: "Cancellation will be implemented in V3"
- This allows us to test the full UI in V2
- V3 will wire up the actual POST handler

### Timezone Best Practices

All times are:
1. **Stored in UTC** in the database
2. **Calculated in UTC** for cutoff logic
3. **Displayed in shop timezone** for customer-facing UI

This ensures consistency across timezones while providing a localized experience.
