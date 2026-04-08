# V3: Block Conflicting Slots - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 2-3 days
**Dependencies:** V1 (OAuth), V2 (calendar event creation)
**Demo:** Calendar events automatically block booking slots in availability API

---

## Overview

V3 integrates calendar event fetching into the availability API. When customers view available booking slots, the system fetches events from the shop owner's Google Calendar and excludes any overlapping time slots. This prevents double-bookings and ensures calendar events are respected.

### Goal

Prevent customers from booking slots that conflict with calendar events:
1. **Fetch** calendar events from Google Calendar API
2. **Cache** events in Redis with 180-second TTL
3. **Filter** slots that overlap with calendar events
4. **Block** entire day for all-day events
5. **Degrade gracefully** when Redis unavailable or calendar API fails

This slice establishes the foundation for conflict detection (V4 will prevent booking conflicts at submission time).

---

## Current State Analysis

### Existing Availability Flow

**File:** `src/lib/queries/appointments.ts:122-195`

**Current Flow:**
1. Load booking settings (timezone, slot duration)
2. Return empty if date is in the past
3. Load shop hours for day of week
4. Generate all possible slots for the day
5. Query database for booked appointments
6. Filter out booked slots
7. Filter out past slots if today
8. Return available slots

**Current Filtering:**
```typescript
slots.filter((slot) => {
  if (bookedTimes.has(slot.startsAt.getTime())) return false; // Existing bookings
  if (!isToday) return true;
  return slot.startsAt.getTime() > now.getTime(); // Past times
})
```

**Missing:**
- No calendar event fetching
- No calendar event filtering
- No caching layer

### Existing Infrastructure

**Redis Client (V1):**
- Upstash Redis configured
- `getRedisClient()` helper available
- SET/GET operations with TTL support

**Calendar Connection (V1):**
- `getCalendarConnection()` loads connection for shop
- OAuth tokens decrypted on demand
- Token refresh logic available (V2)

**Calendar Event Creation (V2):**
- `createCalendarEvent()` creates events
- `invalidateCalendarCache()` clears cache (stub)
- Error handling patterns established

### What's Missing (to be built)

1. **Calendar event fetching** - Query Google Calendar API for events
2. **Cache layer** - Store fetched events in Redis with TTL
3. **Conflict detection logic** - Identify slot/event overlaps
4. **All-day event handling** - Block entire day for all-day events
5. **Availability integration** - Modify `getAvailabilityForDate()` to filter calendar conflicts

---

## Requirements

### Functional Requirements

**FR1: Fetch Calendar Events**
- Fetch events for specific date range from Google Calendar API
- Query time range: start of day to end of day (shop timezone)
- Include event fields: id, summary, start, end
- Handle pagination (though single day unlikely to have many events)
- Timeout after 3 seconds

**FR2: Cache Calendar Events**
- Store fetched events in Redis
- Cache key format: `calendar:events:{shopId}:{date}`
- TTL: 180 seconds (3 minutes)
- Serialize events as JSON
- Return cached data if available and not expired

**FR3: Filter Overlapping Slots**
- Exclude slots where slot start time overlaps with event
- Overlap definition: event starts before slot ends AND event ends after slot starts
- Handle partial overlaps (e.g., 60-minute slot, 30-minute event overlap)
- Preserve slot order after filtering

**FR4: Handle All-Day Events**
- Detect all-day events (no time component, only date)
- Block entire day if all-day event exists
- Return empty slots array for that date
- Log all-day event detection

**FR5: Graceful Degradation**
- If no calendar connection exists → return availability normally (no filtering)
- If Redis unavailable → fetch directly from API (no caching)
- If Google Calendar API fails → return availability without calendar filtering (log error)
- Availability API NEVER fails due to calendar issues

**FR6: Cache Invalidation**
- V2's `invalidateCalendarCache()` already implemented
- Invalidates cache when event created
- Uses same cache key format

### Non-Functional Requirements

**NFR1: Performance**
- Cache hit: <10ms overhead
- Cache miss: <500ms overhead (API call)
- Redis unavailable: <500ms overhead (direct API call)
- No blocking of availability API

**NFR2: Reliability**
- 99.9% uptime (independent of calendar API)
- Graceful degradation on all failures
- No customer-facing errors from calendar issues
- Comprehensive error logging

**NFR3: Caching Strategy**
- 180-second TTL balances freshness vs. API quota
- Cache per shop per date (fine-grained invalidation)
- Serialize minimal event data (reduce Redis memory)
- Automatic expiration (no manual cleanup needed)

