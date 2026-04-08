import { z } from "zod";
import { getDayStartEndUtc } from "@/lib/booking";
import { overlapsWithCalendarConflictBuffer } from "@/lib/calendar-conflict-rules";
import { getAuthClient, getCalendarConnection } from "@/lib/google-calendar";
import { getRedisClient } from "@/lib/redis";

const GOOGLE_CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3";
const CALENDAR_CACHE_TTL_SECONDS = 180;
const CALENDAR_API_TIMEOUT_MS = 3000;
const REDIS_OPERATION_TIMEOUT_MS = 500;

const googleCalendarEventSchema = z.object({
  id: z.string().min(1).optional(),
  summary: z.string().optional(),
  start: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  end: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
});

const googleCalendarEventsResponseSchema = z.object({
  items: z.array(googleCalendarEventSchema).optional(),
  nextPageToken: z.string().optional(),
});

const calendarEventSchema = z.object({
  id: z.string().min(1),
  summary: z.string(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
});

const calendarEventListSchema = z.array(calendarEventSchema);

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string | undefined;
    date?: string | undefined;
    timeZone?: string | undefined;
  };
  end: {
    dateTime?: string | undefined;
    date?: string | undefined;
    timeZone?: string | undefined;
  };
}

function getCalendarEventsCacheKey(shopId: string, date: string): string {
  return `calendar:events:${shopId}:${date}`;
}

function normalizeGoogleEvent(
  event: z.infer<typeof googleCalendarEventSchema>
): CalendarEvent | null {
  if (!event.id || !event.start || !event.end) {
    return null;
  }

  return {
    id: event.id,
    summary: event.summary?.trim() ? event.summary : "Busy",
    start: {
      dateTime: event.start.dateTime,
      date: event.start.date,
      timeZone: event.start.timeZone,
    },
    end: {
      dateTime: event.end.dateTime,
      date: event.end.date,
      timeZone: event.end.timeZone,
    },
  };
}

function parseCachedEvents(value: unknown): CalendarEvent[] | null {
  if (!value) {
    return null;
  }

  const parsedValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })()
      : value;

  if (!parsedValue) {
    return null;
  }

  const parsedEvents = calendarEventListSchema.safeParse(parsedValue);
  if (!parsedEvents.success) {
    return null;
  }

  return parsedEvents.data;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    ),
  ]);
}

async function fetchCalendarEventsPage(
  url: URL,
  accessToken: string
): Promise<z.infer<typeof googleCalendarEventsResponseSchema>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALENDAR_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new Error(`Google Calendar events fetch failed (${response.status})`);
    }

    const parsed = googleCalendarEventsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("Invalid Google Calendar events response");
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Calendar API timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromGoogleAPI(
  shopId: string,
  date: string,
  timezone: string
): Promise<CalendarEvent[]> {
  const connection = await getCalendarConnection(shopId);
  if (!connection) {
    return [];
  }

  try {
    const { start, end } = getDayStartEndUtc(date, timezone);
    const accessToken = await getAuthClient(connection);

    const url = new URL(
      `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(connection.calendarId)}/events`
    );
    url.searchParams.set("timeMin", start.toISOString());
    url.searchParams.set("timeMax", end.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");

    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;
    do {
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      } else {
        url.searchParams.delete("pageToken");
      }

      const response = await fetchCalendarEventsPage(url, accessToken);
      for (const item of response.items ?? []) {
        const normalized = normalizeGoogleEvent(item);
        if (normalized) {
          events.push(normalized);
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return events;
  } catch (error) {
    console.error("[calendar-cache] Failed to fetch calendar events", {
      shopId,
      date,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export function isAllDayEvent(event: CalendarEvent): boolean {
  return Boolean(event.start.date && !event.start.dateTime);
}

export async function fetchCalendarEventsWithCache(
  shopId: string,
  date: string,
  timezone: string
): Promise<CalendarEvent[]> {
  const cacheKey = getCalendarEventsCacheKey(shopId, date);

  try {
    const redis = getRedisClient();
    const cached = await withTimeout(
      redis.get(cacheKey),
      REDIS_OPERATION_TIMEOUT_MS,
      "Redis get timeout"
    );
    const parsedCached = parseCachedEvents(cached);
    if (parsedCached) {
      return parsedCached;
    }

    const events = await fetchFromGoogleAPI(shopId, date, timezone);
    await withTimeout(
      redis.setex(cacheKey, CALENDAR_CACHE_TTL_SECONDS, JSON.stringify(events)),
      REDIS_OPERATION_TIMEOUT_MS,
      "Redis set timeout"
    );
    return events;
  } catch (error) {
    console.warn("[calendar-cache] Redis unavailable; falling back to Google API", {
      shopId,
      date,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return await fetchFromGoogleAPI(shopId, date, timezone);
  }
}

export async function invalidateCalendarCache(
  shopId: string,
  date: string
): Promise<void> {
  const cacheKey = getCalendarEventsCacheKey(shopId, date);

  try {
    const redis = getRedisClient();
    await withTimeout(
      redis.del(cacheKey),
      REDIS_OPERATION_TIMEOUT_MS,
      "Redis delete timeout"
    );
    console.warn("[calendar-cache] Cache invalidated", { cacheKey });
  } catch (error) {
    console.error("[calendar-cache] Cache invalidation failed", {
      shopId,
      date,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function filterSlotsForConflicts<
  T extends { startsAt: Date; endsAt: Date; bufferAfterMinutes?: number },
>(slots: T[], events: CalendarEvent[]): T[] {
  if (events.some(isAllDayEvent)) {
    console.warn("[calendar-cache] All-day event detected; blocking all slots");
    return [];
  }

  const timedIntervals = events
    .map((event) => {
      if (isAllDayEvent(event)) {
        return null;
      }

      const start = event.start.dateTime ? Date.parse(event.start.dateTime) : Number.NaN;
      const end = event.end.dateTime ? Date.parse(event.end.dateTime) : Number.NaN;

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return { start, end };
    })
    .filter((interval): interval is { start: number; end: number } => interval !== null);

  return slots.filter((slot) => {
    const slotStart = slot.startsAt.getTime();
    const slotEnd = slot.endsAt.getTime() + (slot.bufferAfterMinutes ?? 0) * 60_000;

    for (const interval of timedIntervals) {
      if (
        overlapsWithCalendarConflictBuffer({
          slotStartMs: slotStart,
          slotEndMs: slotEnd,
          eventStartMs: interval.start,
          eventEndMs: interval.end,
        })
      ) {
        return false;
      }
    }

    return true;
  });
}
