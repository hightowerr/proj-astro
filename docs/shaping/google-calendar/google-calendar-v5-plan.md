# V5: Delete Calendar Events on Cancel - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 1 day
**Dependencies:** V1 (OAuth), V2 (event creation)
**Demo:** Cancelled appointments automatically delete corresponding Google Calendar events

---

## Overview

V5 completes the appointment lifecycle by deleting Google Calendar events when appointments are cancelled. This ensures the shop owner's calendar stays in sync with the booking system and prevents confusion from stale calendar events.

### Goal

Automatically delete calendar events when appointments are cancelled:
1. **Delete** calendar event from Google Calendar on cancellation
2. **Handle** 404 gracefully (event already deleted externally)
3. **Invalidate** calendar cache after deletion
4. **Degrade gracefully** if deletion fails (don't block cancellation)
5. **Prepare** for auto-resolve alerts (V6/V7 feature stub)

This slice ensures calendar events are cleaned up automatically, maintaining consistency between the booking system and Google Calendar.

---

## Current State Analysis

### Existing Cancellation Flow

**File:** `src/app/api/manage/[token]/cancel/route.ts:24-175`

**Current Flow:**

**Path 1: Refund Eligible (before cutoff)**
1. Validate manage token
2. Load appointment + policy + payment
3. Calculate cancellation eligibility
4. Process refund via `processRefund()`
   - Create Stripe refund
   - Update appointment (status=cancelled, financialOutcome=refunded)
   - Create appointment event
5. Create slot opening for recovery
6. Return success response

**Path 2: No Refund (after cutoff)**
1. Validate manage token
2. Load appointment + policy + payment
3. Calculate cancellation eligibility (not eligible)
4. Update appointment in transaction
   - Set status=cancelled, financialOutcome=settled
   - Create appointment event
5. Create slot opening for recovery
6. Return success response

**Missing:**
- No calendar event deletion
- No cache invalidation
- No integration with Google Calendar API

### Existing Infrastructure

**Calendar Event Storage (V2):**
- `appointments.calendarEventId` stores Google Calendar event ID
- Event ID populated when booking created
- Can be null (no calendar connection or pre-V2 bookings)

**Calendar Event Invalidation (V2/V3):**
- `invalidateCalendarCache()` already implemented
- Clears Redis cache for date
- Used after event creation

**OAuth & API Client (V2):**
- `getCalendarConnection()` loads connection
- `getAuthClient()` handles token refresh
- Google Calendar API client available

### What's Missing (to be built)

1. **Calendar event deletion service** - API call to delete event
2. **Cancellation integration** - Call deletion in both refund paths
3. **Error handling** - Graceful degradation on API failures
4. **Auto-resolve stub** - Placeholder for V6/V7 conflict alert resolution
5. **Cache invalidation** - Clear cached events after deletion

---

## Requirements

### Functional Requirements

**FR1: Delete Calendar Event**
- When appointment cancelled, delete corresponding calendar event
- Use `calendarEventId` from appointments table
- Call Google Calendar API delete endpoint
- Delete in both cancellation paths (refund eligible and not eligible)
- Operate outside transaction (doesn't block cancellation)

**FR2: Graceful Degradation**
- If `calendarEventId` is null → skip deletion (no event to delete)
- If calendar connection doesn't exist → skip deletion
- If Google Calendar API fails → log error, continue with cancellation
- If event already deleted (404) → treat as success
- **NEVER block cancellation due to calendar deletion failure**

**FR3: Cache Invalidation**
- After successful deletion, invalidate calendar cache
- Clear events cache for appointment date
- Ensures availability API reflects deletion

**FR4: Auto-Resolve Alert Stub**
- Create `autoResolveAlert()` function (no-op for now)
- Will be used in V6/V7 to resolve conflict alerts
- Called after successful event deletion
- Currently logs and returns immediately

**FR5: Audit Logging**
- Log successful deletions (event ID, shop ID)
- Log failures with error details (but sanitized, no tokens)
- Help debugging calendar sync issues
- Include context (appointment ID, customer name redacted)

### Non-Functional Requirements

**NFR1: Reliability**
- Cancellation ALWAYS succeeds (even if calendar deletion fails)
- Calendar deletion is "best effort"
- Prioritize customer experience over calendar consistency
- Manual cleanup possible via calendar UI if needed

**NFR2: Performance**
- Calendar deletion adds max 500ms to cancellation
- Doesn't block refund processing
- Timeout after 3 seconds
- Executed after database transaction commits

**NFR3: Idempotency**
- Safe to retry deletion (404 treated as success)
- No duplicate deletion attempts
- Calendar API delete endpoint is idempotent

**NFR4: Backward Compatibility**
- Works with appointments that have no `calendarEventId`
- Works with appointments created before V2
- No breaking changes to cancellation API

---

## Implementation Steps

### Step 1: Calendar Event Deletion Service

**File:** `src/lib/google-calendar.ts` (update)

**Purpose:** Add calendar event deletion function

```typescript
// Add to existing google-calendar.ts file

/**
 * Deletes a Google Calendar event.
 *
 * @param input - Deletion parameters
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteCalendarEvent(input: {
  shopId: string;
  calendarEventId: string;
}): Promise<boolean> {
  const { shopId, calendarEventId } = input;

  // Load calendar connection
  const connection = await getCalendarConnection(shopId);

  if (!connection) {
    console.log(
      `[calendar] No calendar connection for shop ${shopId}, skipping event deletion`
    );
    return false;
  }

  try {
    // Get authenticated client (handles token refresh)
    const auth = await getAuthClient(connection);
    const calendar = google.calendar({ version: "v3", auth });

    // Delete event with timeout
    await Promise.race([
      calendar.events.delete({
        calendarId: connection.calendarId,
        eventId: calendarEventId,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Calendar API timeout")), 3000)
      ),
    ]);

    console.log(
      `[calendar] Event deleted: ${calendarEventId} for shop ${shopId}`
    );

    return true;
  } catch (error) {
    // Handle 404 gracefully (event already deleted)
    if (error && typeof error === "object" && "code" in error && error.code === 404) {
      console.log(
        `[calendar] Event ${calendarEventId} already deleted (404), treating as success`
      );
      return true;
    }

    // Log error but don't throw (graceful degradation)
    console.error(
      `[calendar] Failed to delete event ${calendarEventId} for shop ${shopId}:`,
      error instanceof Error ? error.message : "Unknown error"
    );

    return false;
  }
}

/**
 * Auto-resolves conflict alerts after event deletion.
 * Stub for V6/V7 implementation.
 *
 * @param shopId - Shop UUID
 * @param calendarEventId - Google Calendar event ID
 */
export async function autoResolveAlert(
  shopId: string,
  calendarEventId: string
): Promise<void> {
  // V6/V7: Query calendar_conflict_alerts table
  // V6/V7: Update alerts with status='auto_resolved' where eventId matches
  // V6/V7: Log resolution for audit

  console.log(
    `[calendar] Auto-resolve alert stub called for event ${calendarEventId} (no-op until V6)`
  );

  // No-op for now
}
```

**Key Design Decisions:**
- **Returns boolean:** Indicates success/failure for logging purposes
- **404 is success:** Event already deleted externally → goal achieved
- **Doesn't throw:** Always returns gracefully (never blocks cancellation)
- **3-second timeout:** Prevents long waits if API is slow
- **Auto-resolve stub:** Prepares for V6/V7 conflict alerts

---

### Step 2: Integrate Calendar Deletion into Cancellation Flow

**File:** `src/app/api/manage/[token]/cancel/route.ts` (update)

**Purpose:** Delete calendar event in both cancellation paths

```typescript
// Add imports at top
import {
  deleteCalendarEvent,
  autoResolveAlert,
} from "@/lib/google-calendar";
import { invalidateCalendarCache } from "@/lib/google-calendar-cache";
import { formatDateInTimeZone } from "@/lib/booking";

// ... existing code ...

export async function POST(_request: Request, { params }: CancelParams) {
  const { token } = await params;

  try {
    // ... existing validation and data loading (lines 28-53) ...

    const timezone = row.timezone ?? "UTC";

    if (row.appointment.status !== "booked") {
      return Response.json(
        {
          error: "Cannot cancel appointment",
          reason: `Appointment is already ${row.appointment.status}`,
        },
        { status: 400 }
      );
    }

    const eligibility = calculateCancellationEligibility(
      row.appointment.startsAt,
      row.policy.cancelCutoffMinutes,
      timezone,
      row.payment?.status ?? null,
      row.appointment.status,
      row.policy.refundBeforeCutoff
    );

    // ============ V5: HELPER FUNCTION FOR CALENDAR CLEANUP ============
    const deleteCalendarEventIfExists = async () => {
      if (!row.appointment.calendarEventId) {
        // No calendar event to delete
        return;
      }

      try {
        const deleted = await deleteCalendarEvent({
          shopId: row.appointment.shopId,
          calendarEventId: row.appointment.calendarEventId,
        });

        if (deleted) {
          // Auto-resolve conflict alerts (stub for V6/V7)
          await autoResolveAlert(
            row.appointment.shopId,
            row.appointment.calendarEventId
          );

          // Invalidate calendar cache
          const dateStr = formatDateInTimeZone(row.appointment.startsAt, timezone);
          await invalidateCalendarCache(row.appointment.shopId, dateStr);

          console.log(
            `[cancel] Calendar event deleted and cache invalidated for appointment ${row.appointment.id}`
          );
        }
      } catch (error) {
        // Log but don't fail cancellation
        console.error(
          `[cancel] Error during calendar cleanup for appointment ${row.appointment.id}:`,
          error
        );
      }
    };
    // ============ END V5 HELPER FUNCTION ============

    // PATH 1: Refund eligible
    if (eligibility.isEligibleForRefund) {
      if (!row.payment) {
        return Response.json(
          { error: "Payment information missing for refund" },
          { status: 409 }
        );
      }

      const refundResult = await processRefund({
        appointment: row.appointment,
        payment: row.payment,
        cutoffTime: eligibility.cutoffTime,
      });

      // ============ V5: DELETE CALENDAR EVENT AFTER REFUND ============
      await deleteCalendarEventIfExists();
      // ============ END V5 ============

      await createSlotOpeningFromCancellation(row.appointment, row.payment);

      return Response.json({
        success: true,
        refunded: true,
        amount: row.payment.amountCents / 100,
        message: `Refunded $${(row.payment.amountCents / 100).toFixed(2)} to your card`,
        refundId: refundResult.refundId,
      });
    }

    // PATH 2: No refund (after cutoff)
    const now = new Date();
    const updateResult = await db.transaction(async (tx) => {
      // ... existing transaction code (lines 101-147) ...
    });

    if (!updateResult.updated) {
      return Response.json({
        success: true,
        refunded: false,
        amount: 0,
        message: "Appointment cancelled. Deposit retained per cancellation policy.",
      });
    }

    // ============ V5: DELETE CALENDAR EVENT AFTER CANCELLATION ============
    await deleteCalendarEventIfExists();
    // ============ END V5 ============

    await createSlotOpeningFromCancellation(row.appointment, row.payment);

    return Response.json({
      success: true,
      refunded: false,
      amount: 0,
      message: "Appointment cancelled. Deposit retained per cancellation policy.",
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    return Response.json(
      {
        error: "Failed to cancel appointment",
      },
      { status: 500 }
    );
  }
}
```

**Key Changes:**
1. Create helper function `deleteCalendarEventIfExists()` to encapsulate deletion logic
2. Call after refund processing (Path 1)
3. Call after cancellation transaction (Path 2)
4. Include auto-resolve alert call (stub)
5. Include cache invalidation
6. Wrap in try-catch to prevent cancellation failure

**Why Helper Function:**
- Avoid code duplication (two cancellation paths)
- Centralize error handling
- Easy to test
- Clean separation of concerns

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/google-calendar.test.ts` (update existing file)

**Purpose:** Test calendar event deletion

```typescript
// Add to existing google-calendar.test.ts

describe("deleteCalendarEvent", () => {
  it("should delete calendar event successfully", async () => {
    const mockConnection = {
      id: "conn-123",
      shopId: "shop-123",
      calendarId: "primary",
      calendarName: "My Calendar",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    };

    vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(
      mockConnection
    );

    const mockOAuth = {};
    vi.spyOn({ getAuthClient }, "getAuthClient").mockResolvedValue(mockOAuth as any);

    const mockDelete = vi.fn().mockResolvedValue({});

    const mockCalendar = {
      events: {
        delete: mockDelete,
      },
    };

    vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

    const result = await deleteCalendarEvent({
      shopId: "shop-123",
      calendarEventId: "event-123",
    });

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "event-123",
    });
  });

  it("should return true for 404 errors (already deleted)", async () => {
    const mockConnection = {
      id: "conn-123",
      shopId: "shop-123",
      calendarId: "primary",
      calendarName: "My Calendar",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    };

    vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(
      mockConnection
    );

    const mockOAuth = {};
    vi.spyOn({ getAuthClient }, "getAuthClient").mockResolvedValue(mockOAuth as any);

    const mockDelete = vi.fn().mockRejectedValue({
      code: 404,
      message: "Event not found",
    });

    const mockCalendar = {
      events: {
        delete: mockDelete,
      },
    };

    vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

    const result = await deleteCalendarEvent({
      shopId: "shop-123",
      calendarEventId: "event-123",
    });

    expect(result).toBe(true); // Treat 404 as success
  });

  it("should return false on API errors (graceful degradation)", async () => {
    const mockConnection = {
      id: "conn-123",
      shopId: "shop-123",
      calendarId: "primary",
      calendarName: "My Calendar",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    };

    vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(
      mockConnection
    );

    const mockOAuth = {};
    vi.spyOn({ getAuthClient }, "getAuthClient").mockResolvedValue(mockOAuth as any);

    const mockDelete = vi.fn().mockRejectedValue(new Error("API error"));

    const mockCalendar = {
      events: {
        delete: mockDelete,
      },
    };

    vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

    const result = await deleteCalendarEvent({
      shopId: "shop-123",
      calendarEventId: "event-123",
    });

    expect(result).toBe(false);
  });

  it("should return false if no calendar connection exists", async () => {
    vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(null);

    const result = await deleteCalendarEvent({
      shopId: "shop-123",
      calendarEventId: "event-123",
    });

    expect(result).toBe(false);
  });

  it("should timeout after 3 seconds", async () => {
    const mockConnection = {
      id: "conn-123",
      shopId: "shop-123",
      calendarId: "primary",
      calendarName: "My Calendar",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    };

    vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(
      mockConnection
    );

    const mockOAuth = {};
    vi.spyOn({ getAuthClient }, "getAuthClient").mockResolvedValue(mockOAuth as any);

    // Mock slow API call
    const mockDelete = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const mockCalendar = {
      events: {
        delete: mockDelete,
      },
    };

    vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

    const result = await deleteCalendarEvent({
      shopId: "shop-123",
      calendarEventId: "event-123",
    });

    expect(result).toBe(false); // Timeout treated as failure
  }, 5000);
});

