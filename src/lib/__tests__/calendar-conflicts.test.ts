import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentsFindManyMock,
  bookingSettingsFindFirstMock,
  dbMock,
  deleteReturningMock,
  insertReturningMock,
  mockFetchCalendarEventsWithCache,
  mockIsAllDayEvent,
  updateReturningMock,
} = vi.hoisted(() => {
  const bookingSettingsFindFirstMock = vi.fn();
  const appointmentsFindManyMock = vi.fn();

  const insertReturningMock = vi.fn();
  const insertOnConflictDoNothingMock = vi.fn(() => ({
    returning: insertReturningMock,
  }));
  const insertValuesMock = vi.fn(() => ({
    onConflictDoNothing: insertOnConflictDoNothingMock,
  }));

  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({
    returning: updateReturningMock,
  }));
  const updateSetMock = vi.fn(() => ({
    where: updateWhereMock,
  }));

  const deleteReturningMock = vi.fn();
  const deleteWhereMock = vi.fn(() => ({
    returning: deleteReturningMock,
  }));

  return {
    bookingSettingsFindFirstMock,
    appointmentsFindManyMock,
    insertReturningMock,
    updateReturningMock,
    deleteReturningMock,
    mockFetchCalendarEventsWithCache: vi.fn(),
    mockIsAllDayEvent: vi.fn(
      (event: { start?: { date?: string; dateTime?: string } } | undefined) =>
        Boolean(event?.start?.date && !event?.start?.dateTime)
    ),
    dbMock: {
      query: {
        bookingSettings: {
          findFirst: bookingSettingsFindFirstMock,
        },
        appointments: {
          findMany: appointmentsFindManyMock,
        },
      },
      insert: vi.fn(() => ({
        values: insertValuesMock,
      })),
      update: vi.fn(() => ({
        set: updateSetMock,
      })),
      delete: vi.fn(() => ({
        where: deleteWhereMock,
      })),
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/google-calendar-cache", () => ({
  fetchCalendarEventsWithCache: mockFetchCalendarEventsWithCache,
  isAllDayEvent: mockIsAllDayEvent,
}));

const {
  CalendarConflictError,
  calculateOverlapSeverity,
  cleanupOldAlerts,
  hasCalendarConflict,
  scanAndDetectConflicts,
  validateBookingConflict,
} = await import("@/lib/calendar-conflicts");

