/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireShopAuth,
  mockGetShopByOwnerId,
  mockDismissAlert,
  mockResolveAlertsForCancelledAppointment,
  mockDeleteCalendarEvent,
  mockAutoResolveAlert,
  mockInvalidateCalendarCache,
  mockProcessRefund,
  mockCreateSlotOpeningFromCancellation,
  mockCalculateCancellationEligibility,
  mockRevalidatePath,
  mockSelectLimit,
  mockDbSelect,
  mockTransaction,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockLeftJoin3 = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockLeftJoin2 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin3 });
  const mockLeftJoin = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockRequireShopAuth: vi.fn(),
    mockGetShopByOwnerId: vi.fn(),
    mockDismissAlert: vi.fn(),
    mockResolveAlertsForCancelledAppointment: vi.fn(),
    mockDeleteCalendarEvent: vi.fn(),
    mockAutoResolveAlert: vi.fn(),
    mockInvalidateCalendarCache: vi.fn(),
    mockProcessRefund: vi.fn(),
    mockCreateSlotOpeningFromCancellation: vi.fn(),
    mockCalculateCancellationEligibility: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockSelectLimit,
    mockDbSelect: mockSelect as ReturnType<typeof vi.fn>,
    mockTransaction: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/session", () => ({
  requireShopAuth: mockRequireShopAuth,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/queries/calendar-conflicts", () => ({
  dismissAlert: mockDismissAlert,
  resolveAlertsForCancelledAppointment: mockResolveAlertsForCancelledAppointment,
}));

vi.mock("@/lib/google-calendar", () => ({
  deleteCalendarEvent: mockDeleteCalendarEvent,
  autoResolveAlert: mockAutoResolveAlert,
}));

vi.mock("@/lib/google-calendar-cache", () => ({
  invalidateCalendarCache: mockInvalidateCalendarCache,
}));

vi.mock("@/lib/stripe-refund", () => ({
  processRefund: mockProcessRefund,
}));

vi.mock("@/lib/slot-recovery", () => ({
  createSlotOpeningFromCancellation: mockCreateSlotOpeningFromCancellation,
}));

vi.mock("@/lib/cancellation", () => ({
  calculateCancellationEligibility: mockCalculateCancellationEligibility,
}));

vi.mock("@/lib/booking", () => ({
  formatDateInTimeZone: vi.fn(() => "2026-06-01"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    transaction: mockTransaction,
  },
}));

vi.mock("@/lib/schema", () => ({
  appointments: { id: "id", shopId: "shopId", status: "status", policyVersionId: "policyVersionId" },
  appointmentEvents: { id: "id", shopId: "shopId" },
  bookingSettings: { shopId: "shopId", timezone: "timezone" },
  policyVersions: { id: "id" },
  payments: { appointmentId: "appointmentId" },
}));

import {
  cancelAppointmentFromConflict,
  dismissConflictAction,
} from "./actions";

const cutoffTime = new Date("2026-05-31T10:00:00Z");

const baseRow = {
  appointment: {
    id: "appt-1",
    shopId: "shop-1",
    status: "booked" as const,
    startsAt: new Date("2026-06-01T10:00:00Z"),
    calendarEventId: "cal-event-1",
    policyVersionId: "policy-1",
  },
  policy: {
    cancelCutoffMinutes: 60,
    refundBeforeCutoff: true,
  },
  timezone: "UTC",
  payment: {
    id: "pay-1",
    status: "succeeded",
    amountCents: 2500,
    stripePaymentIntentId: "pi_test_123",
  },
};

