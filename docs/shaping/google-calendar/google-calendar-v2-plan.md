# V2: Create Calendar Events on Booking - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 2-3 days
**Dependencies:** V1 (OAuth connection must be completed)
**Demo:** Customer books appointment → calendar event automatically created in Google Calendar

---

## Overview

V2 integrates calendar event creation into the booking flow. When a customer books an appointment, the system automatically creates a corresponding event in the shop owner's connected Google Calendar. This slice establishes the core synchronization mechanism between appointments and calendar events.

### Goal

Automatically synchronize appointment bookings to Google Calendar:
1. **Create** calendar event when customer books appointment
2. **Store** calendar event ID in appointments table for future reference
3. **Handle** OAuth token refresh when access token expires
4. **Rollback** appointment if calendar event creation fails
5. **Invalidate** calendar cache after successful creation

This slice provides the foundation for automatic calendar synchronization (V3-V7 will add conflict detection, event deletion, etc.).

---

## Current State Analysis

### Existing Booking Flow

**File:** `src/lib/queries/appointments.ts:479-790`

**Current Transaction Flow:**
1. Validate slot timing and shop hours
2. Upsert customer and contact preferences
3. Load payment policy and customer score
4. Create policy version snapshot
5. Insert appointment record
6. Create payment record and Stripe payment intent (if required)
7. **Transaction commits**
8. Update no-show score (outside transaction)

**Key Characteristics:**
- Uses `db.transaction()` for atomicity
- Throws typed errors: `SlotTakenError`, `InvalidSlotError`, `ShopClosedError`
- Payment creation can fail → appointment status set to `cancelled`
- Returns comprehensive result object with appointment, customer, payment

### Existing Infrastructure

**Calendar Connection (V1):**
- `calendar_connections` table with encrypted tokens
- OAuth tokens stored: `access_token_encrypted`, `refresh_token_encrypted`
- Token expiration tracked: `token_expires_at`

**Redis Cache:**
- Available via `src/lib/redis.ts`
- Used for slot locking and other temporary data
- TTL support for automatic expiration

**Database Transaction Support:**
- Drizzle ORM with full transaction support
- Rollback on any error within transaction
- Type-safe query building

### What's Missing (to be built)

1. **Google Calendar API client** - googleapis package integration
2. **Token refresh logic** - Refresh expired access tokens
3. **Calendar event creation service** - API call to create events
4. **Calendar connection query** - Load active connection for shop
5. **Cache invalidation** - Clear cached calendar data
6. **calendarEventId column** - Store event reference in appointments table

---

## Requirements

### Functional Requirements

**FR1: Calendar Event Creation**
- When appointment created, create Google Calendar event
- Event title: "Appointment: {customer full name}"
- Event start/end times match appointment times
- Event description includes booking URL (if available)
- Event location: shop name
- Calendar event creation occurs INSIDE transaction

**FR2: Event ID Storage**
- Store Google Calendar event ID in `appointments.calendarEventId`
- Link maintained for future operations (update, delete)
- Event ID must be unique per appointment

**FR3: Token Refresh**
- Check if access token expired before API call
- Refresh access token using refresh token if expired
- Update `calendar_connections` table with new token and expiry
- Retry calendar API call with fresh token
- Log refresh events for debugging

**FR4: Transaction Rollback**
- If calendar event creation fails, rollback entire appointment transaction
- No appointment created if calendar sync fails
- Customer sees error: "Failed to create booking - calendar sync error"
- Error logged with sanitized details (no tokens)

**FR5: Cache Invalidation**
- After successful event creation, invalidate calendar cache
- Clear Redis key: `calendar:{shopId}:{date}`
- Ensures availability API reflects new event
- Graceful degradation if Redis unavailable

**FR6: Conditional Calendar Sync**
- Only create calendar event if shop has active calendar connection
- Booking without calendar connection works normally (backward compatible)
- No errors thrown if no connection exists

### Non-Functional Requirements

**NFR1: Atomicity**
- Calendar event creation MUST be part of appointment transaction
- Either both succeed or both fail
- No orphaned calendar events
- No appointments without calendar events (when connection active)

**NFR2: Performance**
- Calendar API call adds max 500ms to booking time
- Token refresh adds max 1s when needed
- Timeout after 5s for calendar API calls
- Booking fails gracefully on timeout

**NFR3: Security**
- Access tokens decrypted only in memory
- Never logged or exposed in errors
- API calls use HTTPS
- Token refresh updates encrypted storage

**NFR4: Error Handling**
- Specific error messages for different failure types
- Calendar API errors logged with context
- User-friendly error messages (no technical jargon)
- Monitoring-friendly error structure

---

## Database Schema Changes

### Migration: Add `calendarEventId` Column

**File:** `drizzle/0017_appointment_calendar_event.sql` (new migration)