**NFR4: Data Consistency**
- Cache invalidation ensures fresh data after event creation
- Stale cache max duration: 180 seconds
- Acceptable trade-off for performance

---

## Implementation Steps

### Step 1: Calendar Event Fetching Service

**File:** `src/lib/google-calendar-cache.ts` (new file)

**Purpose:** Fetch calendar events with Redis caching layer

```typescript
import { google } from "googleapis";
import { getRedisClient } from "@/lib/redis";
import { getCalendarConnection } from "@/lib/google-calendar";
import { getDayStartEndUtc } from "@/lib/booking";

/**
 * Google Calendar event (simplified).
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string; // RFC3339 timestamp
    date?: string;     // YYYY-MM-DD for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

/**
 * Checks if an event is all-day.
 */
export function isAllDayEvent(event: CalendarEvent): boolean {
  // All-day events have only 'date' field, no 'dateTime'
  return !!event.start.date && !event.start.dateTime;
}

/**
 * Fetches calendar events directly from Google Calendar API.
 *
 * @param shopId - Shop UUID
 * @param date - Date string (YYYY-MM-DD)
 * @param timezone - Shop timezone (e.g., "America/New_York")
 * @returns Array of calendar events
 */
async function fetchFromGoogleAPI(
  shopId: string,
  date: string,
  timezone: string
): Promise<CalendarEvent[]> {
  const connection = await getCalendarConnection(shopId);

  if (!connection) {
    // No calendar connection, return empty array
    return [];
  }

  try {
    // Get day boundaries in UTC
    const { start, end } = getDayStartEndUtc(date, timezone);

    // Get authenticated client (handles token refresh)
    const { getAuthClient } = await import("@/lib/google-calendar");
    const auth = await getAuthClient({
      id: connection.id,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Fetch events for the date range
    const response = await Promise.race([
      calendar.events.list({
        calendarId: connection.calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true, // Expand recurring events
        orderBy: "startTime",
        maxResults: 250, // Should be enough for a single day
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Calendar API timeout")), 3000)
      ),
    ]);

    const events = (response.data.items || []).map((item) => ({
      id: item.id!,
      summary: item.summary || "Busy",
      start: {
        dateTime: item.start?.dateTime,
        date: item.start?.date,
        timeZone: item.start?.timeZone,
      },
      end: {
        dateTime: item.end?.dateTime,
        date: item.end?.date,
        timeZone: item.end?.timeZone,
      },
    }));

    console.log(
      `[calendar-cache] Fetched ${events.length} events for shop ${shopId} on ${date}`
    );

    return events;
  } catch (error) {
    console.error(
      `[calendar-cache] Failed to fetch events for shop ${shopId} on ${date}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Fetches calendar events with Redis caching.
 *
 * Cache key: `calendar:events:{shopId}:{date}`
 * TTL: 180 seconds
 *
 * @param shopId - Shop UUID
 * @param date - Date string (YYYY-MM-DD)
 * @param timezone - Shop timezone
 * @returns Array of calendar events
 */
export async function fetchCalendarEventsWithCache(
  shopId: string,
  date: string,
  timezone: string
): Promise<CalendarEvent[]> {
  const cacheKey = `calendar:events:${shopId}:${date}`;

  try {
    const redis = getRedisClient();

    // Try to get from cache
    const cached = await redis.get<CalendarEvent[]>(cacheKey);

    if (cached) {
      console.log(`[calendar-cache] Cache hit for ${cacheKey}`);
      return cached;
    }

    console.log(`[calendar-cache] Cache miss for ${cacheKey}`);

    // Fetch from API
    const events = await fetchFromGoogleAPI(shopId, date, timezone);

    // Cache the result
    await redis.setex(cacheKey, 180, JSON.stringify(events));

    return events;
  } catch (redisError) {
    // Redis unavailable, fetch directly from API
    console.warn(
      `[calendar-cache] Redis unavailable, fetching directly from API:`,
      redisError instanceof Error ? redisError.message : "Unknown error"
    );

    return await fetchFromGoogleAPI(shopId, date, timezone);
  }
}

/**
 * Filters slots to exclude conflicts with calendar events.
 *
 * @param slots - Available slots
 * @param events - Calendar events
 * @returns Slots that don't conflict with events
 */
