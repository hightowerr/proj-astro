/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  CalendarConflictErrorMock,
  InvalidSlotErrorMock,
  ShopClosedErrorMock,
  SlotTakenErrorMock,
  mockBuildBookingBaseUrl,
  mockComputeEndsAt,
  mockCreateAppointment,
  mockCreateManageToken,
  mockGetBookingSettingsForShop,
  mockGetEventTypeById,
  mockGetShopBySlug,
  mockNormalizePhoneNumber,
  mockValidateBookingConflict,
} = vi.hoisted(() => {
  class CalendarConflictError extends Error {
    public readonly conflictingEvent: {
      summary: string;
      start: string;
      end: string;
    } | null;

    constructor(
      message: string,
      conflictingEvent?: { summary: string; start: string; end: string } | null
    ) {
      super(message);
      this.name = "CalendarConflictError";
      this.conflictingEvent = conflictingEvent ?? null;
    }
  }

  class SlotTakenError extends Error {}
  class InvalidSlotError extends Error {}
  class ShopClosedError extends Error {}

  return {
    CalendarConflictErrorMock: CalendarConflictError,
    SlotTakenErrorMock: SlotTakenError,
    InvalidSlotErrorMock: InvalidSlotError,
    ShopClosedErrorMock: ShopClosedError,
    mockBuildBookingBaseUrl: vi.fn(),
    mockComputeEndsAt: vi.fn(),
    mockCreateAppointment: vi.fn(),
    mockCreateManageToken: vi.fn(),
    mockGetBookingSettingsForShop: vi.fn(),
    mockGetEventTypeById: vi.fn(),
    mockGetShopBySlug: vi.fn(),
    mockNormalizePhoneNumber: vi.fn(),
    mockValidateBookingConflict: vi.fn(),
  };
});

vi.mock("@/lib/booking", () => ({
  computeEndsAt: mockComputeEndsAt,
}));

vi.mock("@/lib/booking-url", () => ({
  buildBookingBaseUrl: mockBuildBookingBaseUrl,
}));

vi.mock("@/lib/calendar-conflicts", () => ({
  CalendarConflictError: CalendarConflictErrorMock,
  validateBookingConflict: mockValidateBookingConflict,
}));

vi.mock("@/lib/manage-tokens", () => ({
  createManageToken: mockCreateManageToken,
}));

vi.mock("@/lib/phone", () => ({
  normalizePhoneNumber: mockNormalizePhoneNumber,
}));

vi.mock("@/lib/queries/appointments", () => ({
  createAppointment: mockCreateAppointment,
  getBookingSettingsForShop: mockGetBookingSettingsForShop,
  SlotTakenError: SlotTakenErrorMock,
  InvalidSlotError: InvalidSlotErrorMock,
  ShopClosedError: ShopClosedErrorMock,
}));

vi.mock("@/lib/queries/event-types", () => ({
  getEventTypeById: mockGetEventTypeById,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopBySlug: mockGetShopBySlug,
}));

import { POST } from "./route";

