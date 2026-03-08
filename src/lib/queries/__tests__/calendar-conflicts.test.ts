import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  fromMock,
  whereMock,
  innerJoinMock,
  orderByMock,
  updateMock,
  updateSetMock,
  updateWhereMock,
  updateReturningMock,
} = vi.hoisted(() => {
  const orderByMock = vi.fn();
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const innerJoinMock = vi.fn(() => ({ innerJoin: innerJoinMock, where: whereMock }));
  const fromMock = vi.fn(() => ({ where: whereMock, innerJoin: innerJoinMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  return {
    selectMock,
    fromMock,
    whereMock,
    innerJoinMock,
    orderByMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
    updateReturningMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

const {
  dismissAlert,
  getConflictCount,
  getConflicts,
  resolveAlertsForCancelledAppointment,
} = await import("@/lib/queries/calendar-conflicts");

describe("calendar-conflicts queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    orderByMock.mockResolvedValue([]);
    whereMock.mockReturnValue({ orderBy: orderByMock });
    innerJoinMock.mockReturnValue({ innerJoin: innerJoinMock, where: whereMock });
    fromMock.mockReturnValue({ where: whereMock, innerJoin: innerJoinMock });
    selectMock.mockReturnValue({ from: fromMock });

    updateReturningMock.mockResolvedValue([]);
    updateWhereMock.mockReturnValue({ returning: updateReturningMock });
    updateSetMock.mockReturnValue({ where: updateWhereMock });
    updateMock.mockReturnValue({ set: updateSetMock });
  });

  it("returns pending conflict count", async () => {
    whereMock.mockResolvedValue([{ count: 3 }] as any);

    const result = await getConflictCount("shop-1");

    expect(result).toBe(3);
    expect(selectMock).toHaveBeenCalledOnce();
    expect(fromMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
  });

  it("returns 0 conflict count when DB returns no row", async () => {
    whereMock.mockResolvedValue([] as any);

    const result = await getConflictCount("shop-1");

    expect(result).toBe(0);
  });

  it("returns joined pending conflicts", async () => {
    const mockRow = {
      id: "alert-1",
      appointmentId: "appt-1",
      appointmentStartsAt: new Date("2026-04-01T13:00:00.000Z"),
      appointmentEndsAt: new Date("2026-04-01T14:00:00.000Z"),
      customerName: "Alex Carter",
      customerEmail: "alex@example.com",
      customerPhone: "+12025550100",
      calendarEventId: "evt-1",
      eventSummary: "Staff Meeting",
      eventStart: new Date("2026-04-01T13:30:00.000Z"),
      eventEnd: new Date("2026-04-01T14:30:00.000Z"),
      severity: "high" as const,
      detectedAt: new Date("2026-04-01T10:00:00.000Z"),
    };

    orderByMock.mockResolvedValue([mockRow]);

    const result = await getConflicts("shop-1");

    expect(result).toEqual([mockRow]);
    expect(innerJoinMock).toHaveBeenCalledTimes(2);
    expect(whereMock).toHaveBeenCalledOnce();
    expect(orderByMock).toHaveBeenCalledOnce();
  });

  it("dismisses only pending alerts in the same shop", async () => {
    updateReturningMock.mockResolvedValue([{ id: "alert-1" }]);

    const result = await dismissAlert("alert-1", "shop-1");

    expect(result).toBe(true);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(updateSetMock).toHaveBeenCalledOnce();
    expect(updateWhereMock).toHaveBeenCalledOnce();
  });

  it("returns false when dismiss update affects no rows", async () => {
    updateReturningMock.mockResolvedValue([]);

    const result = await dismissAlert("missing", "shop-1");

    expect(result).toBe(false);
  });

  it("resolves all pending alerts for a cancelled appointment", async () => {
    updateReturningMock.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);

    const updatedCount = await resolveAlertsForCancelledAppointment("appt-1", "shop-1");

    expect(updatedCount).toBe(2);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(updateSetMock).toHaveBeenCalledOnce();
    expect(updateWhereMock).toHaveBeenCalledOnce();
  });
});
