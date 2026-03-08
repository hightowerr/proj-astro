import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAuthClient,
  mockGetCalendarConnection,
  mockGetRedisClient,
} = vi.hoisted(() => ({
  mockGetRedisClient: vi.fn(),
  mockGetCalendarConnection: vi.fn(),
  mockGetAuthClient: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: mockGetRedisClient,
}));

vi.mock("@/lib/google-calendar", () => ({
  getCalendarConnection: mockGetCalendarConnection,
  getAuthClient: mockGetAuthClient,
}));

const {
  fetchCalendarEventsWithCache,
  filterSlotsForConflicts,
  isAllDayEvent,
} = await import("@/lib/google-calendar-cache");

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("google-calendar-cache", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects all-day events", () => {
    expect(
      isAllDayEvent({
        id: "all-day",
        summary: "All day",
        start: { date: "2026-03-15" },
        end: { date: "2026-03-16" },
      })
    ).toBe(true);

    expect(
      isAllDayEvent({
        id: "timed",
        summary: "Timed",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      })
    ).toBe(false);
  });

  it("returns cached events on cache hit", async () => {
    const cached = [
      {
        id: "evt-1",
        summary: "Cached",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ];
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cached)),
      setex: vi.fn(),
    };
    mockGetRedisClient.mockReturnValue(redis);

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith("calendar:events:shop-1:2026-03-15");
    expect(redis.setex).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and caches events on cache miss", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK"),
    };
    mockGetRedisClient.mockReturnValue(redis);
    mockGetCalendarConnection.mockResolvedValue({
      id: "conn-1",
      shopId: "shop-1",
      calendarId: "primary",
      calendarName: "Primary",
      accessToken: "encrypted",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      encryptionKeyId: "default",
    });
    mockGetAuthClient.mockResolvedValue("access-token");
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "evt-2",
            summary: "Meeting",
            start: { dateTime: "2026-03-15T14:00:00.000Z" },
            end: { dateTime: "2026-03-15T15:00:00.000Z" },
          },
        ],
      })
    );

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toEqual([
      {
        id: "evt-2",
        summary: "Meeting",
        start: { dateTime: "2026-03-15T14:00:00.000Z" },
        end: { dateTime: "2026-03-15T15:00:00.000Z" },
      },
    ]);
    expect(redis.setex).toHaveBeenCalledWith(
      "calendar:events:shop-1:2026-03-15",
      180,
      JSON.stringify(result)
    );
  });

  it("falls back to direct API when Redis is unavailable", async () => {
    mockGetRedisClient.mockImplementation(() => {
      throw new Error("Redis unavailable");
    });
    mockGetCalendarConnection.mockResolvedValue({
      id: "conn-1",
      shopId: "shop-1",
      calendarId: "primary",
      calendarName: "Primary",
      accessToken: "encrypted",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      encryptionKeyId: "default",
    });
    mockGetAuthClient.mockResolvedValue("access-token");
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "evt-3",
            summary: "Busy",
            start: { dateTime: "2026-03-15T09:00:00.000Z" },
            end: { dateTime: "2026-03-15T10:00:00.000Z" },
          },
        ],
      })
    );

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("evt-3");
  });

  it("falls back to direct API when Redis get times out", async () => {
    const redis = {
      get: vi.fn().mockImplementation(
        () => new Promise(() => {})
      ),
      setex: vi.fn(),
    };
    mockGetRedisClient.mockReturnValue(redis);
    mockGetCalendarConnection.mockResolvedValue({
      id: "conn-1",
      shopId: "shop-1",
      calendarId: "primary",
      calendarName: "Primary",
      accessToken: "encrypted",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      encryptionKeyId: "default",
    });
    mockGetAuthClient.mockResolvedValue("access-token");
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "evt-timeout-fallback",
            summary: "Busy",
            start: { dateTime: "2026-03-15T09:00:00.000Z" },
            end: { dateTime: "2026-03-15T10:00:00.000Z" },
          },
        ],
      })
    );

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("evt-timeout-fallback");
  });

  it("returns an empty list when no calendar connection exists", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK"),
    };
    mockGetRedisClient.mockReturnValue(redis);
    mockGetCalendarConnection.mockResolvedValue(null);

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalledWith(
      "calendar:events:shop-1:2026-03-15",
      180,
      JSON.stringify([])
    );
  });

  it("returns an empty list when Google Calendar API fails", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK"),
    };
    mockGetRedisClient.mockReturnValue(redis);
    mockGetCalendarConnection.mockResolvedValue({
      id: "conn-1",
      shopId: "shop-1",
      calendarId: "primary",
      calendarName: "Primary",
      accessToken: "encrypted",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      encryptionKeyId: "default",
    });
    mockGetAuthClient.mockResolvedValue("access-token");
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    const result = await fetchCalendarEventsWithCache(
      "shop-1",
      "2026-03-15",
      "America/New_York"
    );

    expect(result).toEqual([]);
  });

  it("filters timed overlaps and preserves non-conflicting slots", () => {
    const slots = [
      {
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
      },
      {
        startsAt: new Date("2026-03-15T11:00:00.000Z"),
        endsAt: new Date("2026-03-15T12:00:00.000Z"),
      },
      {
        startsAt: new Date("2026-03-15T12:00:00.000Z"),
        endsAt: new Date("2026-03-15T13:00:00.000Z"),
      },
    ];

    const filtered = filterSlotsForConflicts(slots, [
      {
        id: "evt-overlap",
        summary: "Meeting",
        start: { dateTime: "2026-03-15T10:30:00.000Z" },
        end: { dateTime: "2026-03-15T11:30:00.000Z" },
      },
    ]);

    expect(filtered).toEqual([
      {
        startsAt: new Date("2026-03-15T12:00:00.000Z"),
        endsAt: new Date("2026-03-15T13:00:00.000Z"),
      },
    ]);
  });

  it("blocks the full day when an all-day event exists", () => {
    const slots = [
      {
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
      },
    ];

    const filtered = filterSlotsForConflicts(slots, [
      {
        id: "evt-all-day",
        summary: "Holiday",
        start: { date: "2026-03-15" },
        end: { date: "2026-03-16" },
      },
    ]);

    expect(filtered).toEqual([]);
  });
});