describe("dismissConflictAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireShopAuth.mockResolvedValue({ session: { user: { id: "user-1" } }, shop: { id: "shop-1" }, isPastDue: false });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockDismissAlert.mockResolvedValue(true);
  });

  it("dismisses alert and revalidates", async () => {
    const result = await dismissConflictAction("alert-1");

    expect(result).toEqual({ success: true });
    expect(mockDismissAlert).toHaveBeenCalledWith("alert-1", "shop-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/conflicts");
  });

  it("returns error when shop not found", async () => {
    mockGetShopByOwnerId.mockResolvedValue(null);

    const result = await dismissConflictAction("alert-1");

    expect(result).toEqual({ success: false, error: "Shop not found" });
  });

  it("returns error when alert not found", async () => {
    mockDismissAlert.mockResolvedValue(false);

    const result = await dismissConflictAction("alert-1");

    expect(result).toEqual({ success: false, error: "Conflict alert not found" });
  });

  it("catches unexpected errors gracefully", async () => {
    mockRequireShopAuth.mockRejectedValue(new Error("Auth down"));

    const result = await dismissConflictAction("alert-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to dismiss conflict");
  });
});

describe("cancelAppointmentFromConflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireShopAuth.mockResolvedValue({ session: { user: { id: "user-1" } }, shop: { id: "shop-1" }, isPastDue: false });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockSelectLimit.mockResolvedValue([{ ...baseRow }]);
    mockCalculateCancellationEligibility.mockReturnValue({
      isEligibleForRefund: true,
      cutoffTime,
    });
    mockProcessRefund.mockResolvedValue({ refundId: "re_1" });
    mockDeleteCalendarEvent.mockResolvedValue(true);
    mockAutoResolveAlert.mockResolvedValue(undefined);
    mockInvalidateCalendarCache.mockResolvedValue(undefined);
    mockResolveAlertsForCancelledAppointment.mockResolvedValue(undefined);
    mockCreateSlotOpeningFromCancellation.mockResolvedValue(undefined);
  });

  it("cancels with refund when eligible", async () => {
    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({ success: true, refunded: true, amount: 25 });
    expect(mockProcessRefund).toHaveBeenCalledWith({
      appointment: baseRow.appointment,
      payment: baseRow.payment,
      cutoffTime,
    });
    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith({
      shopId: "shop-1",
      calendarEventId: "cal-event-1",
    });
    expect(mockResolveAlertsForCancelledAppointment).toHaveBeenCalledWith("appt-1", "shop-1");
    expect(mockCreateSlotOpeningFromCancellation).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/conflicts");
  });

  it("cancels without refund after cutoff", async () => {
    mockCalculateCancellationEligibility.mockReturnValue({
      isEligibleForRefund: false,
      cutoffTime,
    });
    mockTransaction.mockResolvedValue({ updated: true });

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({ success: true, refunded: false, amount: 0 });
    expect(mockProcessRefund).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns error when shop not found", async () => {
    mockGetShopByOwnerId.mockResolvedValue(null);

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({ success: false, error: "Shop not found" });
  });

  it("returns error when appointment not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({ success: false, error: "Appointment not found" });
  });

  it("returns error when appointment is not booked", async () => {
    mockSelectLimit.mockResolvedValue([
      {
        ...baseRow,
        appointment: { ...baseRow.appointment, status: "cancelled" },
      },
    ]);

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({
      success: false,
      error: "Appointment is already cancelled",
    });
  });

  it("returns error when payment missing for refund-eligible cancellation", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, payment: null },
    ]);

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({
      success: false,
      error: "Payment information missing for refund",
    });
  });

  it("returns error when transaction update finds appointment already cancelled", async () => {
    mockCalculateCancellationEligibility.mockReturnValue({
      isEligibleForRefund: false,
      cutoffTime,
    });
    mockTransaction.mockResolvedValue({ updated: false });

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result).toEqual({
      success: false,
      error: "Appointment is no longer booked",
    });
  });

  it("skips calendar cleanup when no calendar event id", async () => {
    mockSelectLimit.mockResolvedValue([
      {
        ...baseRow,
        appointment: { ...baseRow.appointment, calendarEventId: null },
      },
    ]);

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result.success).toBe(true);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it("catches unexpected errors gracefully", async () => {
    mockRequireShopAuth.mockRejectedValue(new Error("Auth down"));

    const result = await cancelAppointmentFromConflict("appt-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to cancel appointment");
  });
});