```sql
-- Add calendar event ID to appointments table
ALTER TABLE appointments
  ADD COLUMN calendar_event_id TEXT;

-- Add index for calendar event lookup
CREATE INDEX idx_appointments_calendar_event_id
  ON appointments(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN appointments.calendar_event_id IS
  'Google Calendar event ID (from V2). Used for event updates and deletions.';
```

**Drizzle Schema Update:**

**File:** `src/lib/schema.ts` (update appointments table)

```typescript
export const appointments = pgTable(
  "appointments",
  {
    // ... existing columns ...

    // V2: Google Calendar integration
    calendarEventId: text("calendar_event_id"),

    // ... existing columns ...
  },
  (table) => [
    // ... existing indexes ...

    index("idx_appointments_calendar_event_id")
      .on(table.calendarEventId)
      .where(sql`${table.calendarEventId} IS NOT NULL`),
  ]
);
```

---

## Implementation Steps

### Step 1: Google Calendar API Client Setup

**File:** `src/lib/google-calendar.ts` (new file)

**Purpose:** Core Google Calendar API integration with token refresh

```typescript
import { google } from "googleapis";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { env } from "@/lib/env";
import {
  decryptToken,
  deserializeEncryptedToken,
  encryptToken,
  serializeEncryptedToken,
} from "@/lib/google-calendar-encryption";

/**
 * Error thrown when calendar event creation fails.
 */
export class CalendarEventCreationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CalendarEventCreationError";
  }
}

/**
 * Error thrown when no calendar connection exists for shop.
 */
export class NoCalendarConnectionError extends Error {
  constructor(shopId: string) {
    super(`No active calendar connection for shop ${shopId}`);
    this.name = "NoCalendarConnectionError";
  }
}

/**
 * Loads active calendar connection for a shop.
 *
 * @param shopId - Shop UUID
 * @returns Calendar connection with decrypted tokens, or null if none
 */
export async function getCalendarConnection(shopId: string) {
  const [connection] = await db
    .select({
      id: calendarConnections.id,
      shopId: calendarConnections.shopId,
      calendarId: calendarConnections.calendarId,
      calendarName: calendarConnections.calendarName,
      accessTokenEncrypted: calendarConnections.accessTokenEncrypted,
      refreshTokenEncrypted: calendarConnections.refreshTokenEncrypted,
      tokenExpiresAt: calendarConnections.tokenExpiresAt,
      encryptionKeyId: calendarConnections.encryptionKeyId,
    })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.shopId, shopId),
        isNull(calendarConnections.deletedAt)
      )
    )
    .limit(1);

  if (!connection) {
    return null;
  }

  // Decrypt tokens
  const accessTokenData = deserializeEncryptedToken(connection.accessTokenEncrypted);
  const refreshTokenData = deserializeEncryptedToken(connection.refreshTokenEncrypted);

  const accessToken = decryptToken(accessTokenData);
  const refreshToken = decryptToken(refreshTokenData);

  return {
    id: connection.id,
    shopId: connection.shopId,
    calendarId: connection.calendarId,
    calendarName: connection.calendarName,
    accessToken,
    refreshToken,
    tokenExpiresAt: connection.tokenExpiresAt,
    encryptionKeyId: connection.encryptionKeyId,
  };
}

/**
 * Refreshes OAuth access token using refresh token.
 *
 * @param connection - Calendar connection with refresh token
 * @returns New access token and expiry time
 */
export async function refreshAccessToken(connection: {
  id: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresAt: Date }> {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: connection.refreshToken,
  });

  try {
    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("No access token in refresh response");
    }

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Encrypt and update in database
    const accessTokenData = encryptToken(credentials.access_token);

    await db
      .update(calendarConnections)
      .set({
        accessTokenEncrypted: serializeEncryptedToken(accessTokenData),
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, connection.id));

    console.log(`[calendar] Token refreshed for connection ${connection.id}`);

    return {
      accessToken: credentials.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error("[calendar] Token refresh failed:", error);
    throw new CalendarEventCreationError("Failed to refresh calendar token", error);
  }
}

/**
 * Gets valid OAuth client with automatic token refresh.
 *
 * @param connection - Calendar connection
 * @returns Configured OAuth2 client with valid access token
 */
async function getAuthClient(connection: {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}) {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  // Check if token expired
  const now = new Date();
  const expiresAt = new Date(connection.tokenExpiresAt);
  const isExpired = expiresAt.getTime() <= now.getTime();

  if (isExpired) {
    console.log(`[calendar] Access token expired, refreshing...`);
    const refreshed = await refreshAccessToken({
      id: connection.id,
      refreshToken: connection.refreshToken,
    });

    oauth2Client.setCredentials({
      access_token: refreshed.accessToken,
      refresh_token: connection.refreshToken,
    });
  } else {
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });
  }

  return oauth2Client;
}

/**
 * Creates a Google Calendar event.
 *
 * @param input - Event creation parameters
 * @returns Google Calendar event ID
 * @throws CalendarEventCreationError if creation fails
 */
export async function createCalendarEvent(input: {
  shopId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  shopName?: string;
  bookingUrl?: string | null;
}): Promise<string> {
  // Load calendar connection
  const connection = await getCalendarConnection(input.shopId);

  if (!connection) {
    throw new NoCalendarConnectionError(input.shopId);
  }

  try {
    // Get authenticated client
    const auth = await getAuthClient(connection);
    const calendar = google.calendar({ version: "v3", auth });

    // Build event
    const event = {
      summary: `Appointment: ${input.customerName}`,
      description: input.bookingUrl
        ? `Booking details: ${input.bookingUrl}`
        : "Appointment booked via booking system",
      location: input.shopName || undefined,
      start: {
        dateTime: input.startsAt.toISOString(),
        timeZone: "UTC", // Calendar API handles timezone conversion
      },
      end: {
        dateTime: input.endsAt.toISOString(),
        timeZone: "UTC",
      },
    };

    // Create event with timeout
    const response = await Promise.race([
      calendar.events.insert({
        calendarId: connection.calendarId,
        requestBody: event,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Calendar API timeout")), 5000)
      ),
    ]);

    if (!response.data.id) {
      throw new Error("No event ID in response");
    }

    console.log(
      `[calendar] Event created: ${response.data.id} for shop ${input.shopId}`
    );

    return response.data.id;
  } catch (error) {
    console.error("[calendar] Event creation failed:", {
      shopId: input.shopId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CalendarEventCreationError("Failed to create calendar event", error);
  }
}

/**
 * Invalidates calendar event cache for a specific date.
 * Called after creating/updating/deleting calendar events.
 *
 * @param shopId - Shop UUID
 * @param date - Date string (YYYY-MM-DD)
 */
export async function invalidateCalendarCache(shopId: string, date: string): Promise<void> {
  try {
    const { getRedisClient } = await import("@/lib/redis");
    const redis = await getRedisClient();

    if (!redis) {
      console.warn("[calendar] Redis not available, skipping cache invalidation");
      return;
    }

    const cacheKey = `calendar:${shopId}:${date}`;
    await redis.del(cacheKey);

    console.log(`[calendar] Cache invalidated: ${cacheKey}`);
  } catch (error) {
    // Graceful degradation - don't fail booking if cache invalidation fails
    console.error("[calendar] Cache invalidation failed:", error);
  }
}
```

