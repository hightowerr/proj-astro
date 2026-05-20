/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSelectLimit,
  mockDbSelect,
  mockFindFirst,
  mockCreateManageToken,
  mockGetStripeClient,
  mockStripeIsMocked,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockDbWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockDbLeftJoin = vi.fn().mockReturnValue({ where: mockDbWhere });
  const mockDbFrom = vi.fn().mockReturnValue({ leftJoin: mockDbLeftJoin });

  return {
    mockSelectLimit,
    mockDbSelect: vi.fn().mockReturnValue({ from: mockDbFrom }),
    mockFindFirst: vi.fn(),
    mockCreateManageToken: vi.fn(),
    mockGetStripeClient: vi.fn(),
    mockStripeIsMocked: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    query: {
      bookingManageTokens: { findFirst: mockFindFirst },
    },
  },
}));

vi.mock("@/lib/manage-tokens", () => ({
  createManageToken: mockCreateManageToken,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: mockGetStripeClient,
  stripeIsMocked: mockStripeIsMocked,
}));

vi.mock("@/lib/schema", () => ({
  appointments: { id: "id" },
  payments: { id: "id", appointmentId: "appointmentId" },
}));

import { GET } from "./route";

const BOOKING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const makeRequest = () =>
  new Request(`http://localhost:3000/api/bookings/${BOOKING_ID}`);

const makeParams = (bookingId: string) => ({
  params: Promise.resolve({ bookingId }),
});

const baseRow = {
  appointmentId: BOOKING_ID,
  startsAt: new Date("2026-06-01T10:00:00Z"),
  endsAt: new Date("2026-06-01T11:00:00Z"),
  status: "booked",
  paymentStatus: "paid",
  paymentRequired: true,
  bookingUrl: "http://localhost:3000/book/test?booking=abc",
  paymentId: "pay-1",
  paymentProviderStatus: "succeeded",
  paymentIntentId: "pi_test_123",
  amountCents: 2500,
  currency: "usd",
};

describe("GET /api/bookings/[bookingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLimit.mockResolvedValue([{ ...baseRow }]);
    mockFindFirst.mockResolvedValue(null);
    mockCreateManageToken.mockResolvedValue("new-token");
    mockStripeIsMocked.mockReturnValue(true);
  });

  it("returns booking details with manage token", async () => {
    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appointment.id).toBe(BOOKING_ID);
    expect(body.payment.id).toBe("pay-1");
    expect(body.manageToken).toBe("new-token");
  });

  it("does not create manage token if one exists", async () => {
    mockFindFirst.mockResolvedValue({ id: "existing-token" });

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.manageToken).toBeNull();
    expect(mockCreateManageToken).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid UUID", async () => {
    const response = await GET(makeRequest(), makeParams("not-a-uuid"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid booking id");
  });

  it("returns 404 when booking not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Booking not found");
  });

  it("returns 404 when payment record is missing but required", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, paymentRequired: true, paymentId: null },
    ]);

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Payment record missing");
  });

  it("returns mock client secret in test mode", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, paymentProviderStatus: "requires_payment_method" },
    ]);
    mockStripeIsMocked.mockReturnValue(true);

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clientSecret).toBe("pi_test_secret_pay-1");
    expect(body.usePaymentSimulator).toBe(true);
  });

  it("retrieves real client secret from Stripe", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, paymentProviderStatus: "requires_payment_method" },
    ]);
    mockStripeIsMocked.mockReturnValue(false);
    mockGetStripeClient.mockReturnValue({
      paymentIntents: {
        retrieve: vi.fn().mockResolvedValue({ client_secret: "pi_live_secret" }),
      },
    });

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clientSecret).toBe("pi_live_secret");
    expect(body.usePaymentSimulator).toBe(false);
  });

  it("returns 502 when Stripe fails", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, paymentProviderStatus: "requires_payment_method" },
    ]);
    mockStripeIsMocked.mockReturnValue(false);
    mockGetStripeClient.mockReturnValue({
      paymentIntents: {
        retrieve: vi.fn().mockRejectedValue(new Error("Stripe is down")),
      },
    });

    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Failed to load payment intent");
  });

  it("skips client secret when payment already succeeded", async () => {
    const response = await GET(makeRequest(), makeParams(BOOKING_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clientSecret).toBeNull();
  });
});