describe("POST /api/bookings/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetShopBySlug.mockResolvedValue({
      id: "shop-1",
      slug: "demo-shop",
    });
    mockGetEventTypeById.mockResolvedValue(null);
    mockNormalizePhoneNumber.mockImplementation((phone: string) => phone);
    mockBuildBookingBaseUrl.mockReturnValue("http://localhost:3000/book/demo-shop");
    mockGetBookingSettingsForShop.mockResolvedValue({
      timezone: "UTC",
      slotMinutes: 60,
    });
    mockComputeEndsAt.mockReturnValue(new Date("2026-03-15T11:00:00.000Z"));
    mockValidateBookingConflict.mockResolvedValue(undefined);
    mockCreateAppointment.mockResolvedValue({
      appointment: {
        id: "appt-1",
        shopId: "shop-1",
        startsAt: new Date("2026-03-15T10:00:00.000Z"),
        endsAt: new Date("2026-03-15T11:00:00.000Z"),
        status: "booked",
        paymentStatus: "pending",
        paymentRequired: true,
        createdAt: new Date("2026-03-10T09:00:00.000Z"),
      },
      customer: {
        id: "cust-1",
        fullName: "Customer Name",
        phone: "+12025550123",
        email: "customer@example.com",
      },
      payment: null,
      amountCents: 0,
      currency: "USD",
      paymentRequired: false,
      clientSecret: null,
      bookingUrl: null,
    });
    mockCreateManageToken.mockResolvedValue("manage-token-1");
  });

  it("returns 409 without exposing conflict event details when calendar conflict is detected", async () => {
    mockValidateBookingConflict.mockRejectedValue(
      new CalendarConflictErrorMock(
        "This time conflicts with an existing calendar event",
        {
          summary: "Team Meeting",
          start: "2026-03-15T10:00:00.000Z",
          end: "2026-03-15T11:00:00.000Z",
        }
      )
    );

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "demo-shop",
        startsAt: "2026-03-15T10:00:00.000Z",
        customer: {
          fullName: "Customer Name",
          phone: "+12025550123",
          email: "customer@example.com",
        },
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      error?: string;
      conflictingEvent?: unknown;
    };

    expect(response.status).toBe(409);
    expect(body.error).toBe("This time conflicts with an existing calendar event");
    expect(body.conflictingEvent).toBeUndefined();
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  });

  it("creates appointment when there is no calendar conflict", async () => {
    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "demo-shop",
        startsAt: "2026-03-15T10:00:00.000Z",
        customer: {
          fullName: "Customer Name",
          phone: "+12025550123",
          email: "customer@example.com",
        },
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      appointment?: { id?: string };
      manageToken?: string;
    };

    expect(response.status).toBe(200);
    expect(mockValidateBookingConflict).toHaveBeenCalledWith({
      shopId: "shop-1",
      startsAt: new Date("2026-03-15T10:00:00.000Z"),
      endsAt: new Date("2026-03-15T11:00:00.000Z"),
      timezone: "UTC",
    });
    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTypeId: null,
        eventTypeDepositCents: null,
        durationMinutes: 60,
      })
    );
    expect(body.appointment?.id).toBe("appt-1");
    expect(body.manageToken).toBe("manage-token-1");
  });

  it("uses the selected event type duration and deposit override", async () => {
    mockGetEventTypeById.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      shopId: "shop-1",
      isActive: true,
      durationMinutes: 90,
      depositAmountCents: 5000,
    });
    mockComputeEndsAt.mockReturnValue(new Date("2026-03-15T11:30:00.000Z"));

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "demo-shop",
        startsAt: "2026-03-15T10:00:00.000Z",
        eventTypeId: "11111111-1111-4111-8111-111111111111",
        customer: {
          fullName: "Customer Name",
          phone: "+12025550123",
          email: "customer@example.com",
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockComputeEndsAt).toHaveBeenCalledWith({
      startsAt: new Date("2026-03-15T10:00:00.000Z"),
      timeZone: "UTC",
      slotMinutes: 60,
      durationMinutes: 90,
    });
    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTypeId: "11111111-1111-4111-8111-111111111111",
        eventTypeDepositCents: 5000,
        durationMinutes: 90,
      })
    );
  });

  it("returns 404 when the selected event type is missing or inactive", async () => {
    mockGetEventTypeById.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      shopId: "shop-1",
      isActive: false,
      durationMinutes: 90,
      depositAmountCents: 5000,
    });

    const request = new Request("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "demo-shop",
        startsAt: "2026-03-15T10:00:00.000Z",
        eventTypeId: "11111111-1111-4111-8111-111111111111",
        customer: {
          fullName: "Customer Name",
          phone: "+12025550123",
          email: "customer@example.com",
        },
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Event type not found");
    expect(mockComputeEndsAt).not.toHaveBeenCalled();
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  });
});
