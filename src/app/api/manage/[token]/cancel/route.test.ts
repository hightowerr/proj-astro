/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSlotOpeningFromCancellationMock,
  deleteCalendarEventMock,
  invalidateCalendarCacheMock,
  processRefundMock,
  validateTokenMock,
  autoResolveAlertMock,
  calculateCancellationEligibilityMock,
  paymentIntentCancelMock,
  paymentIntentRetrieveMock,
  stripeIsMockedMock,
  dbMock,
} = vi.hoisted(() => {
  const selectLimitMock = vi.fn();
  const selectBuilder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: selectLimitMock,
  };
  selectBuilder.from.mockReturnValue(selectBuilder);
  selectBuilder.innerJoin.mockReturnValue(selectBuilder);
  selectBuilder.leftJoin.mockReturnValue(selectBuilder);
  selectBuilder.where.mockReturnValue(selectBuilder);

  return {
    createSlotOpeningFromCancellationMock: vi.fn(),
    deleteCalendarEventMock: vi.fn(),
    invalidateCalendarCacheMock: vi.fn(),
    processRefundMock: vi.fn(),
    validateTokenMock: vi.fn(),
    autoResolveAlertMock: vi.fn(),
    calculateCancellationEligibilityMock: vi.fn(),
    paymentIntentCancelMock: vi.fn(),
    paymentIntentRetrieveMock: vi.fn(),
    stripeIsMockedMock: vi.fn(() => true),
    dbMock: {
      select: vi.fn(() => selectBuilder),
      transaction: vi.fn(),
      __selectLimitMock: selectLimitMock,
    },
  };
});

vi.mock("@/lib/cancellation", () => ({
  calculateCancellationEligibility: calculateCancellationEligibilityMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/google-calendar", () => ({
  deleteCalendarEvent: deleteCalendarEventMock,
  autoResolveAlert: autoResolveAlertMock,
}));

vi.mock("@/lib/google-calendar-cache", () => ({
  invalidateCalendarCache: invalidateCalendarCacheMock,
}));

vi.mock("@/lib/manage-tokens", () => ({
  validateToken: validateTokenMock,
}));

vi.mock("@/lib/slot-recovery", () => ({
  createSlotOpeningFromCancellation: createSlotOpeningFromCancellationMock,
}));

vi.mock("@/lib/stripe-refund", () => ({
  processRefund: processRefundMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    paymentIntents: {
      retrieve: paymentIntentRetrieveMock,
      cancel: paymentIntentCancelMock,
    },
  }),
  stripeIsMocked: stripeIsMockedMock,
  normalizeStripePaymentStatus: (status: string) => {
    switch (status) {
      case "requires_payment_method":
      case "requires_action":
      case "processing":
      case "succeeded":
      case "canceled":
        return status;
      default:
        return "processing";
    }
  },
}));

import { POST } from "./route";

const makeRow = (overrides?: {
  calendarEventId?: string | null;
  appointmentStatus?: "booked" | "pending" | "cancelled";
  payment?: {
    id: string;
    amountCents: number;
    status: string;
    stripePaymentIntentId: string | null;
  } | null;
}) => ({
  appointment: {
    id: "appt-1",
    shopId: "shop-1",
    status: overrides?.appointmentStatus ?? "booked",
    startsAt: new Date("2026-03-20T10:00:00.000Z"),
    calendarEventId:
      overrides && "calendarEventId" in overrides
        ? overrides.calendarEventId
        : "event-1",
  },
  policy: {
    cancelCutoffMinutes: 60,
    refundBeforeCutoff: true,
  },
  timezone: "UTC",
  payment:
    overrides?.payment ??
    ({
      id: "pay-1",
      status: "succeeded",
      amountCents: 2000,
      stripePaymentIntentId: "pi_test_123",
    } as {
      id: string;
      amountCents: number;
      status: string;
      stripePaymentIntentId: string | null;
    }),
});