---

### Step 2: Integrate Calendar Event Creation into Booking Transaction

**File:** `src/lib/queries/appointments.ts` (update createAppointment function)

**Changes:** Add calendar event creation INSIDE transaction, before commit

```typescript
// Add import at top of file
import {
  createCalendarEvent,
  NoCalendarConnectionError,
  CalendarEventCreationError,
} from "@/lib/google-calendar";
import { invalidateCalendarCache } from "@/lib/google-calendar";
import { formatDateInTimeZone } from "@/lib/booking";

// Inside createAppointment function, after appointment insert (line 628-635)
// Before the return statement (line 673)

export const createAppointment = async (input: {
  // ... existing parameters ...
}) => {
  try {
    const created = await db.transaction(async (tx) => {
      // ... existing code (lines 495-635) ...

      const [appointment] = await tx
        .insert(appointments)
        .values(appointmentValues)
        .returning();

      if (!appointment) {
        throw new Error("Failed to create appointment");
      }

      // ============ V2: CREATE CALENDAR EVENT ============
      let calendarEventId: string | null = null;

      try {
        // Only create calendar event if connection exists
        // Will throw NoCalendarConnectionError if no connection
        // Will throw CalendarEventCreationError if API fails

        const shopName = await tx.query.shops.findFirst({
          where: (table, { eq }) => eq(table.id, input.shopId),
          columns: { name: true },
        });

        calendarEventId = await createCalendarEvent({
          shopId: input.shopId,
          customerName: input.customer.fullName,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          shopName: shopName?.name,
          bookingUrl: bookingUrl ?? null,
        });

        console.log(
          `[booking] Calendar event created: ${calendarEventId} for appointment ${appointment.id}`
        );
      } catch (error) {
        // NoCalendarConnectionError: No connection exists, booking proceeds normally
        if (error instanceof NoCalendarConnectionError) {
          console.log(`[booking] No calendar connection for shop ${input.shopId}, skipping event creation`);
        }
        // CalendarEventCreationError: Connection exists but API failed, rollback transaction
        else if (error instanceof CalendarEventCreationError) {
          console.error(
            `[booking] Calendar event creation failed for shop ${input.shopId}, rolling back appointment`,
            error
          );
          // Transaction will rollback automatically when we throw
          throw error;
        }
        // Unknown error: Also rollback to be safe
        else {
          console.error(
            `[booking] Unexpected error during calendar event creation`,
            error
          );
          throw new CalendarEventCreationError(
            "Unexpected error creating calendar event",
            error
          );
        }
      }

      // Update appointment with calendar event ID if created
      if (calendarEventId) {
        await tx
          .update(appointments)
          .set({ calendarEventId })
          .where(eq(appointments.id, appointment.id));
      }
      // ============ END V2 CHANGES ============

      let payment = null;
      if (paymentRequired) {
        // ... existing payment creation code (lines 638-671) ...
      }

      return {
        appointment: calendarEventId
          ? { ...appointment, calendarEventId }
          : appointment,
        customer,
        payment,
        policyVersion,
        amountCents,
        currency,
        paymentRequired,
        bookingUrl,
        shopTimezone: settings.timezone,
      };
    });

    // ============ V2: INVALIDATE CACHE AFTER TRANSACTION ============
    // Only invalidate if calendar event was created
    if (created.appointment.calendarEventId) {
      try {
        const dateStr = formatDateInTimeZone(
          created.appointment.startsAt,
          created.shopTimezone
        );
        await invalidateCalendarCache(input.shopId, dateStr);
      } catch (error) {
        // Don't fail booking if cache invalidation fails
        console.error("[booking] Failed to invalidate calendar cache:", error);
      }
    }
    // ============ END V2 CHANGES ============

    // ... existing no-show score update (lines 686-695) ...
    // ... existing payment processing (lines 697-790) ...
  } catch (error) {
    // ============ V2: ADD CALENDAR ERROR HANDLING ============
    if (error instanceof CalendarEventCreationError) {
      // Don't expose internal error details to user
      throw new Error("Failed to create booking - calendar sync error");
    }
    // ============ END V2 CHANGES ============

    if (error instanceof SlotTakenError) {
      return Response.json({ error: "Slot taken" }, { status: 409 });
    }
    // ... existing error handlers ...
  }
};
```

