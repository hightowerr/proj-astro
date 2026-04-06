# V4: Prevent Conflict Bookings - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 1 day
**Dependencies:** V1 (OAuth), V2 (event creation), V3 (slot filtering)
**Demo:** Booking submission fails with clear error when calendar conflict detected

---

## Overview

V4 adds server-side validation to prevent bookings that conflict with Google Calendar events. While V3 filters conflicting slots from the availability display, customers can still attempt to book conflicting times through direct links, race conditions, or cached data. V4 ensures conflicts are caught at booking submission time, preventing double-bookings.

### Goal

Validate bookings against calendar events at submission time:
1. **Validate** slot against calendar events before creating appointment
2. **Detect** conflicts (overlapping events, all-day events)
3. **Reject** booking with 409 Conflict status
4. **Return** error details (conflicting event summary)
5. **Display** user-friendly error message in booking form

This slice completes the conflict prevention system (V3 filters slots, V4 validates bookings).

---

## Current State Analysis

### Existing Booking Flow

**File:** `src/app/api/bookings/create/route.ts:72-146`

**Current Flow:**
1. Validate request schema (Zod)
2. Normalize customer data (phone, email)
3. Call `createAppointment()` (creates appointment + payment)
4. Generate manage token
5. Return success response

**Current Error Handling:**
- `SlotTakenError` → 409 "Slot taken" (appointment conflict)
- `InvalidSlotError` → 400 with error message
- `ShopClosedError` → 400 with error message
- Unknown errors → 500 "Failed to create booking"

**Missing:**
- No calendar conflict validation
- No check against calendar events before creating appointment
- No way to distinguish calendar conflicts from appointment conflicts

### Existing Infrastructure (V3)

**Calendar Event Fetching:**
- `fetchCalendarEventsWithCache()` fetches events with caching
- `filterSlotsForConflicts()` detects overlaps
- `isAllDayEvent()` identifies all-day events

**Conflict Detection Logic:**
- Already implemented in V3 for availability filtering
- Can be reused for booking validation
- Same overlap algorithm applies

### What's Missing (to be built)

1. **Conflict validation function** - Check if booking conflicts with calendar events
2. **CalendarConflictError exception** - Typed error for calendar conflicts
3. **Pre-booking validation** - Call validation before `createAppointment()`
4. **409 response enhancement** - Include conflicting event details
5. **UI error handling** - Display calendar conflict errors in booking form

---

## Requirements

### Functional Requirements

**FR1: Validate Booking Against Calendar**
- Before creating appointment, fetch calendar events for booking time
- Check if booking time overlaps with any calendar event
- Include buffer zone check (event within ±5 minutes considered conflict)
- Handle all-day events (always conflict)
- Use same conflict detection logic as V3

**FR2: Return Detailed Conflict Error**
- HTTP 409 Conflict status
- Error message: "This time conflicts with an existing calendar event"
- Include conflicting event details:
  - Event summary (e.g., "Team Meeting")
  - Event start/end times
- Sanitize event details (no sensitive information)

**FR3: Prevent Appointment Creation**
- Do NOT create appointment if conflict detected
- Do NOT create payment intent
- Do NOT send SMS
- Validation happens BEFORE any database writes

**FR4: Display User-Friendly Error**
- Booking form shows clear error message
- Error explains why booking failed
- Include event summary if available
- Suggest checking availability again

