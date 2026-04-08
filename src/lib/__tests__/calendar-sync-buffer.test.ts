import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentFindFirstMock,
  shopFindFirstMock,
  customerFindFirstMock,
  bookingSettingsFindFirstMock,
  updateReturningMock,
  createCalendarEventMock,
} = vi.hoisted(() => {
  const updateReturningMock = vi.fn();

  return {
    appointmentFindFirstMock: vi.fn(),
    shopFindFirstMock: vi.fn(),
    customerFindFirstMock: vi.fn(),
    bookingSettingsFindFirstMock: vi.fn(),
    updateReturningMock,
    createCalendarEventMock: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      appointments: { findFirst: appointmentFindFirstMock },
      shops: { findFirst: shopFindFirstMock },
      customers: { findFirst: customerFindFirstMock },
      bookingSettings: { findFirst: bookingSettingsFindFirstMock },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturningMock,
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: createCalendarEventMock,
  invalidateCalendarCache: vi.fn().mockResolvedValue(undefined),
  NoCalendarConnectionError: class NoCalendarConnectionError extends Error {},
  CalendarEventCreationError: class CalendarEventCreationError extends Error {},
}));

const { syncAppointmentCalendarEvent } = await import(
  "@/lib/queries/appointments"
);

const rawStartsAt = new Date("2026-04-10T13:00:00Z");
const rawEndsAt = new Date("2026-04-10T14:00:00Z");

const makeAppointmentFixture = (effectiveBufferAfterMinutes: number) => ({
  id: "appt-1",
  shopId: "shop-1",
  customerId: "customer-1",
  startsAt: rawStartsAt,
  endsAt: rawEndsAt,
  effectiveBufferAfterMinutes,
  status: "booked" as const,
  paymentStatus: "paid" as const,
  paymentRequired: false,
  bookingUrl: null,
  calendarEventId: null,
});

describe("syncAppointmentCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shopFindFirstMock.mockResolvedValue({ name: "Test Shop" });
    customerFindFirstMock.mockResolvedValue({ fullName: "Jane Doe" });
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    createCalendarEventMock.mockResolvedValue("cal-event-123");
    updateReturningMock.mockResolvedValue([
      { id: "appt-1", shopId: "shop-1", startsAt: rawStartsAt },
    ]);
  });

  it("passes endsAt + buffer to createCalendarEvent when effectiveBufferAfterMinutes = 10", async () => {
    // BOUNDARY: calendar-sync-buffer-v1 verifies only manual sync's buffered end-time export.
    appointmentFindFirstMock.mockResolvedValue(makeAppointmentFixture(10));

    await syncAppointmentCalendarEvent("appt-1");

    expect(createCalendarEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: new Date(rawEndsAt.getTime() + 10 * 60_000),
      })
    );
  });

  it("passes raw endsAt to createCalendarEvent when effectiveBufferAfterMinutes = 0", async () => {
    appointmentFindFirstMock.mockResolvedValue(makeAppointmentFixture(0));

    await syncAppointmentCalendarEvent("appt-1");

    expect(createCalendarEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: rawEndsAt,
      })
    );
  });
});
