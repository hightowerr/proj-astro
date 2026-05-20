/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetShopBySlug,
  mockCreateAppointment,
  mockCreateManageToken,
  mockNormalizePhoneNumber,
  mockBuildBookingBaseUrl,
  InvalidSlotErrorClass,
  ShopClosedErrorClass,
  SlotTakenErrorClass,
} = vi.hoisted(() => {
  class InvalidSlotErrorClass extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "InvalidSlotError";
    }
  }
  class ShopClosedErrorClass extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ShopClosedError";
    }
  }
  class SlotTakenErrorClass extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "SlotTakenError";
    }
  }
  return {
    mockGetShopBySlug: vi.fn(),
    mockCreateAppointment: vi.fn(),
    mockCreateManageToken: vi.fn(),
    mockNormalizePhoneNumber: vi.fn(),
    mockBuildBookingBaseUrl: vi.fn(),
    InvalidSlotErrorClass,
    ShopClosedErrorClass,
    SlotTakenErrorClass,
  };
});

vi.mock("@/lib/queries/shops", () => ({
  getShopBySlug: mockGetShopBySlug,
}));

vi.mock("@/lib/queries/appointments", () => ({
  createAppointment: mockCreateAppointment,
  InvalidSlotError: InvalidSlotErrorClass,
  ShopClosedError: ShopClosedErrorClass,
  SlotTakenError: SlotTakenErrorClass,
}));

vi.mock("@/lib/manage-tokens", () => ({
  createManageToken: mockCreateManageToken,
}));

vi.mock("@/lib/phone", () => ({
  normalizePhoneNumber: mockNormalizePhoneNumber,
}));

vi.mock("@/lib/booking-url", () => ({
  buildBookingBaseUrl: mockBuildBookingBaseUrl,
}));

import { POST } from "./route";

const validBody = {
  shop: "test-shop",
  startsAt: "2026-06-01T10:00:00.000Z",
  customer: {
    fullName: "Jane Doe",
    phone: "+12025551234",
    email: "jane@example.com",
    smsOptIn: true,
    emailOptIn: true,
  },
};

const makeRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const appointmentResult = {
  appointment: {
    id: "appt-1",
    shopId: "shop-1",
    startsAt: new Date("2026-06-01T10:00:00.000Z"),
    endsAt: new Date("2026-06-01T11:00:00.000Z"),
    status: "pending",
    paymentStatus: "pending",
    paymentRequired: true,
    createdAt: new Date(),
    bookingUrl: "http://localhost:3000/book/test-shop?booking=appt-1",
  },
  customer: {
    id: "cust-1",
    fullName: "Jane Doe",
    phone: "+12025551234",
    email: "jane@example.com",
  },
  payment: {
    id: "pay-1",
    status: "pending",
    amountCents: 2500,
    currency: "usd",
  },
  amountCents: 2500,
  currency: "usd",
  paymentRequired: true,
  clientSecret: "pi_test_secret",
  bookingUrl: "http://localhost:3000/book/test-shop?booking=appt-1",
};

describe("POST /api/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetShopBySlug.mockResolvedValue({ id: "shop-1", slug: "test-shop" });
    mockNormalizePhoneNumber.mockReturnValue("+12025551234");
    mockBuildBookingBaseUrl.mockReturnValue("http://localhost:3000/book/test-shop");
    mockCreateAppointment.mockResolvedValue(appointmentResult);
    mockCreateManageToken.mockResolvedValue("token-abc");
  });

  it("creates an appointment and returns 200", async () => {
    const response = await POST(makeRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appointment.id).toBe("appt-1");
    expect(body.manageToken).toBe("token-abc");
    expect(body.clientSecret).toBe("pi_test_secret");
    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        paymentsEnabled: true,
      })
    );
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      body: "not json{",
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid JSON");
  });

  it("returns 400 for missing required fields", async () => {
    const response = await POST(makeRequest({ shop: "test" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid request");
  });

  it("returns 404 when shop not found", async () => {
    mockGetShopBySlug.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Shop not found");
  });

  it("returns 400 for invalid phone number", async () => {
    mockNormalizePhoneNumber.mockImplementation(() => {
      throw new Error("Invalid phone number");
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid phone number");
  });

  it("returns 409 when slot is taken", async () => {
    mockCreateAppointment.mockRejectedValue(
      new SlotTakenErrorClass("Slot taken")
    );

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Slot taken");
  });

  it("returns 400 for invalid slot", async () => {
    mockCreateAppointment.mockRejectedValue(
      new InvalidSlotErrorClass("Slot does not align with schedule")
    );

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(
      "Slot does not align with schedule"
    );
  });

  it("returns 400 when shop is closed", async () => {
    mockCreateAppointment.mockRejectedValue(
      new ShopClosedErrorClass("Shop is closed on this day")
    );

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Shop is closed on this day");
  });

  it("returns 500 for unexpected errors", async () => {
    mockCreateAppointment.mockRejectedValue(new Error("DB connection failed"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to create appointment");
  });
});