export function filterSlotsForConflicts(
  slots: { startsAt: Date; endsAt: Date }[],
  events: CalendarEvent[]
): { startsAt: Date; endsAt: Date }[] {
  // Check for all-day events first
  const hasAllDayEvent = events.some(isAllDayEvent);

  if (hasAllDayEvent) {
    console.log("[calendar-cache] All-day event found, blocking entire day");
    return []; // Block entire day
  }

  // Filter out slots that overlap with events
  return slots.filter((slot) => {
    const slotStart = slot.startsAt.getTime();
    const slotEnd = slot.endsAt.getTime();

    for (const event of events) {
      // Skip all-day events (already handled)
      if (isAllDayEvent(event)) {
        continue;
      }

      // Parse event times
      const eventStartStr = event.start.dateTime;
      const eventEndStr = event.end.dateTime;

      if (!eventStartStr || !eventEndStr) {
        // Invalid event, skip
        continue;
      }

      const eventStart = new Date(eventStartStr).getTime();
      const eventEnd = new Date(eventEndStr).getTime();

      // Check for overlap
      // Overlap exists if: event starts before slot ends AND event ends after slot starts
      const overlaps = eventStart < slotEnd && eventEnd > slotStart;

      if (overlaps) {
        console.log(
          `[calendar-cache] Slot ${slot.startsAt.toISOString()} conflicts with event "${event.summary}"`
        );
        return false; // Exclude this slot
      }
    }

    return true; // No conflicts, include slot
  });
}
```

**Key Design Decisions:**
- **Graceful degradation:** Returns empty array on errors (availability continues working)
- **All-day event detection:** Uses presence of `date` field vs `dateTime`
- **Overlap logic:** Standard interval overlap algorithm
- **Timeout:** 3-second timeout prevents slow API calls from blocking
- **Cache key format:** Matches V2's invalidation key format

---

### Step 2: Export getAuthClient Helper

**File:** `src/lib/google-calendar.ts` (update)

**Purpose:** Make `getAuthClient` available to cache module

Currently `getAuthClient` is private. Export it for use in cache module:

```typescript
/**
 * Gets valid OAuth client with automatic token refresh.
 * Exported for use in cache module.
 *
 * @param connection - Calendar connection
 * @returns Configured OAuth2 client with valid access token
 */