---

### Step 3: Update Booking API Route Error Handling

**File:** `src/app/api/bookings/create/route.ts` (update error handling)

**Changes:** Add specific error message for calendar sync failures

```typescript
export async function POST(req: Request) {
  // ... existing code (lines 34-126) ...

  try {
    // ... existing createAppointment call (lines 87-92) ...
    // ... existing return statement (lines 95-127) ...
  } catch (error) {
    // ============ V2: ADD CALENDAR ERROR HANDLING ============
    // Check if error message indicates calendar sync failure
    if (error instanceof Error && error.message.includes("calendar sync error")) {
      return Response.json(
        {
          error: "Failed to create booking",
          details: "Could not sync with calendar. Please try again or contact support."
        },
        { status: 500 }
      );
    }
    // ============ END V2 CHANGES ============

    if (error instanceof SlotTakenError) {
      return Response.json({ error: "Slot taken" }, { status: 409 });
    }

    // ... existing error handlers (lines 133-144) ...
  }
}
```

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/google-calendar.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCalendarEvent,
  refreshAccessToken,
  getCalendarConnection,
  invalidateCalendarCache,
  CalendarEventCreationError,
  NoCalendarConnectionError,
} from "@/lib/google-calendar";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/schema";
import { google } from "googleapis";

vi.mock("googleapis");
vi.mock("@/lib/db");
vi.mock("@/lib/google-calendar-encryption");
vi.mock("@/lib/redis");

