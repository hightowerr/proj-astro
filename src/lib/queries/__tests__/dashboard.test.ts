import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  fromMock,
  innerJoinMock,
  leftJoinMock,
  whereMock,
  orderByMock,
  groupByMock,
  setRows,
} = vi.hoisted(() => {
  let rows: unknown[] = [];

  const chain = {
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve(rows)),
  };

  const fromMock = vi.fn(() => chain);
  const selectMock = vi.fn(() => ({ from: fromMock }));

  const setRows = (nextRows: unknown[]) => {
    rows = nextRows;
  };

  return {
    selectMock,
    fromMock,
    innerJoinMock: chain.innerJoin,
    leftJoinMock: chain.leftJoin,
    whereMock: chain.where,
    orderByMock: chain.orderBy,
    groupByMock: chain.groupBy,
    setRows,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

const {
  getAllUpcomingAppointments,
  getHighRiskAppointments,
  getMonthlyFinancialStats,
  getTierDistribution,
  getTotalUpcomingCount,
} = await import("@/lib/queries/dashboard");

describe("dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRows([]);
  });

  it("returns total upcoming appointment count", async () => {
    setRows([{ count: 5 }]);

    const result = await getTotalUpcomingCount("shop-1");

    expect(result).toBe(5);
    expect(selectMock).toHaveBeenCalledOnce();
    expect(fromMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
  });

  it("returns 0 upcoming count when there are no rows", async () => {
    setRows([]);

    const result = await getTotalUpcomingCount("shop-1");

    expect(result).toBe(0);
  });

  it("maps monthly financial stats from grouped outcomes", async () => {
    setRows([
      { financialOutcome: "settled", total: 12000 },
      { financialOutcome: "refunded", total: 3000 },
    ]);

    const result = await getMonthlyFinancialStats("shop-1");

    expect(result).toEqual({
      depositsRetained: 12000,
      refundsIssued: 3000,
    });
    expect(groupByMock).toHaveBeenCalledOnce();
  });

  it("maps tier distribution totals", async () => {
    setRows([
      { tier: "top", count: 4 },
      { tier: "neutral", count: 3 },
      { tier: "risk", count: 1 },
    ]);

    const result = await getTierDistribution("shop-1");

    expect(result).toEqual({ top: 4, neutral: 3, risk: 1 });
    expect(leftJoinMock).toHaveBeenCalledOnce();
    expect(groupByMock).toHaveBeenCalledOnce();
  });

  it("returns high-risk appointments sorted by start time", async () => {
    const mockRows = [
      {
        id: "appt-1",
        startsAt: new Date("2026-04-01T10:00:00.000Z"),
        endsAt: new Date("2026-04-01T11:00:00.000Z"),
        customerName: "Avery Park",
        customerEmail: "avery@example.com",
        customerPhone: "+12025550100",
        customerTier: "risk",
        customerScore: 32,
        voidedLast90Days: 2,
        confirmationStatus: "none",
        bookingUrl: "https://example.com/manage/appt-1",
      },
    ];
    setRows(mockRows);

    const result = await getHighRiskAppointments("shop-1", 168);

    expect(result).toEqual(mockRows);
    expect(innerJoinMock).toHaveBeenCalledOnce();
    expect(leftJoinMock).toHaveBeenCalledTimes(2);
    expect(orderByMock).toHaveBeenCalledOnce();
  });

  it("returns all upcoming appointments for table rendering", async () => {
    const mockRows = [
      {
        id: "appt-2",
        startsAt: new Date("2026-04-03T10:00:00.000Z"),
        endsAt: new Date("2026-04-03T11:00:00.000Z"),
        customerName: "Jordan Lee",
        customerEmail: "jordan@example.com",
        customerPhone: "+12025550101",
        customerTier: "top",
        customerScore: 95,
        voidedLast90Days: 0,
        confirmationStatus: "none",
        bookingUrl: "https://example.com/manage/appt-2",
      },
    ];
    setRows(mockRows);

    const result = await getAllUpcomingAppointments("shop-1");

    expect(result).toEqual(mockRows);
    expect(orderByMock).toHaveBeenCalledOnce();
  });
});