export async function getAuthClient(connection: {
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
```

**Changes:**
- Change function from `async function getAuthClient` to `export async function getAuthClient`
- Add JSDoc comment noting it's exported for cache module

---

### Step 3: Integrate Calendar Filtering into Availability API

**File:** `src/lib/queries/appointments.ts` (update getAvailabilityForDate)

**Purpose:** Add calendar event filtering to availability logic

```typescript
// Add import at top of file
import {
  fetchCalendarEventsWithCache,
  filterSlotsForConflicts,
} from "@/lib/google-calendar-cache";

export const getAvailabilityForDate = async (
  shopId: string,
  dateStr: string
): Promise<Availability> => {
  const settings = await getBookingSettingsForShop(shopId);
  if (!settings) {
    throw new Error("Booking settings not found");
  }

  const todayStr = formatDateInTimeZone(new Date(), settings.timezone);
  if (dateStr < todayStr) {
    return {
      date: dateStr,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      slots: [],
    };
  }

  const dayStartUtc = getDayStartEndUtc(dateStr, settings.timezone).start;
  const dayOfWeek = toZonedTime(dayStartUtc, settings.timezone).getDay();
  const hours = await db.query.shopHours.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.shopId, shopId), eq(table.dayOfWeek, dayOfWeek)),
  });

  if (!hours) {
    return {
      date: dateStr,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      slots: [],
    };
  }

  const slots = generateSlotsForDate({
    dateStr,
    timeZone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    openTime: hours.openTime,
    closeTime: hours.closeTime,
  });

  const { start, end } = getDayStartEndUtc(dateStr, settings.timezone);
  const bookedSlots = await db
    .select({ startsAt: appointments.startsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.startsAt, start),
        lt(appointments.startsAt, end),
        inArray(appointments.status, ["booked", "pending"])
      )
    );

  const bookedTimes = new Set(
    bookedSlots.map((slot) => slot.startsAt.getTime())
  );

  const now = new Date();
  const isToday = dateStr === todayStr;

  // ============ V3: FILTER CALENDAR EVENT CONFLICTS ============
  let availableSlots = slots.filter((slot) => {
    if (bookedTimes.has(slot.startsAt.getTime())) return false;
    if (!isToday) return true;
    return slot.startsAt.getTime() > now.getTime();
  });

  // Fetch calendar events and filter conflicts
  try {
    const calendarEvents = await fetchCalendarEventsWithCache(
      shopId,
      dateStr,
      settings.timezone
    );

    if (calendarEvents.length > 0) {
      availableSlots = filterSlotsForConflicts(availableSlots, calendarEvents);
      console.log(
        `[availability] Filtered ${slots.length - availableSlots.length} slots due to calendar conflicts`
      );
    }
  } catch (error) {
    // Graceful degradation: if calendar filtering fails, return slots without calendar filtering
    console.error(
      `[availability] Calendar filtering failed for shop ${shopId} on ${dateStr}, returning unfiltered slots:`,
      error
    );
  }
  // ============ END V3 CHANGES ============

  return {
    date: dateStr,
    timezone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    slots: availableSlots,
  };
};
```

**Key Changes:**
1. Import calendar cache functions
2. Apply existing filters first (booked appointments, past times)
3. Fetch calendar events from cache
4. Filter out conflicting slots
5. Wrap in try-catch for graceful degradation
6. Return filtered slots

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/google-calendar-cache.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchCalendarEventsWithCache,
  filterSlotsForConflicts,
  isAllDayEvent,
  CalendarEvent,
} from "@/lib/google-calendar-cache";
import * as redisModule from "@/lib/redis";
import * as calendarModule from "@/lib/google-calendar";
import { google } from "googleapis";

vi.mock("@/lib/redis");
vi.mock("@/lib/google-calendar");
vi.mock("googleapis");

describe("Calendar Event Caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAllDayEvent", () => {
    it("should return true for all-day events", () => {
      const event: CalendarEvent = {
        id: "event-1",
        summary: "All Day Event",
        start: { date: "2024-03-20" },
        end: { date: "2024-03-21" },
      };

      expect(isAllDayEvent(event)).toBe(true);
    });

    it("should return false for timed events", () => {
      const event: CalendarEvent = {
        id: "event-2",
        summary: "Timed Event",
        start: { dateTime: "2024-03-20T10:00:00Z" },
        end: { dateTime: "2024-03-20T11:00:00Z" },
      };

      expect(isAllDayEvent(event)).toBe(false);
    });
  });

  describe("fetchCalendarEventsWithCache", () => {
    it("should return cached events on cache hit", async () => {
      const mockEvents: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "Meeting",
          start: { dateTime: "2024-03-20T10:00:00Z" },
          end: { dateTime: "2024-03-20T11:00:00Z" },
        },
      ];

      const mockRedis = {
        get: vi.fn().mockResolvedValue(mockEvents),
        setex: vi.fn(),
      };

      vi.spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);

      const result = await fetchCalendarEventsWithCache(
        "shop-123",
        "2024-03-20",
        "America/New_York"
      );

      expect(result).toEqual(mockEvents);
      expect(mockRedis.get).toHaveBeenCalledWith("calendar:events:shop-123:2024-03-20");
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and cache result", async () => {
      const mockEvents: CalendarEvent[] = [
        {
          id: "event-2",
          summary: "Appointment",
          start: { dateTime: "2024-03-20T14:00:00Z" },
          end: { dateTime: "2024-03-20T15:00:00Z" },
        },
      ];

      const mockRedis = {
        get: vi.fn().mockResolvedValue(null), // Cache miss
        setex: vi.fn().mockResolvedValue("OK"),
      };

      vi.spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);

      // Mock calendar connection
      vi.spyOn(calendarModule, "getCalendarConnection").mockResolvedValue({
        id: "conn-123",
        shopId: "shop-123",
        calendarId: "primary",
        calendarName: "My Calendar",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyId: "default",
      } as any);

      // Mock getAuthClient
      const mockOAuth = {};
      vi.spyOn(calendarModule, "getAuthClient").mockResolvedValue(mockOAuth as any);

      // Mock Google Calendar API
      const mockCalendar = {
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  id: "event-2",
                  summary: "Appointment",
                  start: { dateTime: "2024-03-20T14:00:00Z" },
                  end: { dateTime: "2024-03-20T15:00:00Z" },
                },
              ],
            },
          }),
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      const result = await fetchCalendarEventsWithCache(
        "shop-123",
        "2024-03-20",
        "America/New_York"
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event-2");
      expect(mockRedis.setex).toHaveBeenCalledWith(
        "calendar:events:shop-123:2024-03-20",
        180,
        JSON.stringify(mockEvents)
      );
    });

    it("should fetch directly from API if Redis unavailable", async () => {
      // Redis throws error
      vi.spyOn(redisModule, "getRedisClient").mockImplementation(() => {
        throw new Error("Redis unavailable");
      });

      // Mock calendar connection
      vi.spyOn(calendarModule, "getCalendarConnection").mockResolvedValue({
        id: "conn-123",
        shopId: "shop-123",
        calendarId: "primary",
        calendarName: "My Calendar",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyId: "default",
      } as any);

      const mockOAuth = {};
      vi.spyOn(calendarModule, "getAuthClient").mockResolvedValue(mockOAuth as any);

      const mockCalendar = {
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  id: "event-3",
                  summary: "Direct API Event",
                  start: { dateTime: "2024-03-20T09:00:00Z" },
                  end: { dateTime: "2024-03-20T10:00:00Z" },
                },
              ],
            },
          }),
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      const result = await fetchCalendarEventsWithCache(
        "shop-123",
        "2024-03-20",
        "America/New_York"
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event-3");
    });

    it("should return empty array if no calendar connection", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn(),
      };

      vi.spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);
      vi.spyOn(calendarModule, "getCalendarConnection").mockResolvedValue(null);

      const result = await fetchCalendarEventsWithCache(
        "shop-123",
        "2024-03-20",
        "America/New_York"
      );

      expect(result).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn(),
      };

      vi.spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);

      vi.spyOn(calendarModule, "getCalendarConnection").mockResolvedValue({
        id: "conn-123",
        shopId: "shop-123",
        calendarId: "primary",
        calendarName: "My Calendar",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyId: "default",
      } as any);

      const mockOAuth = {};
      vi.spyOn(calendarModule, "getAuthClient").mockResolvedValue(mockOAuth as any);

      const mockCalendar = {
        events: {
          list: vi.fn().mockRejectedValue(new Error("API error")),
        },
      };

      vi.spyOn(google, "calendar").mockReturnValue(mockCalendar as any);

      const result = await fetchCalendarEventsWithCache(
        "shop-123",
        "2024-03-20",
        "America/New_York"
      );

      expect(result).toEqual([]);
    });
  });

  describe("filterSlotsForConflicts", () => {
    it("should exclude slots that overlap with events", () => {
      const slots = [
        {
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T12:00:00Z"),
          endsAt: new Date("2024-03-20T13:00:00Z"),
        },
      ];

      const events: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "Meeting",
          start: { dateTime: "2024-03-20T10:00:00Z" },
          end: { dateTime: "2024-03-20T11:00:00Z" },
        },
      ];

      const result = filterSlotsForConflicts(slots, events);

      expect(result).toHaveLength(2);
      expect(result[0].startsAt).toEqual(new Date("2024-03-20T11:00:00Z"));
      expect(result[1].startsAt).toEqual(new Date("2024-03-20T12:00:00Z"));
    });

    it("should handle partial overlaps", () => {
      const slots = [
        {
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
        },
      ];

      const events: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "Partial Overlap",
          start: { dateTime: "2024-03-20T10:30:00Z" }, // Starts halfway through first slot
          end: { dateTime: "2024-03-20T11:30:00Z" }, // Ends halfway through second slot
        },
      ];

      const result = filterSlotsForConflicts(slots, events);

      // Both slots should be excluded due to partial overlap
      expect(result).toHaveLength(0);
    });

    it("should return empty array for all-day events", () => {
      const slots = [
        {
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
        },
      ];

      const events: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "All Day Event",
          start: { date: "2024-03-20" },
          end: { date: "2024-03-21" },
        },
      ];

      const result = filterSlotsForConflicts(slots, events);

      expect(result).toEqual([]);
    });

    it("should include slots with no overlaps", () => {
      const slots = [
        {
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T14:00:00Z"),
          endsAt: new Date("2024-03-20T15:00:00Z"),
        },
      ];

      const events: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "Lunch",
          start: { dateTime: "2024-03-20T12:00:00Z" },
          end: { dateTime: "2024-03-20T13:00:00Z" },
        },
      ];

      const result = filterSlotsForConflicts(slots, events);

      expect(result).toHaveLength(3); // All slots available
    });

    it("should handle adjacent events (no overlap)", () => {
      const slots = [
        {
          startsAt: new Date("2024-03-20T10:00:00Z"),
          endsAt: new Date("2024-03-20T11:00:00Z"),
        },
        {
          startsAt: new Date("2024-03-20T11:00:00Z"),
          endsAt: new Date("2024-03-20T12:00:00Z"),
        },
      ];

      const events: CalendarEvent[] = [
        {
          id: "event-1",
          summary: "Meeting",
          start: { dateTime: "2024-03-20T09:00:00Z" },
          end: { dateTime: "2024-03-20T10:00:00Z" }, // Ends exactly when first slot starts
        },
      ];

      const result = filterSlotsForConflicts(slots, events);

      // No overlap (event ends when slot starts)
      expect(result).toHaveLength(2);
    });
  });
});
```