describe("POST /api/manage/[token]/cancel (calendar cleanup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    validateTokenMock.mockResolvedValue("appt-1");
    dbMock.__selectLimitMock.mockResolvedValue([makeRow()]);
    calculateCancellationEligibilityMock.mockReturnValue({
      isEligibleForRefund: true,
      cutoffTime: new Date("2026-03-19T10:00:00.000Z"),
    });
    processRefundMock.mockResolvedValue({
      refundId: "re_1",
    });
    createSlotOpeningFromCancellationMock.mockResolvedValue(undefined);
    deleteCalendarEventMock.mockResolvedValue(true);
    autoResolveAlertMock.mockResolvedValue(undefined);
    invalidateCalendarCacheMock.mockResolvedValue(undefined);
    dbMock.transaction.mockResolvedValue({ updated: true });
    paymentIntentRetrieveMock.mockReset();
    paymentIntentCancelMock.mockReset();
    stripeIsMockedMock.mockReturnValue(true);
  });

  it("deletes calendar event and invalidates cache on refund-eligible cancellation", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(deleteCalendarEventMock).toHaveBeenCalledWith({
      shopId: "shop-1",
      calendarEventId: "event-1",
    });
    expect(autoResolveAlertMock).toHaveBeenCalledWith("shop-1", "event-1");
    expect(invalidateCalendarCacheMock).toHaveBeenCalledWith("shop-1", "2026-03-20");
  });

  it("still cancels successfully when calendar deletion fails", async () => {
    deleteCalendarEventMock.mockResolvedValue(false);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(autoResolveAlertMock).not.toHaveBeenCalled();
    expect(invalidateCalendarCacheMock).not.toHaveBeenCalled();
  });

  it("still invalidates cache when auto-resolve alert fails", async () => {
    autoResolveAlertMock.mockRejectedValue(new Error("stub failed"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(deleteCalendarEventMock).toHaveBeenCalledTimes(1);
    expect(autoResolveAlertMock).toHaveBeenCalledTimes(1);
    expect(invalidateCalendarCacheMock).toHaveBeenCalledWith("shop-1", "2026-03-20");
  });

  it("skips calendar deletion when appointment has no calendar event id", async () => {
    dbMock.__selectLimitMock.mockResolvedValue([makeRow({ calendarEventId: null })]);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(deleteCalendarEventMock).not.toHaveBeenCalled();
    expect(invalidateCalendarCacheMock).not.toHaveBeenCalled();
  });

  it("runs calendar cleanup in no-refund path after transaction update", async () => {
    calculateCancellationEligibilityMock.mockReturnValue({
      isEligibleForRefund: false,
      cutoffTime: new Date("2026-03-19T10:00:00.000Z"),
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(dbMock.transaction).toHaveBeenCalled();
    expect(deleteCalendarEventMock).toHaveBeenCalledTimes(1);
    expect(invalidateCalendarCacheMock).toHaveBeenCalledTimes(1);
  });

  it("cancels pending payment bookings without attempting a refund", async () => {
    dbMock.__selectLimitMock.mockResolvedValue([
      makeRow({
        appointmentStatus: "pending",
        calendarEventId: null,
        payment: {
          id: "pay-1",
          status: "requires_payment_method",
          amountCents: 2000,
          stripePaymentIntentId: "pi_test_123",
        },
      }),
    ]);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    const body = (await response.json()) as { message?: string };

    expect(response.status).toBe(200);
    expect(processRefundMock).not.toHaveBeenCalled();
    expect(body.message).toBe("Booking cancelled. No payment was taken.");
    expect(deleteCalendarEventMock).not.toHaveBeenCalled();
  });

  it("refunds pending bookings when Stripe already captured payment", async () => {
    stripeIsMockedMock.mockReturnValue(false);
    paymentIntentRetrieveMock.mockResolvedValue({ status: "succeeded" });
    dbMock.__selectLimitMock.mockResolvedValue([
      makeRow({
        appointmentStatus: "pending",
        payment: {
          id: "pay-1",
          status: "requires_payment_method",
          amountCents: 2000,
          stripePaymentIntentId: "pi_live_123",
        },
      }),
    ]);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    const body = (await response.json()) as { refunded?: boolean; message?: string };

    expect(response.status).toBe(200);
    expect(body.refunded).toBe(true);
    expect(body.message).toContain("Refunded");
    expect(processRefundMock).toHaveBeenCalledTimes(1);
    expect(paymentIntentCancelMock).not.toHaveBeenCalled();
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });
});