**FR5: Graceful Degradation**
- If calendar API fails → allow booking (don't block on API failure)
- If no calendar connection → allow booking
- Log calendar API failures but don't expose to customer
- Prioritize booking availability over calendar validation

### Non-Functional Requirements

**NFR1: Performance**
- Validation adds max 500ms to booking time (same as V3 cache)
- Cache hit: <10ms overhead
- Doesn't block booking flow on timeout

**NFR2: Race Condition Handling**
- Validate at submission time (most recent data)
- Even if slot shown as available, validate before creating
- Handle concurrent bookings (appointment conflict vs calendar conflict)

**NFR3: Error Clarity**
- Distinguish calendar conflicts from appointment conflicts
- Different error messages for different conflict types
- Help customers understand why booking failed

**NFR4: Backward Compatibility**
- Existing SlotTakenError behavior unchanged
- Existing error handling patterns maintained
- No breaking changes to booking API

---

## Implementation Steps

### Step 1: Calendar Conflict Validation Service

**File:** `src/lib/calendar-conflicts.ts` (new file)

**Purpose:** Validate bookings against calendar events

```typescript
import { fetchCalendarEventsWithCache, isAllDayEvent, CalendarEvent } from "@/lib/google-calendar-cache";

/**
 * Error thrown when booking conflicts with calendar event.
 */
export class CalendarConflictError extends Error {
  public readonly conflictingEvent: {
    summary: string;
    start: string;
    end: string;
  } | null;

  constructor(message: string, conflictingEvent?: CalendarEvent) {
    super(message);
    this.name = "CalendarConflictError";

    if (conflictingEvent) {
      this.conflictingEvent = {
        summary: conflictingEvent.summary || "Busy",
        start: conflictingEvent.start.dateTime || conflictingEvent.start.date || "",
        end: conflictingEvent.end.dateTime || conflictingEvent.end.date || "",
      };
    } else {
      this.conflictingEvent = null;
    }
  }
}

/**
 * Validates if a booking conflicts with calendar events.
 *
 * Conflict exists if:
 * - Any calendar event overlaps with booking time
 * - All-day event exists on booking date
 * - Event within buffer zone (±5 minutes)
 *
 * @param input - Validation parameters
 * @throws CalendarConflictError if conflict detected
 */
export async function validateBookingConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<void> {
  const { shopId, startsAt, endsAt, timezone } = input;

  // Get date string for cache key
  const dateStr = startsAt.toISOString().split("T")[0];

  try {
    // Fetch calendar events (with cache)
    const events = await fetchCalendarEventsWithCache(shopId, dateStr, timezone);

    if (events.length === 0) {
      // No events, no conflicts
      return;
    }

    const bookingStart = startsAt.getTime();
    const bookingEnd = endsAt.getTime();

    // Check for all-day events first
    const allDayEvent = events.find(isAllDayEvent);
    if (allDayEvent) {
      throw new CalendarConflictError(
        "This date is blocked by an all-day calendar event",
        allDayEvent
      );
    }

    // Check for overlapping events
    for (const event of events) {
      // Skip all-day events (already checked)
      if (isAllDayEvent(event)) {
        continue;
      }

      const eventStartStr = event.start.dateTime;
      const eventEndStr = event.end.dateTime;

      if (!eventStartStr || !eventEndStr) {
        // Invalid event, skip
        continue;
      }

      const eventStart = new Date(eventStartStr).getTime();
      const eventEnd = new Date(eventEndStr).getTime();

      // Check for overlap with buffer zone (±5 minutes = 300000 ms)
      const BUFFER_MS = 5 * 60 * 1000;
      const overlaps =
        eventStart < bookingEnd + BUFFER_MS &&
        eventEnd > bookingStart - BUFFER_MS;

      if (overlaps) {
        throw new CalendarConflictError(
          "This time conflicts with an existing calendar event",
          event
        );
      }
    }

    // No conflicts found
  } catch (error) {
    // If error is CalendarConflictError, re-throw
    if (error instanceof CalendarConflictError) {
      throw error;
    }

    // For other errors (API failures, etc.), log and allow booking (graceful degradation)
    console.error(
      `[calendar-conflicts] Failed to validate calendar conflicts for shop ${shopId}:`,
      error instanceof Error ? error.message : "Unknown error"
    );

    // Don't block booking on calendar API failures
    return;
  }
}

/**
 * Checks if a booking conflicts with calendar events (non-throwing version).
 *
 * @param input - Validation parameters
 * @returns true if conflict exists, false otherwise
 */
export async function hasCalendarConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<boolean> {
  try {
    await validateBookingConflict(input);
    return false; // No conflict
  } catch (error) {
    if (error instanceof CalendarConflictError) {
      return true; // Conflict detected
    }
    return false; // Error, but allow booking (graceful degradation)
  }
}
```

**Key Design Decisions:**
- **Buffer zone:** ±5 minutes prevents back-to-back bookings that feel too tight
- **Graceful degradation:** API failures don't block bookings
- **Detailed error:** Includes event summary to help customer understand conflict
- **Reuses V3 logic:** Same event fetching and caching infrastructure

---

### Step 2: Integrate Validation into Booking API

**File:** `src/app/api/bookings/create/route.ts` (update)

**Purpose:** Validate calendar conflicts before creating appointment

```typescript
// Add imports at top
import {
  validateBookingConflict,
  CalendarConflictError,
} from "@/lib/calendar-conflicts";
import { computeEndsAt } from "@/lib/booking";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";

export async function POST(req: Request) {
  // ... existing code (lines 35-71) ...

  try {
    const bookingBaseUrl = buildBookingBaseUrl(req, shop.slug);
    const customerData: {
      fullName: string;
      phone: string;
      email: string;
      smsOptIn?: boolean;
    } = {
      fullName: parsed.data.customer.fullName.trim(),
      phone,
      email,
    };
    if (typeof parsed.data.customer.smsOptIn === "boolean") {
      customerData.smsOptIn = parsed.data.customer.smsOptIn;
    }

    // ============ V4: VALIDATE CALENDAR CONFLICTS ============
    // Load booking settings to get timezone and slot duration
    const bookingSettings = await getBookingSettingsForShop(shop.id);

    if (!bookingSettings) {
      throw new Error("Booking settings not found");
    }

    // Calculate appointment end time
    const endsAt = computeEndsAt({
      startsAt,
      timeZone: bookingSettings.timezone,
      slotMinutes: bookingSettings.slotMinutes,
    });

    // Validate against calendar events
    await validateBookingConflict({
      shopId: shop.id,
      startsAt,
      endsAt,
      timezone: bookingSettings.timezone,
    });
    // ============ END V4 CHANGES ============

    const result = await createAppointment({
      shopId: shop.id,
      startsAt,
      customer: customerData,
      bookingBaseUrl,
    });
    const manageToken = await createManageToken(result.appointment.id);

    return Response.json({
      // ... existing response (lines 95-127) ...
    });
  } catch (error) {
    // ============ V4: ADD CALENDAR CONFLICT ERROR HANDLING ============
    if (error instanceof CalendarConflictError) {
      return Response.json(
        {
          error: error.message,
          conflictingEvent: error.conflictingEvent,
        },
        { status: 409 }
      );
    }
    // ============ END V4 CHANGES ============

    if (error instanceof SlotTakenError) {
      return Response.json({ error: "Slot taken" }, { status: 409 });
    }

    // ... existing error handling (lines 133-145) ...
  }
}
```

**Key Changes:**
1. Load booking settings to get timezone and slot duration
2. Calculate appointment end time using existing `computeEndsAt()` helper
3. Call `validateBookingConflict()` BEFORE `createAppointment()`
4. Add error handler for `CalendarConflictError` → 409 with event details
5. Existing error handlers unchanged (SlotTakenError still works)

---

### Step 3: Update Booking Form Error Handling

**File:** `src/components/booking/booking-form.tsx` (update)

**Note:** This is a placeholder path. The actual booking form component may be in a different location. Find and update the appropriate component.

**Purpose:** Display calendar conflict errors to customer

```typescript
// Inside booking form component, update error handling

const [error, setError] = useState<{
  message: string;
  conflictingEvent?: {
    summary: string;
    start: string;
    end: string;
  };
} | null>(null);

async function handleSubmit(data: BookingFormData) {
  try {
    setError(null);

    const response = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: shopSlug,
        startsAt: selectedSlot.toISOString(),
        customer: data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      if (response.status === 409) {
        // Calendar conflict or slot taken
        setError({
          message: errorData.error,
          conflictingEvent: errorData.conflictingEvent,
        });
        return;
      }

      setError({ message: errorData.error || "Failed to create booking" });
      return;
    }

    const result = await response.json();
    // Handle success...
  } catch (err) {
    setError({ message: "Network error. Please try again." });
  }
}

// In render:
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <p className="font-medium text-red-800">{error.message}</p>
    {error.conflictingEvent && (
      <p className="text-sm text-red-700 mt-2">
        Conflicts with: {error.conflictingEvent.summary}
        {" at "}
        {new Date(error.conflictingEvent.start).toLocaleTimeString()}
      </p>
    )}
    <p className="text-sm text-red-600 mt-2">
      Please select a different time slot.
    </p>
  </div>
)}
```

**Key Changes:**
1. Update error state to include optional `conflictingEvent` field
2. Handle 409 responses (both calendar conflicts and slot taken)
3. Display conflicting event details if available
4. Provide actionable guidance ("select a different time slot")

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/calendar-conflicts.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateBookingConflict,
  hasCalendarConflict,
  CalendarConflictError,
} from "@/lib/calendar-conflicts";
import * as cacheModule from "@/lib/google-calendar-cache";