---

### Integration Tests

**File:** `src/lib/queries/__tests__/appointments-availability-calendar.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAvailabilityForDate } from "@/lib/queries/appointments";
import { db } from "@/lib/db";
import { shops, bookingSettings, shopHours, calendarConnections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import * as cacheModule from "@/lib/google-calendar-cache";

vi.mock("@/lib/google-calendar-cache");

describe("getAvailabilityForDate with Calendar Integration", () => {
  let testShopId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Availability Calendar Test",
        slug: "availability-calendar",
        currency: "USD",
        ownerId: "owner-availability",
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

    // Create shop hours (Monday - Friday)
    for (let day = 1; day <= 5; day++) {
      await db.insert(shopHours).values({
        shopId: testShopId,
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "17:00",
      });
    }
  });

  afterEach(async () => {
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(shopHours).where(eq(shopHours.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should exclude slots conflicting with calendar events", async () => {
    // Mock calendar events
    const mockEvents = [
      {
        id: "event-1",
        summary: "Meeting",
        start: { dateTime: "2024-03-25T14:00:00Z" }, // 10:00 AM ET (14:00 UTC)
        end: { dateTime: "2024-03-25T15:00:00Z" },
      },
    ];

    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);
    vi.spyOn(cacheModule, "filterSlotsForConflicts").mockImplementation((slots, events) => {
      // Actual filtering logic
      return slots.filter((slot) => {
        const slotStart = slot.startsAt.getTime();
        const slotEnd = slot.endsAt.getTime();

        for (const event of events) {
          const eventStart = new Date(event.start.dateTime!).getTime();
          const eventEnd = new Date(event.end.dateTime!).getTime();

          if (eventStart < slotEnd && eventEnd > slotStart) {
            return false;
          }
        }
        return true;
      });
    });

    const result = await getAvailabilityForDate(testShopId, "2024-03-25"); // Monday

    // Verify 10:00 AM slot excluded
    const tenAmSlot = result.slots.find((slot) =>
      slot.startsAt.toISOString().includes("T14:00:00")
    );

    expect(tenAmSlot).toBeUndefined();
    expect(result.slots.length).toBeLessThan(8); // Less than total possible slots
  });

  it("should include slots when no calendar conflicts", async () => {
    // No calendar events
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([]);
    vi.spyOn(cacheModule, "filterSlotsForConflicts").mockImplementation((slots) => slots);

    const result = await getAvailabilityForDate(testShopId, "2024-03-25");

    // All slots available (9 AM - 5 PM = 8 slots)
    expect(result.slots.length).toBe(8);
  });

  it("should work when no calendar connection exists", async () => {
    // No calendar connection
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([]);

    const result = await getAvailabilityForDate(testShopId, "2024-03-25");

    expect(result.slots).toBeTruthy();
    expect(result.slots.length).toBeGreaterThan(0);
  });

  it("should return empty slots for all-day event", async () => {
    const mockEvents = [
      {
        id: "event-all-day",
        summary: "Holiday",
        start: { date: "2024-03-25" },
        end: { date: "2024-03-26" },
      },
    ];

    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue(mockEvents);
    vi.spyOn(cacheModule, "filterSlotsForConflicts").mockReturnValue([]); // All-day blocks everything

    const result = await getAvailabilityForDate(testShopId, "2024-03-25");

    expect(result.slots).toEqual([]);
  });

  it("should gracefully degrade if calendar API fails", async () => {
    // Calendar API throws error
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockRejectedValue(
      new Error("API error")
    );

    const result = await getAvailabilityForDate(testShopId, "2024-03-25");

    // Should still return slots (without calendar filtering)
    expect(result.slots).toBeTruthy();
    expect(result.slots.length).toBeGreaterThan(0);
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/availability-with-calendar.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { shops, bookingSettings, shopHours, calendarConnections } from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Availability with Google Calendar", () => {
  let testShopId: string;
  let testShopSlug: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Availability Calendar",
        slug: "e2e-availability-calendar",
        currency: "USD",
        ownerId: "owner-e2e-avail",
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

  test("should exclude slots with calendar conflicts", async ({ page, context }) => {
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
                id: "event-2pm",
                summary: "Meeting",
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

    // Select tomorrow
    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');

    // Wait for slots to load
    await page.waitForSelector('button[data-slot]', { timeout: 5000 });

    // Get all available slots
    const slots = await page.$$eval('button[data-slot]', (buttons) =>
      buttons.map((btn) => btn.getAttribute("data-slot"))
    );

    // Verify 2:00 PM slot NOT available
    const hasTwoPmSlot = slots.some((slot) => slot?.includes("14:00") || slot?.includes("18:00"));
    expect(hasTwoPmSlot).toBe(false);

    // Verify other slots ARE available
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThan(8); // Less than total (some blocked)
  });

  test("should block entire day for all-day event", async ({ page, context }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Mock Google Calendar API with all-day event
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
                start: {
                  date: tomorrowStr,
                },
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

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Select tomorrow
    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');

    // Wait a moment for API call
    await page.waitForTimeout(1000);

    // Verify no slots available
    const noSlotsMessage = await page.locator('text=No available slots');
    await expect(noSlotsMessage).toBeVisible();
  });

  test("should cache calendar events (reduce API calls)", async ({ page, context }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let apiCallCount = 0;

    // Track API calls
    await context.route("https://www.googleapis.com/**", (route) => {
      if (route.request().url().includes("/calendar/v3/calendars/")) {
        apiCallCount++;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to booking page
    await page.goto(`/book/${testShopSlug}`);

    // Check availability first time
    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');
    await page.waitForTimeout(500);

    const firstCallCount = apiCallCount;
    expect(firstCallCount).toBe(1);

    // Check availability second time (should use cache)
    await page.fill('input[type="date"]', "");
    await page.fill('input[type="date"]', tomorrowStr);
    await page.click('button:has-text("Check Availability")');
    await page.waitForTimeout(500);

    // Should NOT make another API call (cache hit)
    expect(apiCallCount).toBe(1);
  });
});
```