describe("calendar-conflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllDayEvent.mockImplementation(
      (event: { start?: { date?: string; dateTime?: string } } | undefined) =>
        Boolean(event?.start?.date && !event?.start?.dateTime)
    );

    bookingSettingsFindFirstMock.mockResolvedValue(null);
    appointmentsFindManyMock.mockResolvedValue([]);
    insertReturningMock.mockResolvedValue([]);
    updateReturningMock.mockResolvedValue([]);
    deleteReturningMock.mockResolvedValue([]);
  });

  it("allows booking when there are no calendar events", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).resolves.toBeUndefined();
  });

  it("throws CalendarConflictError for overlapping events", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-1",
        summary: "Team Meeting",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });

  it("throws CalendarConflictError for all-day events", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-all-day",
        summary: "Out of Office",
        start: { date: "2026-03-15" },
        end: { date: "2026-03-16" },
      },
    ]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T13:00:00.000Z"),
        endsAt: new Date("2026-03-15T14:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });

  it("applies the +/- 5 minute buffer zone", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-buffer",
        summary: "Quick Call",
        start: { dateTime: "2026-03-15T10:56:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T11:00:00.000Z"),
        endsAt: new Date("2026-03-15T12:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });

  it("throws CalendarConflictError when event overlaps only within the candidate's buffer window", async () => {
    // Event starts after raw endsAt (14:00) but inside the 10-min buffer window (14:10)
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-in-buffer",
        summary: "Buffer Overlap",
        start: { dateTime: "2026-03-15T14:05:00.000Z" },
        end: { dateTime: "2026-03-15T14:30:00.000Z" },
      },
    ]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T13:00:00.000Z"),
        endsAt: new Date("2026-03-15T14:00:00.000Z"),
        timezone: "UTC",
        bufferAfterMinutes: 10,
      })
    ).rejects.toThrow(CalendarConflictError);
  });

  it("allows booking when events are outside overlap + buffer", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-before",
        summary: "Morning",
        start: { dateTime: "2026-03-15T09:00:00.000Z" },
        end: { dateTime: "2026-03-15T09:54:00.000Z" },
      },
      {
        id: "evt-after",
        summary: "Afternoon",
        start: { dateTime: "2026-03-15T11:06:00.000Z" },
        end: { dateTime: "2026-03-15T12:00:00.000Z" },
      },
    ]);

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).resolves.toBeUndefined();
  });

  it("gracefully degrades when calendar fetch fails", async () => {
    mockFetchCalendarEventsWithCache.mockRejectedValue(new Error("calendar down"));

    await expect(
      validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).resolves.toBeUndefined();
  });

  it("exposes sanitized conflicting event details", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-details",
        summary: "   Important Client Meeting   ",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ]);

    try {
      await validateBookingConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      });
      expect.fail("Expected CalendarConflictError");
    } catch (error) {
      expect(error).toBeInstanceOf(CalendarConflictError);
      expect(
        (error as { conflictingEvent?: { summary: string; start: string; end: string } })
          .conflictingEvent
      ).toEqual({
        summary: "Important Client Meeting",
        start: "2026-03-15T10:00:00.000Z",
        end: "2026-03-15T11:00:00.000Z",
      });
    }
  });

  it("hasCalendarConflict returns true for conflicts", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-1",
        summary: "Meeting",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ]);

    await expect(
      hasCalendarConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).resolves.toBe(true);
  });

  it("hasCalendarConflict returns false when no conflict", async () => {
    mockFetchCalendarEventsWithCache.mockResolvedValue([]);

    await expect(
      hasCalendarConflict({
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        timezone: "America/New_York",
      })
    ).resolves.toBe(false);
  });

  it("calculates severity for all-day, full, high, and partial overlaps", () => {
    const appointmentStart = new Date("2026-03-15T10:00:00.000Z");
    const appointmentEnd = new Date("2026-03-15T11:00:00.000Z");

    expect(
      calculateOverlapSeverity(
        appointmentStart,
        appointmentEnd,
        new Date("2026-03-15T00:00:00.000Z"),
        new Date("2026-03-16T00:00:00.000Z"),
        true
      )
    ).toBe("all_day");

    expect(
      calculateOverlapSeverity(
        appointmentStart,
        appointmentEnd,
        new Date("2026-03-15T09:00:00.000Z"),
        new Date("2026-03-15T12:00:00.000Z"),
        false
      )
    ).toBe("full");

    expect(
      calculateOverlapSeverity(
        appointmentStart,
        appointmentEnd,
        new Date("2026-03-15T10:30:00.000Z"),
        new Date("2026-03-15T12:00:00.000Z"),
        false
      )
    ).toBe("high");

    expect(
      calculateOverlapSeverity(
        appointmentStart,
        appointmentEnd,
        new Date("2026-03-15T10:50:00.000Z"),
        new Date("2026-03-15T12:00:00.000Z"),
        false
      )
    ).toBe("partial");
  });

  it("scanAndDetectConflicts returns zeros when booking settings are missing", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue(null);

    await expect(scanAndDetectConflicts("shop-1")).resolves.toEqual({
      conflictsDetected: 0,
      alertsCreated: 0,
      alertsAutoResolved: 0,
    });

    expect(mockFetchCalendarEventsWithCache).not.toHaveBeenCalled();
  });

  it("scanAndDetectConflicts creates alerts for overlapping external events", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([
        {
          id: "appt-1",
          startsAt: new Date("2026-03-15T10:00:00.000Z"),
          endsAt: new Date("2026-03-15T11:00:00.000Z"),
          calendarEventId: "evt-own",
          effectiveBufferAfterMinutes: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-external",
        summary: "Team Meeting",
        start: { dateTime: "2026-03-15T10:30:00.000Z" },
        end: { dateTime: "2026-03-15T11:30:00.000Z" },
      },
    ]);
    insertReturningMock.mockResolvedValue([{ id: "alert-1" }]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result).toEqual({
      conflictsDetected: 1,
      alertsCreated: 1,
      alertsAutoResolved: 0,
    });
    expect(mockFetchCalendarEventsWithCache).toHaveBeenCalledWith(
      "shop-1",
      "2026-03-15",
      "UTC"
    );
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it("scanAndDetectConflicts de-duplicates when alert already exists", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([
        {
          id: "appt-1",
          startsAt: new Date("2026-03-15T10:00:00.000Z"),
          endsAt: new Date("2026-03-15T11:00:00.000Z"),
          calendarEventId: null,
          effectiveBufferAfterMinutes: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-external",
        summary: "Team Meeting",
        start: { dateTime: "2026-03-15T10:30:00.000Z" },
        end: { dateTime: "2026-03-15T11:30:00.000Z" },
      },
    ]);
    insertReturningMock.mockResolvedValue([]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result.conflictsDetected).toBe(1);
    expect(result.alertsCreated).toBe(0);
  });

  it("scanAndDetectConflicts skips the appointment's own calendar event", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([
        {
          id: "appt-1",
          startsAt: new Date("2026-03-15T10:00:00.000Z"),
          endsAt: new Date("2026-03-15T11:00:00.000Z"),
          calendarEventId: "evt-own",
          effectiveBufferAfterMinutes: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-own",
        summary: "Appointment: Customer",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result).toEqual({
      conflictsDetected: 0,
      alertsCreated: 0,
      alertsAutoResolved: 0,
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("scanAndDetectConflicts detects conflict when event overlaps only the post-appointment buffer", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([
        {
          id: "appt-buf",
          startsAt: new Date("2026-03-15T13:00:00.000Z"),
          endsAt: new Date("2026-03-15T14:00:00.000Z"),
          calendarEventId: null,
          effectiveBufferAfterMinutes: 15,
        },
      ])
      .mockResolvedValueOnce([]);

    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-in-buffer",
        summary: "Buffer Overlap",
        start: { dateTime: "2026-03-15T14:05:00.000Z" },
        end: { dateTime: "2026-03-15T14:30:00.000Z" },
      },
    ]);
    insertReturningMock.mockResolvedValue([{ id: "alert-buf" }]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result.conflictsDetected).toBe(1);
    expect(result.alertsCreated).toBe(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it("scanAndDetectConflicts detects conflict when event overlaps only within the +/- 5 min calendar padding", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([
        {
          id: "appt-pad",
          startsAt: new Date("2026-03-15T13:00:00.000Z"),
          endsAt: new Date("2026-03-15T14:00:00.000Z"),
          calendarEventId: null,
          effectiveBufferAfterMinutes: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    mockFetchCalendarEventsWithCache.mockResolvedValue([
      {
        id: "evt-in-padding",
        summary: "Padding Overlap",
        start: { dateTime: "2026-03-15T11:57:00.000Z" },
        end: { dateTime: "2026-03-15T13:00:00.000Z" },
      },
    ]);
    insertReturningMock.mockResolvedValue([{ id: "alert-pad" }]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result.conflictsDetected).toBe(1);
    expect(result.alertsCreated).toBe(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it("scanAndDetectConflicts auto-resolves pending alerts for past appointments", async () => {
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    appointmentsFindManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "appt-past-1" }]);
    updateReturningMock.mockResolvedValue([{ id: "alert-1" }]);

    const result = await scanAndDetectConflicts("shop-1");

    expect(result).toEqual({
      conflictsDetected: 0,
      alertsCreated: 0,
      alertsAutoResolved: 1,
    });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it("cleanupOldAlerts deletes alerts older than 30 days", async () => {
    deleteReturningMock.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    await expect(cleanupOldAlerts()).resolves.toBe(2);
    expect(dbMock.delete).toHaveBeenCalledTimes(1);
  });
});