vi.mock("@/lib/google-calendar-cache");

describe("Calendar Conflict Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateBookingConflict", () => {
    it("should not throw if no calendar events exist", async () => {
      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([]);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).resolves.not.toThrow();
    });

    it("should throw CalendarConflictError for overlapping events", async () => {
      const mockEvents = [
        {
          id: "event-1",
          summary: "Team Meeting",
          start: { dateTime: "2024-03-20T10:00:00Z" },
          end: { dateTime: "2024-03-20T11:00:00Z" },
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).rejects.toThrow(CalendarConflictError);
    });

    it("should throw CalendarConflictError for all-day events", async () => {
      const mockEvents = [
        {
          id: "event-all-day",
          summary: "Holiday",
          start: { date: "2024-03-20" },
          end: { date: "2024-03-21" },
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);
      vi.spyOn(cacheModule, "isAllDayEvent").mockReturnValue(true);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).rejects.toThrow(CalendarConflictError);
    });

    it("should throw for partial overlaps", async () => {
      const mockEvents = [
        {
          id: "event-partial",
          summary: "Lunch",
          start: { dateTime: "2024-03-20T10:30:00Z" }, // Starts during booking
          end: { dateTime: "2024-03-20T11:30:00Z" }, // Ends after booking
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).rejects.toThrow(CalendarConflictError);
    });

    it("should throw for events within buffer zone", async () => {
      const mockEvents = [
        {
          id: "event-buffer",
          summary: "Quick Meeting",
          start: { dateTime: "2024-03-20T10:57:00Z" }, // 3 minutes before booking
          end: { dateTime: "2024-03-20T11:00:00Z" }, // Exactly when booking starts
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
          timezone: "America/New_York",
        })
      ).rejects.toThrow(CalendarConflictError);
    });

    it("should not throw for non-overlapping events", async () => {
      const mockEvents = [
        {
          id: "event-before",
          summary: "Morning Meeting",
          start: { dateTime: "2024-03-20T09:00:00Z" },
          end: { dateTime: "2024-03-20T10:00:00Z" }, // Ends when booking starts
        },
        {
          id: "event-after",
          summary: "Afternoon Meeting",
          start: { dateTime: "2024-03-20T11:00:00Z" }, // Starts when booking ends
          end: { dateTime: "2024-03-20T12:00:00Z" },
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).resolves.not.toThrow();
    });

    it("should not throw if calendar API fails (graceful degradation)", async () => {
      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockRejectedValue(
        new Error("API error")
      );

      await expect(
        validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        })
      ).resolves.not.toThrow();
    });

    it("should include event details in CalendarConflictError", async () => {
      const mockEvents = [
        {
          id: "event-details",
          summary: "Important Meeting",
          start: { dateTime: "2024-03-20T10:00:00Z" },
          end: { dateTime: "2024-03-20T11:00:00Z" },
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      try {
        await validateBookingConflict({
          shopId: "shop-123",
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
          timezone: "America/New_York",
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CalendarConflictError);
        expect((error as CalendarConflictError).conflictingEvent?.summary).toBe(
          "Important Meeting"
        );
      }
    });
  });

  describe("hasCalendarConflict", () => {
    it("should return true for conflicts", async () => {
      const mockEvents = [
        {
          id: "event-1",
          summary: "Meeting",
          start: { dateTime: "2024-03-20T10:00:00Z" },
          end: { dateTime: "2024-03-20T11:00:00Z" },
        },
      ];

      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);

      const hasConflict = await hasCalendarConflict({
        shopId: "shop-123",
        startsAt: new Date("2024-03-20T10:00:00Z"),
        endsAt: new Date("2024-03-20T11:00:00Z"),
        timezone: "America/New_York",
      });

      expect(hasConflict).toBe(true);
    });

    it("should return false for no conflicts", async () => {
      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([]);

      const hasConflict = await hasCalendarConflict({
        shopId: "shop-123",
        startsAt: new Date("2024-03-20T10:00:00Z"),
        endsAt: new Date("2024-03-20T11:00:00Z"),
        timezone: "America/New_York",
      });

      expect(hasConflict).toBe(false);
    });

    it("should return false on API errors", async () => {
      vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockRejectedValue(
        new Error("API error")
      );

      const hasConflict = await hasCalendarConflict({
        shopId: "shop-123",
        startsAt: new Date("2024-03-20T10:00:00Z"),
        endsAt: new Date("2024-03-20T11:00:00Z"),
        timezone: "America/New_York",
      });

      expect(hasConflict).toBe(false);
    });
  });
});
```

---

### Integration Tests

**File:** `src/app/api/bookings/__tests__/create.test.ts` (new file or update existing)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../create/route";
import { db } from "@/lib/db";
import { shops, bookingSettings, shopHours } from "@/lib/schema";
import { eq } from "drizzle-orm";
import * as conflictsModule from "@/lib/calendar-conflicts";

vi.mock("@/lib/calendar-conflicts");

describe("POST /api/bookings/create with Calendar Validation", () => {
  let testShopId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "API Calendar Test",
        slug: "api-calendar-test",
        currency: "USD",
        ownerId: "owner-api",
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

    // Create shop hours (Monday)
    await db.insert(shopHours).values({
      shopId: testShopId,
      dayOfWeek: 1,
      openTime: "09:00",
      closeTime: "17:00",
    });
  });

  afterEach(async () => {
    await db.delete(shopHours).where(eq(shopHours.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should return 409 when calendar conflict exists", async () => {
    // Mock calendar conflict
    vi.spyOn(conflictsModule, "validateBookingConflict").mockRejectedValue(
      new conflictsModule.CalendarConflictError("Calendar conflict", {
        id: "event-1",
        summary: "Team Meeting",
        start: { dateTime: "2024-03-25T10:00:00Z" },
        end: { dateTime: "2024-03-25T11:00:00Z" },
      } as any)
    );

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "api-calendar-test",
        startsAt: "2024-03-25T10:00:00Z",
        customer: {
          fullName: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBeTruthy();
    expect(data.conflictingEvent).toBeTruthy();
    expect(data.conflictingEvent.summary).toBe("Team Meeting");
  });

  it("should create booking when no calendar conflict", async () => {
    // Mock no conflict
    vi.spyOn(conflictsModule, "validateBookingConflict").mockResolvedValue();

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "api-calendar-test",
        startsAt: "2024-03-25T14:00:00Z",
        customer: {
          fullName: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.appointment).toBeTruthy();
    expect(data.appointment.id).toBeTruthy();
  });

  it("should not create appointment when conflict detected", async () => {
    vi.spyOn(conflictsModule, "validateBookingConflict").mockRejectedValue(
      new conflictsModule.CalendarConflictError("Calendar conflict")
    );

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "api-calendar-test",
        startsAt: "2024-03-25T10:00:00Z",
        customer: {
          fullName: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
      }),
    });

    await POST(request);

    // Verify no appointment created
    const appointments = await db.query.appointments.findMany({
      where: (table, { eq }) => eq(table.shopId, testShopId),
    });

    expect(appointments).toHaveLength(0);
  });

  it("should still work when calendar validation is unavailable", async () => {
    // Mock validation throws non-CalendarConflictError (API failure)
    vi.spyOn(conflictsModule, "validateBookingConflict").mockRejectedValue(
      new Error("Calendar API unavailable")
    );

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "api-calendar-test",
        startsAt: "2024-03-25T14:00:00Z",
        customer: {
          fullName: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
      }),
    });

    const response = await POST(request);

    // Should succeed (graceful degradation)
    expect(response.status).toBe(200);
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/booking-conflict-prevention.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { shops, bookingSettings, shopHours, calendarConnections } from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Booking Conflict Prevention", () => {
  let testShopId: string;
  let testShopSlug: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Conflict Prevention",
        slug: "e2e-conflict-prevention",
        currency: "USD",
        ownerId: "owner-e2e-conflict",
        status: "active",
      })
      .returning();

    testShopId = shop.id;
    testShopSlug = shop.slug;

    // Create booking settings
    await db.insert(bookingSettings).values({
      shopId: testShopId,
      timezone: "America/New_York",
      slotMinutes: 60,
    });

    // Create shop hours (all days)
    for (let day = 0; day <= 6; day++) {
      await db.insert(shopHours).values({
        shopId: testShopId,
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "17:00",
      });
    }

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
  });

  test.afterEach(async () => {
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(shopHours).where(eq(shopHours.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("should show calendar conflict error when submitting conflicting booking", async ({
    page,
    context,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Mock Google Calendar API with event at 2:00 PM
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().url().includes("/calendar/v3/calendars/")) {
        const tomorrowUtc = new Date(tomorrow);
        tomorrowUtc.setUTCHours(18, 0, 0, 0); // 2:00 PM ET = 18:00 UTC

        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "event-conflict",
                summary: "Important Client Meeting",
                start: {
                  dateTime: new Date(tomorrowUtc).toISOString(),
                },
                end: {
                  dateTime: new Date(tomorrowUtc.getTime() + 3600000).toISOString(),
                },
              },
            ],
          }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Try to book the conflicting slot (2:00 PM)
    // This could happen via direct link or race condition
    await page.evaluate(
      ({ slug, dateTime }) => {
        // Simulate direct booking attempt
        const form = document.querySelector("form");
        if (form) {
          // Fill form and submit programmatically
        }
      },
      { slug: testShopSlug, dateTime: new Date(tomorrow).toISOString() }
    );

    // Or manually fill form
    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');

    // Manually navigate to 2:00 PM slot (simulate race condition)
    await page.evaluate(() => {
      const timeInput = document.querySelector('input[name="time"]') as HTMLInputElement;
      if (timeInput) timeInput.value = "14:00";
    });

    await page.fill('input[name="fullName"]', "Conflict Test");
    await page.fill('input[name="phone"]', "+15559998888");
    await page.fill('input[name="email"]', "conflict@test.com");

    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Verify conflict error shown
    await page.waitForSelector('text=calendar event', { timeout: 3000 });

    const errorMessage = await page.textContent('[class*="error"], [class*="alert"]');
    expect(errorMessage).toContain("calendar event");
    expect(errorMessage).toContain("Important Client Meeting");
  });

  test("should allow booking when no conflict exists", async ({ page, context }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Mock empty calendar (no events)
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().url().includes("/calendar/v3/calendars/")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate and book
    await page.goto(`/book/${testShopSlug}`);

    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');
    await page.waitForSelector('button[data-slot]');
    await page.click('button[data-slot]:first-child');

    await page.fill('input[name="fullName"]', "No Conflict Test");
    await page.fill('input[name="phone"]', "+15557776666");
    await page.fill('input[name="email"]', "noconflict@test.com");

    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Verify success
    await page.waitForSelector('text=booked successfully', { timeout: 5000 });
  });

  test("should show helpful error message for all-day event conflict", async ({
    page,
    context,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Mock all-day event
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().url().includes("/calendar/v3/calendars/")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "event-all-day",
                summary: "Out of Office",
                start: { date: tomorrowStr },
                end: {
                  date: new Date(tomorrow.getTime() + 86400000).toISOString().split("T")[0],
                },
              },
            ],
          }),
        });
      } else {
        route.continue();
      }
    });

    // Try to book (should fail at submission)
    await page.goto(`/book/${testShopSlug}`);

    // Even if slots shown (race condition), submission should fail
    await page.fill('input[name="fullName"]', "All Day Test");
    await page.fill('input[name="phone"]', "+15554443333");
    await page.fill('input[name="email"]', "allday@test.com");

    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Verify all-day event error
    await page.waitForSelector('text=all-day', { timeout: 3000 });
  });
});
```