---

## Regression Prevention

### Critical Test Files to Monitor

```bash
# Unit tests - Availability logic
pnpm test src/lib/__tests__/booking.test.ts

# Integration tests - Appointments
pnpm test src/lib/queries/__tests__/appointments.test.ts

# E2E tests - Booking flow (uses availability)
pnpm test:e2e tests/e2e/booking.spec.ts

# All tests
pnpm test
pnpm test:e2e
```

### Mock Strategy

Existing tests should mock calendar cache module:

```typescript
vi.mock("@/lib/google-calendar-cache", () => ({
  fetchCalendarEventsWithCache: vi.fn().mockResolvedValue([]),
  filterSlotsForConflicts: vi.fn().mockImplementation((slots) => slots),
  isAllDayEvent: vi.fn().mockReturnValue(false),
}));
```

**Expected behavior:**
- Availability tests pass without modification
- Calendar module mocked to return empty events
- Slots returned normally (no filtering)

---

## Implementation Checklist

### Core Services

- [ ] Create `src/lib/google-calendar-cache.ts`
- [ ] Implement `CalendarEvent` interface
- [ ] Implement `isAllDayEvent()` function
- [ ] Implement `fetchFromGoogleAPI()` function
- [ ] Implement `fetchCalendarEventsWithCache()` function
- [ ] Implement `filterSlotsForConflicts()` function
- [ ] Export `getAuthClient()` from `src/lib/google-calendar.ts`

