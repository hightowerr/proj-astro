/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbFindAppointmentMock,
  dbFindPaymentMock,
  findManyPaymentsMock,
  getShopByOwnerIdMock,
  normalizeStripePaymentStatusMock,
  paymentIntentRetrieveMock,
  processRefundMock,
  requireAuthMock,
  stripeIsMockedMock,
  syncAppointmentCalendarEventMock,
  txFindAppointmentMock,
  txUpdateMock,
} = vi.hoisted(() => {
  const txUpdateWhereMock = vi.fn(() => ({
    returning: vi.fn(async () => [{ id: "appt-1" }]),
  }));
  const txUpdateSetMock = vi.fn(() => ({
    where: txUpdateWhereMock,
  }));
  const txUpdateMock = vi.fn(() => ({
    set: txUpdateSetMock,
  }));

  return {
    dbFindAppointmentMock: vi.fn(),
    dbFindPaymentMock: vi.fn(),
    findManyPaymentsMock: vi.fn(),
    getShopByOwnerIdMock: vi.fn(),
    normalizeStripePaymentStatusMock: vi.fn(),
    paymentIntentRetrieveMock: vi.fn(),
    processRefundMock: vi.fn(),
    requireAuthMock: vi.fn(),
    stripeIsMockedMock: vi.fn(),
    syncAppointmentCalendarEventMock: vi.fn(),
    txFindAppointmentMock: vi.fn(),
    txUpdateMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      appointments: {
        findFirst: dbFindAppointmentMock,
      },
      payments: {
        findFirst: dbFindPaymentMock,
        findMany: findManyPaymentsMock,
      },
    },
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        query: {
          appointments: {
            findFirst: txFindAppointmentMock,
          },
        },
        update: txUpdateMock,
      })
    ),
  },
}));

vi.mock("@/lib/queries/appointments", () => ({
  syncAppointmentCalendarEvent: syncAppointmentCalendarEventMock,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: getShopByOwnerIdMock,
}));

vi.mock("@/lib/session", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    paymentIntents: {
      retrieve: paymentIntentRetrieveMock,
    },
  }),
  normalizeStripePaymentStatus: normalizeStripePaymentStatusMock,
  stripeIsMocked: stripeIsMockedMock,
}));

vi.mock("@/lib/stripe-refund", () => ({
  processRefund: processRefundMock,
}));

import { POST } from "./route";

describe("POST /app/payments/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAuthMock.mockResolvedValue({
      user: { id: "user-1" },
    });
    getShopByOwnerIdMock.mockResolvedValue({ id: "shop-1" });
    stripeIsMockedMock.mockReturnValue(false);

    findManyPaymentsMock.mockResolvedValue([
      {
        id: "pay-1",
        appointmentId: "appt-1",
        shopId: "shop-1",
        stripePaymentIntentId: "pi_live_123",
        status: "requires_payment_method",
      },
    ]);
    paymentIntentRetrieveMock.mockResolvedValue({ status: "succeeded" });
    normalizeStripePaymentStatusMock.mockReturnValue("succeeded");
    processRefundMock.mockResolvedValue({
      success: true,
      refundId: "re_1",
      amount: 2000,
    });
  });

  it("issues a compensating refund for cancelled_no_payment_captured appointments", async () => {
    txFindAppointmentMock.mockResolvedValue({
      id: "appt-1",
      status: "cancelled",
      resolutionReason: "cancelled_no_payment_captured",
    });
    dbFindAppointmentMock.mockResolvedValue({
      id: "appt-1",
      status: "cancelled",
      resolutionReason: "cancelled_no_payment_captured",
    });
    dbFindPaymentMock.mockResolvedValue({
      id: "pay-1",
      status: "succeeded",
    });

    const response = await POST();
    const body = (await response.json()) as {
      updated?: number;
      errors?: string[];
    };

    expect(response.status).toBe(200);
    expect(body.updated).toBe(1);
    expect(body.errors).toEqual([]);
    expect(processRefundMock).toHaveBeenCalledTimes(1);
    expect(syncAppointmentCalendarEventMock).not.toHaveBeenCalled();
  });

  it("books pending appointments on successful payment and syncs calendar", async () => {
    txFindAppointmentMock.mockResolvedValue({
      id: "appt-1",
      status: "pending",
      resolutionReason: null,
    });

    const response = await POST();
    const body = (await response.json()) as {
      updated?: number;
      errors?: string[];
    };

    expect(response.status).toBe(200);
    expect(body.updated).toBe(1);
    expect(body.errors).toEqual([]);
    expect(syncAppointmentCalendarEventMock).toHaveBeenCalledWith("appt-1");
    expect(processRefundMock).not.toHaveBeenCalled();
  });
});