---

## Regression Prevention

### Critical Test Files to Monitor

```bash
# Integration tests - Booking API
pnpm test src/app/api/bookings/__tests__/create.test.ts

# E2E tests - Booking flow
pnpm test:e2e tests/e2e/booking.spec.ts

# Unit tests - Slot validation
pnpm test src/lib/__tests__/booking.test.ts

# All tests
pnpm test
pnpm test:e2e
```

### Mock Strategy

Existing tests should mock calendar conflicts module:

```typescript
vi.mock("@/lib/calendar-conflicts", () => ({
  validateBookingConflict: vi.fn().mockResolvedValue(undefined), // No conflict
  hasCalendarConflict: vi.fn().mockResolvedValue(false),
  CalendarConflictError: class CalendarConflictError extends Error {},
}));
```

**Expected behavior:**
- Booking tests pass without modification
- Calendar validation mocked to never conflict
- Bookings succeed normally

---

## Implementation Checklist

### Core Service

- [ ] Create `src/lib/calendar-conflicts.ts`
- [ ] Implement `CalendarConflictError` class
- [ ] Implement `validateBookingConflict()` function
- [ ] Implement `hasCalendarConflict()` helper
- [ ] Add buffer zone logic (±5 minutes)
- [ ] Add graceful degradation for API failures