### Availability Integration

- [ ] Update `src/lib/queries/appointments.ts`
- [ ] Import calendar cache functions
- [ ] Add calendar event fetching in `getAvailabilityForDate()`
- [ ] Add slot filtering logic
- [ ] Add error handling for graceful degradation

### Testing

- [ ] Create `src/lib/__tests__/google-calendar-cache.test.ts`
- [ ] Write unit tests for `isAllDayEvent()`
- [ ] Write unit tests for `fetchCalendarEventsWithCache()`
- [ ] Write unit tests for `filterSlotsForConflicts()`
- [ ] Write unit tests for cache hit/miss scenarios
- [ ] Write unit tests for Redis unavailable scenario
- [ ] Create `src/lib/queries/__tests__/appointments-availability-calendar.test.ts`
- [ ] Write integration tests for availability with calendar
- [ ] Create `tests/e2e/availability-with-calendar.spec.ts`
- [ ] Write E2E test for slot exclusion
- [ ] Write E2E test for all-day event blocking
- [ ] Write E2E test for cache behavior
- [ ] Add calendar mocks to existing availability tests
- [ ] Run all tests: `pnpm test && pnpm test:e2e`

### Code Quality

- [ ] Run `pnpm lint` and fix errors
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Add logging for debugging
- [ ] Review error handling
- [ ] Add code comments