describe("Google Calendar Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCalendarConnection", () => {
    it("should return null if no connection exists", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await getCalendarConnection("shop-123");
      expect(result).toBeNull();
    });

    it("should return decrypted connection if exists", async () => {
      const mockConnection = {
        id: "conn-123",
        shopId: "shop-123",
        calendarId: "primary",
        calendarName: "My Calendar",
        accessTokenEncrypted: '{"encrypted":"mock","iv":"mock","authTag":"mock","salt":"mock"}',
        refreshTokenEncrypted: '{"encrypted":"mock","iv":"mock","authTag":"mock","salt":"mock"}',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyId: "default",
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConnection]),
          }),
        }),
      } as any);

      const mockDecrypt = await import("@/lib/google-calendar-encryption");
      vi.spyOn(mockDecrypt, "deserializeEncryptedToken").mockReturnValue({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      });
      vi.spyOn(mockDecrypt, "decryptToken").mockReturnValue("decrypted_token");

      const result = await getCalendarConnection("shop-123");

      expect(result).toBeTruthy();
      expect(result?.id).toBe("conn-123");
      expect(result?.accessToken).toBe("decrypted_token");
      expect(result?.refreshToken).toBe("decrypted_token");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh token and update database", async () => {
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: {
            access_token: "new_access_token",
            expiry_date: Date.now() + 3600000,
          },
        }),
      };

      vi.spyOn(google.auth, "OAuth2").mockReturnValue(mockOAuth2Client as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.spyOn(db, "update").mockReturnValue(mockUpdate() as any);

      const result = await refreshAccessToken({
        id: "conn-123",
        refreshToken: "refresh_token",
      });

      expect(result.accessToken).toBe("new_access_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should throw CalendarEventCreationError on refresh failure", async () => {
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockRejectedValue(new Error("Refresh failed")),
      };

      vi.spyOn(google.auth, "OAuth2").mockReturnValue(mockOAuth2Client as any);

      await expect(
        refreshAccessToken({
          id: "conn-123",
          refreshToken: "refresh_token",
        })
      ).rejects.toThrow(CalendarEventCreationError);
    });
  });

  describe("createCalendarEvent", () => {
    it("should create event with correct payload", async () => {
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

      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: "event-123" },
      });

      const mockCalendar = {
        events: {
          insert: mockInsert,
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      const eventId = await createCalendarEvent({
        shopId: "shop-123",
        customerName: "John Doe",
        startsAt: new Date("2024-03-20T10:00:00Z"),
        endsAt: new Date("2024-03-20T11:00:00Z"),
        shopName: "Test Shop",
        bookingUrl: "https://example.com/book",
      });

      expect(eventId).toBe("event-123");
      expect(mockInsert).toHaveBeenCalledWith({
        calendarId: "primary",
        requestBody: expect.objectContaining({
          summary: "Appointment: John Doe",
          description: expect.stringContaining("https://example.com/book"),
          location: "Test Shop",
        }),
      });
    });

    it("should throw NoCalendarConnectionError if no connection", async () => {
      vi.spyOn({ getCalendarConnection }, "getCalendarConnection").mockResolvedValue(
        null
      );

      await expect(
        createCalendarEvent({
          shopId: "shop-123",
          customerName: "John Doe",
          startsAt: new Date(),
          endsAt: new Date(),
        })
      ).rejects.toThrow(NoCalendarConnectionError);
    });

    it("should throw CalendarEventCreationError on API failure", async () => {
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

      const mockInsert = vi.fn().mockRejectedValue(new Error("API error"));

      const mockCalendar = {
        events: {
          insert: mockInsert,
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      await expect(
        createCalendarEvent({
          shopId: "shop-123",
          customerName: "John Doe",
          startsAt: new Date(),
          endsAt: new Date(),
        })
      ).rejects.toThrow(CalendarEventCreationError);
    });

    it("should timeout after 5 seconds", async () => {
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

      const mockInsert = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const mockCalendar = {
        events: {
          insert: mockInsert,
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      await expect(
        createCalendarEvent({
          shopId: "shop-123",
          customerName: "John Doe",
          startsAt: new Date(),
          endsAt: new Date(),
        })
      ).rejects.toThrow(CalendarEventCreationError);
    }, 6000);
  });

  describe("invalidateCalendarCache", () => {
    it("should delete Redis cache key", async () => {
      const mockDel = vi.fn().mockResolvedValue(1);
      const mockRedis = { del: mockDel };

      const redisModule = await import("@/lib/redis");
      vi.spyOn(redisModule, "getRedisClient").mockResolvedValue(mockRedis as any);

      await invalidateCalendarCache("shop-123", "2024-03-20");

      expect(mockDel).toHaveBeenCalledWith("calendar:shop-123:2024-03-20");
    });

    it("should gracefully handle Redis unavailable", async () => {
      const redisModule = await import("@/lib/redis");
      vi.spyOn(redisModule, "getRedisClient").mockResolvedValue(null);

      // Should not throw
      await expect(
        invalidateCalendarCache("shop-123", "2024-03-20")
      ).resolves.toBeUndefined();
    });

    it("should gracefully handle Redis errors", async () => {
      const mockDel = vi.fn().mockRejectedValue(new Error("Redis error"));
      const mockRedis = { del: mockDel };

      const redisModule = await import("@/lib/redis");
      vi.spyOn(redisModule, "getRedisClient").mockResolvedValue(mockRedis as any);

      // Should not throw
      await expect(
        invalidateCalendarCache("shop-123", "2024-03-20")
      ).resolves.toBeUndefined();
    });
  });
});
```

---

### Integration Tests

**File:** `src/lib/queries/__tests__/appointments-calendar.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  createAppointment,
  SlotTakenError,
  InvalidSlotError,
} from "@/lib/queries/appointments";
import {
  shops,
  bookingSettings,
  shopHours,
  calendarConnections,
  appointments,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import * as calendarModule from "@/lib/google-calendar";

vi.mock("@/lib/google-calendar");

describe("createAppointment with Calendar Integration", () => {
  let testShopId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Calendar Test Shop",
        slug: "calendar-test",
        currency: "USD",
        ownerId: "owner-calendar-test",
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
      dayOfWeek: 1, // Monday
      openTime: "09:00",
      closeTime: "17:00",
    });
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(shopHours).where(eq(shopHours.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should create appointment with calendar event when connection exists", async () => {
    // Mock calendar event creation
    vi.spyOn(calendarModule, "createCalendarEvent").mockResolvedValue("event-123");
    vi.spyOn(calendarModule, "invalidateCalendarCache").mockResolvedValue();

    const startsAt = new Date("2024-03-25T10:00:00Z"); // Monday

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@example.com",
        smsOptIn: true,
      },
      paymentsEnabled: false,
    });

    expect(result.appointment.calendarEventId).toBe("event-123");
    expect(calendarModule.createCalendarEvent).toHaveBeenCalledWith({
      shopId: testShopId,
      customerName: "Test Customer",
      startsAt: expect.any(Date),
      endsAt: expect.any(Date),
      shopName: "Calendar Test Shop",
      bookingUrl: null,
    });
    expect(calendarModule.invalidateCalendarCache).toHaveBeenCalled();
  });

  it("should create appointment without calendar event when no connection", async () => {
    // Mock no calendar connection
    vi.spyOn(calendarModule, "createCalendarEvent").mockRejectedValue(
      new calendarModule.NoCalendarConnectionError(testShopId)
    );

    const startsAt = new Date("2024-03-25T10:00:00Z");

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@example.com",
      },
      paymentsEnabled: false,
    });

    expect(result.appointment.calendarEventId).toBeNull();
    expect(result.appointment.id).toBeTruthy();
  });

  it("should rollback appointment if calendar event creation fails", async () => {
    // Mock calendar event creation failure
    vi.spyOn(calendarModule, "createCalendarEvent").mockRejectedValue(
      new calendarModule.CalendarEventCreationError("API error")
    );

    const startsAt = new Date("2024-03-25T10:00:00Z");

    await expect(
      createAppointment({
        shopId: testShopId,
        startsAt,
        customer: {
          fullName: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
        paymentsEnabled: false,
      })
    ).rejects.toThrow("calendar sync error");

    // Verify no appointment created
    const appointmentExists = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.shopId, testShopId),
    });

    expect(appointmentExists).toBeUndefined();
  });

  it("should store calendar event ID in database", async () => {
    vi.spyOn(calendarModule, "createCalendarEvent").mockResolvedValue("event-456");
    vi.spyOn(calendarModule, "invalidateCalendarCache").mockResolvedValue();

    const startsAt = new Date("2024-03-25T14:00:00Z");

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@example.com",
      },
      paymentsEnabled: false,
    });

    // Query database directly
    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, result.appointment.id),
    });

    expect(appointment?.calendarEventId).toBe("event-456");
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/booking-with-calendar.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  shopHours,
  calendarConnections,
  appointments,
  customers,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Booking with Google Calendar Integration", () => {
  let testShopId: string;
  let testShopSlug: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Calendar Shop",
        slug: "e2e-calendar",
        currency: "USD",
        ownerId: "owner-e2e-calendar",
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

    // Create shop hours (all days open)
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
    // Cleanup
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(shopHours).where(eq(shopHours.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("should create calendar event when booking appointment", async ({ page, context }) => {
    // Mock Google Calendar API
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().url().includes("/calendar/v3/calendars/")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "mock-event-123",
            summary: "Appointment: John Doe",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');

    // Wait for slots to load
    await page.waitForSelector('button[data-slot]');

    // Select first available slot
    await page.click('button[data-slot]:first-child');

    // Fill customer information
    await page.fill('input[name="fullName"]', "John Doe");
    await page.fill('input[name="phone"]', "+15551234567");
    await page.fill('input[name="email"]', "john@example.com");

    // Submit booking
    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Wait for success message
    await page.waitForSelector('text=Appointment booked successfully');

    // Verify calendar event ID stored in database
    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.shopId, testShopId),
      orderBy: (table, { desc }) => desc(table.createdAt),
    });

    expect(appointment).toBeTruthy();
    expect(appointment?.calendarEventId).toBe("mock-event-123");
  });

  test("should show error if calendar API fails", async ({ page, context }) => {
    // Mock Google Calendar API failure
    await context.route("https://www.googleapis.com/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Select tomorrow's date and slot (same as above)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');
    await page.waitForSelector('button[data-slot]');
    await page.click('button[data-slot]:first-child');

    await page.fill('input[name="fullName"]', "Jane Doe");
    await page.fill('input[name="phone"]', "+15559876543");
    await page.fill('input[name="email"]', "jane@example.com");

    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Wait for error message
    await page.waitForSelector('text=calendar sync error');

    // Verify no appointment created
    const appointmentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.shopId, testShopId));

    expect(appointmentCount[0]?.count).toBe(0);
  });

  test("should work without calendar connection", async ({ page }) => {
    // Delete calendar connection
    await db
      .delete(calendarConnections)
      .where(eq(calendarConnections.shopId, testShopId));

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Complete booking (same flow as above)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');
    await page.waitForSelector('button[data-slot]');
    await page.click('button[data-slot]:first-child');

    await page.fill('input[name="fullName"]', "Bob Smith");
    await page.fill('input[name="phone"]', "+15555555555");
    await page.fill('input[name="email"]', "bob@example.com");

    await page.click('button[type="submit"]:has-text("Book Appointment")');

    // Should succeed without calendar event
    await page.waitForSelector('text=Appointment booked successfully');

    // Verify appointment created without calendar event ID
    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.shopId, testShopId),
    });

    expect(appointment).toBeTruthy();
    expect(appointment?.calendarEventId).toBeNull();
  });
});
```

---

## Regression Prevention

### Critical Test Files to Monitor

Run these tests after implementing V2 to ensure no regression:

```bash
# Unit tests - Booking logic
pnpm test src/lib/__tests__/booking.test.ts