### API Integration

- [ ] Update `src/app/api/bookings/create/route.ts`
- [ ] Import conflict validation functions
- [ ] Load booking settings for timezone/duration
- [ ] Call `validateBookingConflict()` before `createAppointment()`
- [ ] Add error handler for `CalendarConflictError`
- [ ] Return 409 with event details

### UI Updates

- [ ] Find booking form component
- [ ] Update error state to handle conflicting event
- [ ] Add 409 error handling
- [ ] Display conflict error message
- [ ] Show conflicting event details
- [ ] Add guidance to select different slot

### Testing

- [ ] Create `src/lib/__tests__/calendar-conflicts.test.ts`
- [ ] Write unit tests for overlap detection
- [ ] Write unit tests for all-day events
- [ ] Write unit tests for buffer zone
- [ ] Write unit tests for graceful degradation
- [ ] Update or create `src/app/api/bookings/__tests__/create.test.ts`
- [ ] Write integration test for 409 response
- [ ] Write integration test for no conflict
- [ ] Create `tests/e2e/booking-conflict-prevention.spec.ts`
- [ ] Write E2E test for conflict error display
- [ ] Write E2E test for successful booking
- [ ] Add calendar mocks to existing booking tests
- [ ] Run all tests: `pnpm test && pnpm test:e2e`