describe("autoResolveAlert", () => {
  it("should be a no-op stub for V6/V7", async () => {
    // Should not throw
    await expect(
      autoResolveAlert("shop-123", "event-123")
    ).resolves.toBeUndefined();
  });
});
```

---

### Integration Tests

**File:** `src/app/api/manage/__tests__/cancel.test.ts` (new file or update existing)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../[token]/cancel/route";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  shopHours,
  appointments,
  policyVersions,
  payments,
  customers,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { hashToken } from "@/lib/manage-tokens";
import * as calendarModule from "@/lib/google-calendar";
import * as cacheModule from "@/lib/google-calendar-cache";

vi.mock("@/lib/google-calendar");
vi.mock("@/lib/google-calendar-cache");
vi.mock("@/lib/stripe");

describe("POST /api/manage/[token]/cancel with Calendar", () => {
  let testShopId: string;
  let testAppointmentId: string;
  let testToken: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Cancel Calendar Test",
        slug: "cancel-calendar-test",
        currency: "USD",
        ownerId: "owner-cancel",
        status: "active",
      })
      .returning();

    testShopId = shop.id;

    // Create booking settings
    await db.insert(bookingSettings).values({
      shopId: testShopId,
      timezone: "America/New_York",
      slotMinutes: 60,
    });

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@example.com",
      })
      .returning();

    // Create policy version
    const [policy] = await db
      .insert(policyVersions)
      .values({
        shopId: testShopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        cancelCutoffMinutes: 1440,
        refundBeforeCutoff: true,
      })
      .returning();

    // Create appointment with calendar event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: tomorrow,
        endsAt: new Date(tomorrow.getTime() + 3600000),
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
        calendarEventId: "event-123", // V5: Has calendar event
      })
      .returning();

    testAppointmentId = appointment.id;

    // Create manage token
    const rawToken = "test-token-123";
    testToken = rawToken;

    await db.insert(manageTokens).values({
      appointmentId: testAppointmentId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
  });

  afterEach(async () => {
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(policyVersions).where(eq(policyVersions.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should delete calendar event when cancelling appointment", async () => {
    // Mock calendar deletion
    vi.spyOn(calendarModule, "deleteCalendarEvent").mockResolvedValue(true);
    vi.spyOn(calendarModule, "autoResolveAlert").mockResolvedValue();
    vi.spyOn(cacheModule, "invalidateCalendarCache").mockResolvedValue();

    const request = new Request(`http://localhost:3000/api/manage/${testToken}/cancel`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ token: testToken }),
    });

    expect(response.status).toBe(200);
    expect(calendarModule.deleteCalendarEvent).toHaveBeenCalledWith({
      shopId: testShopId,
      calendarEventId: "event-123",
    });
    expect(calendarModule.autoResolveAlert).toHaveBeenCalledWith(testShopId, "event-123");
    expect(cacheModule.invalidateCalendarCache).toHaveBeenCalled();
  });

  it("should succeed even if calendar deletion fails", async () => {
    // Mock calendar deletion failure
    vi.spyOn(calendarModule, "deleteCalendarEvent").mockResolvedValue(false);

    const request = new Request(`http://localhost:3000/api/manage/${testToken}/cancel`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ token: testToken }),
    });

    expect(response.status).toBe(200);

    // Verify appointment still cancelled
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, testAppointmentId));

    expect(appointment.status).toBe("cancelled");
  });

  it("should work when appointment has no calendar event", async () => {
    // Update appointment to have no calendar event
    await db
      .update(appointments)
      .set({ calendarEventId: null })
      .where(eq(appointments.id, testAppointmentId));

    const mockDelete = vi.spyOn(calendarModule, "deleteCalendarEvent");

    const request = new Request(`http://localhost:3000/api/manage/${testToken}/cancel`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ token: testToken }),
    });

    expect(response.status).toBe(200);
    expect(mockDelete).not.toHaveBeenCalled(); // Should skip deletion
  });

  it("should invalidate cache after successful deletion", async () => {
    vi.spyOn(calendarModule, "deleteCalendarEvent").mockResolvedValue(true);
    vi.spyOn(calendarModule, "autoResolveAlert").mockResolvedValue();
    const mockInvalidate = vi.spyOn(cacheModule, "invalidateCalendarCache").mockResolvedValue();

    const request = new Request(`http://localhost:3000/api/manage/${testToken}/cancel`, {
      method: "POST",
    });

    await POST(request, {
      params: Promise.resolve({ token: testToken }),
    });

    expect(mockInvalidate).toHaveBeenCalled();
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/cancel-with-calendar.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  shopHours,
  appointments,
  customers,
  policyVersions,
  calendarConnections,
  manageTokens,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/manage-tokens";

test.describe("Cancel Appointment with Calendar", () => {
  let testShopId: string;
  let testAppointmentId: string;
  let testManageToken: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Cancel Calendar",
        slug: "e2e-cancel-calendar",
        currency: "USD",
        ownerId: "owner-e2e-cancel",
        status: "active",
      })
      .returning();

    testShopId = shop.id;

    // Create booking settings
    await db.insert(bookingSettings).values({
      shopId: testShopId,
      timezone: "America/New_York",
      slotMinutes: 60,
    });

    // Create calendar connection
    await db.insert(calendarConnections).values({
      shopId: testShopId,
      calendarId: "primary",
      calendarName: "Test Calendar",
      accessTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      refreshTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    });

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Cancel Test",
        phone: "+15559990000",
        email: "cancel@test.com",
      })
      .returning();

    // Create policy version
    const [policy] = await db
      .insert(policyVersions)
      .values({
        shopId: testShopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        cancelCutoffMinutes: 1440,
        refundBeforeCutoff: true,
      })
      .returning();

    // Create appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: tomorrow,
        endsAt: new Date(tomorrow.getTime() + 3600000),
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
        calendarEventId: "event-e2e-cancel",
      })
      .returning();

    testAppointmentId = appointment.id;

    // Create manage token
    const rawToken = generateToken();
    testManageToken = rawToken;

    await db.insert(manageTokens).values({
      appointmentId: testAppointmentId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
  });

  test.afterEach(async () => {
    await db.delete(manageTokens).where(eq(manageTokens.appointmentId, testAppointmentId));
    await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(policyVersions).where(eq(policyVersions.shopId, testShopId));
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("should delete calendar event when cancelling appointment", async ({ page, context }) => {
    let deleteCallCount = 0;

    // Mock Google Calendar API
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().method() === "DELETE" && route.request().url().includes("/events/")) {
        deleteCallCount++;
        route.fulfill({
          status: 204, // No content (successful deletion)
        });
      } else {
        route.continue();
      }
    });

    // Navigate to manage page
    await page.goto(`/manage/${testManageToken}`);

    // Click cancel button
    await page.click('button:has-text("Cancel Appointment")');

    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel")');

    // Wait for success message
    await page.waitForSelector('text=cancelled', { timeout: 5000 });

    // Verify calendar event deletion was called
    expect(deleteCallCount).toBe(1);
  });

  test("should succeed even if calendar deletion fails", async ({ page, context }) => {
    // Mock Google Calendar API failure
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to manage page
    await page.goto(`/manage/${testManageToken}`);

    // Click cancel button
    await page.click('button:has-text("Cancel Appointment")');

    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel")');

    // Should still succeed (graceful degradation)
    await page.waitForSelector('text=cancelled', { timeout: 5000 });

    // Verify appointment cancelled in database
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, testAppointmentId));

    expect(appointment.status).toBe("cancelled");
  });

  test("should handle 404 gracefully (event already deleted)", async ({ page, context }) => {
    // Mock 404 response
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Event not found" }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate and cancel
    await page.goto(`/manage/${testManageToken}`);
    await page.click('button:has-text("Cancel Appointment")');
    await page.click('button:has-text("Yes, Cancel")');

    // Should succeed (404 treated as success)
    await page.waitForSelector('text=cancelled', { timeout: 5000 });
  });
});
```

---

## Regression Prevention

### Critical Test Files to Monitor

```bash
# Integration tests - Cancellation
pnpm test src/app/api/manage/__tests__/cancel.test.ts