### Documentation

- [ ] Update README.md with calendar conflict detection
- [ ] Update CLAUDE.md with V3 notes
- [ ] Add inline comments to cache logic
- [ ] Document TTL strategy

### Manual Testing

- [ ] Test availability with calendar connection
- [ ] Test availability without calendar connection
- [ ] Test Redis cache hit/miss
- [ ] Test all-day event blocking
- [ ] Test partial slot overlaps
- [ ] Test calendar API failure (graceful degradation)
- [ ] Verify cache invalidation after V2 event creation

---

## Demo Script

### Preparation

1. Complete V1 (OAuth) and V2 (event creation)
2. Connect Google Calendar
3. Create test events in Google Calendar
4. Start dev server: `pnpm dev`

### Demo Flow

1. **Create Calendar Event**
   - Open Google Calendar
   - Create event tomorrow at 2:00 PM
   - Title: "Important Meeting"

2. **Check Availability**
   - Go to `/book/{shop-slug}`
   - Select tomorrow's date
   - Click "Check Availability"

3. **Verify Slot Blocked**
   - See available slots displayed
   - 2:00 PM slot NOT shown
   - Other slots available

4. **Test All-Day Event**
   - Create all-day event in Google Calendar
   - Refresh booking page
   - Select date with all-day event
   - See "No available slots" message

5. **Test Cache**
   - Open browser DevTools → Network tab
   - Check availability for same date again
   - No new Google Calendar API call (cache hit)
   - Wait 3+ minutes
   - Check availability again
   - New API call made (cache expired)

---

## Success Criteria

V3 is complete when:

✅ Calendar events fetched from Google Calendar API
✅ Events cached in Redis with 180-second TTL
✅ Slots overlapping with events excluded from availability
✅ All-day events block entire day
✅ Cache reduces API calls (verified via tests)
✅ Graceful degradation when Redis unavailable
✅ Graceful degradation when calendar API fails
✅ No regression in existing availability tests
✅ Code quality checks pass (lint, typecheck)
✅ Manual testing confirms slot blocking works

---

## Estimated Timeline

**Total: 2-3 days**

- **Day 1:** Cache service, event fetching, filtering logic (6 hours)
- **Day 2:** Availability integration, unit tests (8 hours)
- **Day 3:** Integration tests, E2E tests, manual testing (6 hours)

**Buffer:** 0.5 days for cache debugging, overlap edge cases

---

## Known Limitations (V3)

1. **No Booking-Time Validation** - Availability shows blocked, but booking can still be attempted (V4 will add)
2. **Cache Staleness** - Events created externally may take up to 3 minutes to appear (acceptable trade-off)
3. **No Recurring Event Expansion** - Google API handles this, but complex recurrence rules may behave unexpectedly
4. **Single Calendar Only** - Multi-calendar support deferred to future version
5. **No Event Modification** - Updated calendar events take up to 3 minutes to reflect (cache TTL)

---

## Next Steps After V3

**V4: Prevent Conflict Bookings**
- Validate booking against calendar events at submission time
- Return 409 Conflict if slot conflicts with event
- Show "Calendar conflict" error to customer
- Handle race conditions (slot became available, then blocked)

**Prerequisites from V3:**
- Calendar event fetching working
- Conflict detection logic functional
- Error handling patterns established

---

## Rollback Plan

If V3 needs to be rolled back:

1. **Code Rollback:**
   - Remove `src/lib/google-calendar-cache.ts`
   - Revert changes in `src/lib/queries/appointments.ts`
   - Revert export of `getAuthClient` in `src/lib/google-calendar.ts`
   - Remove test files

2. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All existing functionality should remain unchanged.