### Code Quality

- [ ] Run `pnpm lint` and fix errors
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Add logging for conflict detection
- [ ] Review error messages (user-friendly)
- [ ] Add code comments

### Documentation

- [ ] Update README.md with conflict prevention
- [ ] Update CLAUDE.md with V4 notes
- [ ] Add inline comments to validation logic
- [ ] Document buffer zone rationale

### Manual Testing

- [ ] Test booking with calendar conflict
- [ ] Test booking without conflict
- [ ] Test all-day event blocking
- [ ] Test partial overlap detection
- [ ] Test buffer zone (events within ±5 minutes)
- [ ] Test graceful degradation (calendar API failure)
- [ ] Test race condition scenario

---

## Demo Script

### Preparation

1. Complete V1-V3
2. Connect Google Calendar
3. Create test event in calendar
4. Start dev server

### Demo Flow (Conflict Scenario)

1. **Create Calendar Event**
   - Open Google Calendar
   - Create event tomorrow at 2:00 PM
   - Title: "Important Meeting"

2. **Attempt Booking**
   - Go to `/book/{shop-slug}`
   - Manually navigate to booking form
   - Fill customer details
   - Submit booking for 2:00 PM slot

'3. **Verify Error**
   - See error message: "This time conflicts with an existing calendar event"
   - See event details: "Conflicts with: Important Meeting"
   - Booking NOT creat'ed