# E2E tests - Manage booking
pnpm test:e2e tests/e2e/manage-booking.spec.ts

# Unit tests - Refund processing
pnpm test src/lib/__tests__/stripe-refund.test.ts

# All tests
pnpm test
pnpm test:e2e
```

### Mock Strategy

Existing tests should mock calendar module:

```typescript
vi.mock("@/lib/google-calendar", () => ({
  deleteCalendarEvent: vi.fn().mockResolvedValue(true),
  autoResolveAlert: vi.fn().mockResolvedValue(),
  // ... other exports
}));

vi.mock("@/lib/google-calendar-cache", () => ({
  invalidateCalendarCache: vi.fn().mockResolvedValue(),
  // ... other exports
}));
```

**Expected behavior:**
- Cancellation tests pass without modification
- Calendar deletion mocked to succeed
- Refund logic unaffected
- Slot recovery still works

---

## Implementation Checklist

### Core Service

- [ ] Update `src/lib/google-calendar.ts`
- [ ] Implement `deleteCalendarEvent()` function
- [ ] Implement `autoResolveAlert()` stub
- [ ] Add 404 handling (treat as success)
- [ ] Add 3-second timeout
- [ ] Add graceful error handling (return false, don't throw)

### Cancellation Integration

- [ ] Update `src/app/api/manage/[token]/cancel/route.ts`
- [ ] Import calendar deletion functions
- [ ] Create `deleteCalendarEventIfExists()` helper
- [ ] Call helper after refund processing (Path 1)
- [ ] Call helper after cancellation transaction (Path 2)
- [ ] Include auto-resolve alert call
- [ ] Include cache invalidation
- [ ] Wrap in try-catch for graceful degradation

### Testing

- [ ] Update `src/lib/__tests__/google-calendar.test.ts`
- [ ] Write unit test for successful deletion
- [ ] Write unit test for 404 handling
- [ ] Write unit test for API error handling
- [ ] Write unit test for no connection scenario
- [ ] Write unit test for timeout
- [ ] Write unit test for auto-resolve stub
- [ ] Create or update `src/app/api/manage/__tests__/cancel.test.ts`
- [ ] Write integration test for deletion
- [ ] Write integration test for failure graceful degradation
- [ ] Write integration test for no calendar event
- [ ] Write integration test for cache invalidation
- [ ] Create `tests/e2e/cancel-with-calendar.spec.ts`
- [ ] Write E2E test for successful deletion
- [ ] Write E2E test for API failure
- [ ] Write E2E test for 404 handling
- [ ] Add calendar mocks to existing cancellation tests
- [ ] Run all tests: `pnpm test && pnpm test:e2e`

### Code Quality

- [ ] Run `pnpm lint` and fix errors
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Add logging for debugging
- [ ] Review error handling
- [ ] Add code comments

### Documentation

- [ ] Update README.md with calendar deletion
- [ ] Update CLAUDE.md with V5 notes
- [ ] Add inline comments to deletion logic
- [ ] Document graceful degradation strategy

### Manual Testing

- [ ] Test cancellation with calendar event
- [ ] Test cancellation without calendar event
- [ ] Test calendar API failure (mock)
- [ ] Test 404 scenario (event already deleted)
- [ ] Verify cache invalidated
- [ ] Verify availability reflects deletion
- [ ] Test both refund paths (before/after cutoff)

---

## Demo Script

### Preparation

1. Complete V1-V4
2. Connect Google Calendar
3. Create booking with calendar event
4. Start dev server

### Demo Flow

1. **Book Appointment**
   - Go to `/book/{shop-slug}`
   - Select tomorrow, book appointment
   - Open Google Calendar
   - See calendar event created

2. **Cancel Appointment**
   - Navigate to `/manage/{token}` (from email/SMS)
   - See appointment details
   - Click "Cancel Appointment"
   - Confirm cancellation

3. **Verify Event Deleted**
   - Open Google Calendar
   - Navigate to appointment date
   - Event is gone
   - Availability shows slot as available again

4. **Test Graceful Degradation**
   - Mock Google Calendar API to return 500 error
   - Cancel another appointment
   - Cancellation succeeds despite API failure
   - Error logged but customer unaffected

---

## Success Criteria

V5 is complete when:

✅ Calendar events deleted when appointments cancelled
✅ 404 errors treated as success (already deleted)
✅ Cancellation succeeds even if deletion fails
✅ Cache invalidated after successful deletion
✅ Auto-resolve alert stub implemented
✅ Works with appointments that have no calendar event
✅ All unit tests pass
✅ All integration tests pass
✅ All E2E tests pass
✅ No regression in existing cancellation tests
✅ Code quality checks pass

---

## Estimated Timeline

**Total: 1 day**

- **Morning:** Deletion service, cancellation integration (4 hours)
- **Afternoon:** Testing, manual verification (4 hours)

**Buffer:** Minimal (straightforward deletion logic)

---

## Known Limitations (V5)

1. **No Batch Deletion** - Deletes one event at a time (acceptable for single-appointment cancellations)
2. **No Retry Logic** - Fails once, logs error (acceptable with graceful degradation)
3. **Auto-Resolve Stub** - V6/V7 feature placeholder (no functionality yet)
4. **No Event Update** - Can't update events, only delete (V2.1 future enhancement)
5. **3-Second Timeout** - Fixed timeout, not configurable

---

## Next Steps After V5

**V6: Scan Conflicts (Cron Job)**
- Create `calendar_conflict_alerts` table
- Implement conflict scanning cron job
- Detect conflicts between appointments and calendar events
- Create alerts for manual resolution
- Implement auto-resolve logic (use V5's stub)

**Prerequisites from V5:**
- Event deletion working
- Auto-resolve stub in place
- Cache invalidation functional

---

## Rollback Plan

If V5 needs to be rolled back:

1. **Code Rollback:**
   - Revert `deleteCalendarEvent()` and `autoResolveAlert()` in `src/lib/google-calendar.ts`
   - Revert changes in `src/app/api/manage/[token]/cancel/route.ts`
   - Remove test files

2. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All existing functionality remains unchanged.
