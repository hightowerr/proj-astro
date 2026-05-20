/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockGetShopByOwnerId,
  mockProcessRefund,
  mockRevalidatePath,
  mockFindFirstPayment,
  mockFindFirstAppointment,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockProcessRefund: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFindFirstPayment: vi.fn(),
  mockFindFirstAppointment: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/stripe-refund", () => ({
  processRefund: mockProcessRefund,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      payments: { findFirst: mockFindFirstPayment },
      appointments: { findFirst: mockFindFirstAppointment },
    },
  },
}));

import { issueRefundAction } from "./actions";

const PAYMENT = {
  id: "pay-1",
  shopId: "shop-1",
  appointmentId: "appt-1",
  stripeRefundId: null as string | null,
};

const APPOINTMENT = {
  id: "appt-1",
  financialOutcome: "settled" as string,
};

describe("issueRefundAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockFindFirstPayment.mockResolvedValue({ ...PAYMENT });
    mockFindFirstAppointment.mockResolvedValue({ ...APPOINTMENT });
    mockProcessRefund.mockResolvedValue({ refundId: "re_1" });
  });

  it("processes refund and revalidates paths", async () => {
    await issueRefundAction("pay-1");

    expect(mockProcessRefund).toHaveBeenCalledWith({
      appointment: APPOINTMENT,
      payment: PAYMENT,
      cutoffTime: expect.any(Date),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/settings/billing");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/appointments/appt-1");
  });

  it("throws when user has no shop", async () => {
    mockGetShopByOwnerId.mockResolvedValue(null);

    await expect(issueRefundAction("pay-1")).rejects.toThrow("Unauthorized");
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("throws when payment is not found", async () => {
    mockFindFirstPayment.mockResolvedValue(null);

    await expect(issueRefundAction("pay-1")).rejects.toThrow("Payment not found");
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("throws when appointment is not found", async () => {
    mockFindFirstAppointment.mockResolvedValue(null);

    await expect(issueRefundAction("pay-1")).rejects.toThrow("Appointment not found");
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("throws when already refunded", async () => {
    mockFindFirstPayment.mockResolvedValue({
      ...PAYMENT,
      stripeRefundId: "re_existing",
    });

    await expect(issueRefundAction("pay-1")).rejects.toThrow("Already refunded");
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("throws when payment is under dispute", async () => {
    mockFindFirstAppointment.mockResolvedValue({
      ...APPOINTMENT,
      financialOutcome: "disputed",
    });

    await expect(issueRefundAction("pay-1")).rejects.toThrow(
      "Payment is under dispute"
    );
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });
});