# Integration tests - Appointment creation
pnpm test src/lib/queries/__tests__/appointments.test.ts

# E2E tests - Booking flow
pnpm test:e2e tests/e2e/booking.spec.ts
pnpm test:e2e tests/e2e/payment-flow.spec.ts
pnpm test:e2e tests/e2e/manage-booking.spec.ts

# E2E tests - Tier system (uses createAppointment)
pnpm test:e2e tests/e2e/tier-system-full-flow.spec.ts

# All unit tests
pnpm test

# All E2E tests
pnpm test:e2e
```

### Mock Strategy for Existing Tests

To prevent regression, existing tests need calendar mocking:

**Pattern for unit tests:**
```typescript
vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: vi.fn().mockResolvedValue(null),
  NoCalendarConnectionError: class NoCalendarConnectionError extends Error {},
  CalendarEventCreationError: class CalendarEventCreationError extends Error {},
  invalidateCalendarCache: vi.fn().mockResolvedValue(undefined),
}));
```

**Pattern for integration tests:**
```typescript
beforeEach(() => {
  // Mock calendar module to prevent actual API calls
  vi.mock("@/lib/google-calendar");
});
```

**Expected behavior:**
- Existing booking tests pass without modification
- Calendar module mocked to return `NoCalendarConnectionError`
- Bookings proceed normally (calendar event creation skipped)
- No network calls to Google Calendar API

---

## Implementation Checklist

### Database & Schema

- [ ] Create `drizzle/0017_appointment_calendar_event.sql` migration
- [ ] Add `calendarEventId` column to appointments table
- [ ] Update `src/lib/schema.ts` with new column and index
- [ ] Run `pnpm db:generate` to verify migration
- [ ] Run `pnpm db:migrate` to apply migration
- [ ] Verify schema with `pnpm db:studio`

### Core Services

- [ ] Create `src/lib/google-calendar.ts`
- [ ] Implement `getCalendarConnection()` function
- [ ] Implement `refreshAccessToken()` function
- [ ] Implement `getAuthClient()` helper
- [ ] Implement `createCalendarEvent()` function
- [ ] Implement `invalidateCalendarCache()` function
- [ ] Define custom error classes: `CalendarEventCreationError`, `NoCalendarConnectionError`

### Booking Integration

- [ ] Update `src/lib/queries/appointments.ts`
- [ ] Add calendar event creation inside transaction
- [ ] Add calendar event ID update
- [ ] Add cache invalidation after transaction
- [ ] Update error handling for calendar failures
- [ ] Update `src/app/api/bookings/create/route.ts` error messages

### Dependencies

- [ ] Verify `googleapis` package installed (from V1)
- [ ] No additional dependencies needed

### Testing

- [ ] Create `src/lib/__tests__/google-calendar.test.ts`
- [ ] Write unit tests for `getCalendarConnection()`
- [ ] Write unit tests for `refreshAccessToken()`
- [ ] Write unit tests for `createCalendarEvent()`
- [ ] Write unit tests for `invalidateCalendarCache()`
- [ ] Create `src/lib/queries/__tests__/appointments-calendar.test.ts`
- [ ] Write integration test for booking with calendar
- [ ] Write integration test for booking without calendar
- [ ] Write integration test for transaction rollback
- [ ] Create `tests/e2e/booking-with-calendar.spec.ts`
- [ ] Write E2E test for successful calendar event creation
- [ ] Write E2E test for calendar API failure
- [ ] Write E2E test for booking without connection
- [ ] Add calendar mocks to existing booking tests
- [ ] Run all tests: `pnpm test && pnpm test:e2e`
- [ ] Verify no regression in existing tests

### Code Quality

- [ ] Run `pnpm lint` and fix all errors
- [ ] Run `pnpm typecheck` and fix all errors
- [ ] Review error handling in calendar service
- [ ] Add logging for debugging
- [ ] Sanitize logs (no tokens logged)
- [ ] Add code comments for complex logic

### Documentation

- [ ] Update README.md with calendar sync information
- [ ] Update CLAUDE.md with V2 implementation notes
- [ ] Add inline comments to calendar service
- [ ] Document transaction flow changes
- [ ] Add troubleshooting section

### Manual Testing

- [ ] Test booking with calendar connection (mock API)
- [ ] Test booking without calendar connection
- [ ] Test token refresh flow
- [ ] Test calendar API timeout
- [ ] Test transaction rollback on failure
- [ ] Verify event created in Google Calendar (real API)
- [ ] Verify cache invalidation works
- [ ] Verify error messages user-friendly

---

## Demo Script

### Preparation

1. Complete V1 (OAuth connection must exist)
2. Start dev server: `pnpm dev`
3. Connect Google Calendar (V1 flow)
4. Open browser to booking page

### Demo Flow (with Mock API)

1. **Navigate to Booking Page**
   - Go to `/book/{shop-slug}`
   - Select tomorrow's date
   - Click "Check Availability"

2. **Book Appointment**
   - Select first available slot (e.g., 10:00 AM)
   - Fill customer details:
     - Name: "Test Customer"
     - Phone: "+15551234567"
     - Email: "test@example.com"
   - Click "Book Appointment"

3. **Verify Success**
   - See success message
   - Appointment confirmed

4. **Check Database**
   - Open Drizzle Studio: `pnpm db:studio`
   - Navigate to `appointments` table
   - Find latest appointment
   - Verify `calendar_event_id` column populated

5. **Check Google Calendar (Real API)**
   - Open Google Calendar
   - Navigate to selected date
   - See new event: "Appointment: Test Customer"
   - Event time matches booking

### Demo Flow (Error Scenario)

1. **Simulate API Failure**
   - Mock Google Calendar API to return 500 error

2. **Attempt Booking**
   - Follow same booking flow as above

3. **Verify Error Handling**
   - See error message: "calendar sync error"
   - Booking NOT created

4. **Check Database**
   - Open Drizzle Studio
   - Verify NO appointment created (transaction rolled back)

### Demo Flow (No Connection)

1. **Disconnect Calendar**
   - Go to `/app/settings/calendar`
   - Click "Disconnect Calendar"

2. **Book Appointment**
   - Follow normal booking flow
   - Should succeed without error

3. **Verify**
   - Appointment created
   - `calendar_event_id` is NULL
   - No Google Calendar event created

---

## Known Limitations (V2)

1. **Event Updates Not Supported** - Updating appointment time doesn't update event (V2.1 feature)
2. **Event Deletion Not Implemented** - Cancelled appointments don't delete events (V5 will add)
3. **No Conflict Detection** - Events don't block booking slots yet (V3 will add)
4. **Synchronous API Calls** - Calendar API called during booking (adds latency)
5. **No Retry Logic** - API failures cause immediate rollback (V2.1 enhancement)
6. **Limited Error Details** - Generic error messages to users (security trade-off)

---

## Success Criteria

V2 is complete when:

✅ Calendar event created when customer books appointment
✅ Event ID stored in `appointments.calendarEventId` column
✅ Token refresh works when access token expired
✅ Transaction rolls back if calendar event creation fails
✅ Cache invalidated after successful event creation
✅ Booking works normally when no calendar connection exists
✅ All unit tests pass (calendar service, token refresh)
✅ All integration tests pass (booking with calendar)
✅ All Playwright E2E tests pass
✅ No regression in existing booking tests
✅ No regression in payment flow tests
✅ Code quality checks pass (lint, typecheck)
✅ Documentation updated (README, CLAUDE.md)
✅ Manual testing confirms event creation in Google Calendar

---

## Estimated Timeline

**Total: 2-3 days**

- **Day 1:** Database migration, calendar service, token refresh (6 hours)
- **Day 2:** Booking integration, transaction updates, unit tests (8 hours)
- **Day 3:** Integration tests, E2E tests, manual testing, polish (6 hours)

**Buffer:** 0.5 days for debugging calendar API issues, transaction edge cases

---

## Rollback Plan

If V2 needs to be rolled back:

1. **Database Rollback:**
   ```sql
   ALTER TABLE appointments DROP COLUMN calendar_event_id;
   DROP INDEX idx_appointments_calendar_event_id;
   ```

2. **Code Rollback:**
   - Remove `src/lib/google-calendar.ts`
   - Revert changes in `src/lib/queries/appointments.ts`
   - Revert changes in `src/app/api/bookings/create/route.ts`
   - Remove test files: `src/lib/__tests__/google-calendar.test.ts`, etc.

3. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All existing functionality should remain unchanged.

---

## Next Steps After V2

**V3: Block Conflicting Slots**
- Fetch calendar events in availability API
- Filter slots that overlap with calendar events
- Implement Redis caching (180s TTL)
- Handle all-day events

**Prerequisites from V2:**
- Calendar event creation working
- Token refresh logic in place
- Error handling patterns established