4. **Book Different Time**
   - Select 3:00 PM slot instead
   - Submit booking
   - Success!

### Demo Flow (Race Condition)

1. **V3 Cache Expires**
   - Customer views availability at 2:00 PM
   - Sees 2:00 PM slot available (cached, no events)
   - Shop owner creates calendar event at 2:00 PM
   - Customer submits booking

2. **V4 Validation**
   - Validation fetches fresh events
   - Detects new conflict
   - Returns 409 error
   - Prevents double-booking

---

## Success Criteria

V4 is complete when:

✅ Calendar conflicts validated at booking submission
✅ 409 error returned with event details
✅ Booking form displays calendar conflict errors
✅ No appointment created when conflict detected
✅ Buffer zone (±5 minutes) prevents tight back-to-back
✅ Graceful degradation on calendar API failures
✅ All unit tests pass
✅ All integration tests pass
✅ All E2E tests pass
✅ No regression in existing booking tests
✅ Code quality checks pass

---

## Estimated Timeline

**Total: 1 day**

- **Morning:** Conflict service, API integration (4 hours)
- **Afternoon:** UI updates, testing, manual verification (4 hours)

**Buffer:** Minimal (simple validation logic)

---

## Known Limitations (V4)

1. **±5 Minute Buffer Fixed** - Not configurable per shop (future enhancement)
2. **Event Details Limited** - Only summary shown (no location, attendees for privacy)
3. **No Conflict Auto-Resolution** - Customer must manually select new time
4. **Single Event Shown** - If multiple conflicts, only first shown
5. **No Proactive Blocking** - Relies on submission validation (V3 handles display)

---

## Next Steps After V4

**V5: Delete Events on Cancel**
- Delete calendar event when appointment cancelled
- Auto-resolve conflict alerts (for V6/V7)
- Invalidate cache after deletion
- Handle 404 gracefully (event already deleted)

**Prerequisites from V4:**
- Conflict detection functional
- Error handling patterns established
- Calendar integration stable

---

## Rollback Plan

If V4 needs to be rolled back:

1. **Code Rollback:**
   - Remove `src/lib/calendar-conflicts.ts`
   - Revert changes in `src/app/api/bookings/create/route.ts`
   - Revert changes in booking form component
   - Remove test files

2. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All existing functionality remains unchanged.
