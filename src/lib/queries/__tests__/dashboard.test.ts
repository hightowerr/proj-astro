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
  setRowSequence,
} = vi.hoisted(() => {
  let rows: unknown[] = [];
  let rowSequence: unknown[][] = [];

  const innerJoinMock = vi.fn();
  const leftJoinMock = vi.fn();
  const whereMock = vi.fn();
  const orderByMock = vi.fn();
  const groupByMock = vi.fn();

  const makeChain = (nextRows: unknown[]) => {
    const chain = {
      innerJoin: (...args: unknown[]) => {
        innerJoinMock(...args);
        return chain;
      },
      leftJoin: (...args: unknown[]) => {
        leftJoinMock(...args);
        return chain;
      },
      where: (...args: unknown[]) => {
        whereMock(...args);
        return chain;
      },
      orderBy: (...args: unknown[]) => {
        orderByMock(...args);
        return chain;
      },
      groupBy: (...args: unknown[]) => {
        groupByMock(...args);
        return chain;
      },
      then: (resolve: (value: unknown[]) => unknown) =>
        Promise.resolve(resolve(nextRows)),
    };

    return chain;
  };

  const fromMock = vi.fn(() => {
    const nextRows = rowSequence.length > 0 ? (rowSequence.shift() ?? []) : rows;
    return makeChain(nextRows);
  });
  const selectMock = vi.fn(() => ({ from: fromMock }));

  const setRows = (nextRows: unknown[]) => {
    rows = nextRows;
    rowSequence = [];
  };

  const setRowSequence = (nextRowSequence: unknown[][]) => {
    rowSequence = [...nextRowSequence];
  };

  return {
    selectMock,
    fromMock,
    innerJoinMock,
    leftJoinMock,
    whereMock,
    orderByMock,
    groupByMock,
    setRows,
    setRowSequence,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/lib/cache", () => ({
  getCached: (_key: string, _ttlSeconds: number, fetchFn: () => Promise<unknown>) =>
    fetchFn(),
}));

const {
  getAllUpcomingAppointments,
  getDashboardData,
  getDashboardDailyLog,
  getDepositsAtRisk,
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
        customerId: "customer-1",
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
        serviceName: "Cut & Finish",
      },
    ];
    setRows(mockRows);

    const result = await getHighRiskAppointments("shop-1", 168);

    expect(result).toEqual(mockRows);
    expect(innerJoinMock).toHaveBeenCalledOnce();
    expect(leftJoinMock).toHaveBeenCalledTimes(3);
    expect(orderByMock).toHaveBeenCalledOnce();
  });

  it("returns all upcoming appointments for table rendering", async () => {
    const mockRows = [
      {
        id: "appt-2",
        customerId: "customer-2",
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
        serviceName: "Clipper Cut",
      },
    ];
    setRows(mockRows);

    const result = await getAllUpcomingAppointments("shop-1");

    expect(result).toEqual(mockRows);
    expect(orderByMock).toHaveBeenCalledOnce();
    expect(leftJoinMock).toHaveBeenCalledTimes(3);
  });

  describe("getDashboardDailyLog", () => {
    it("returns empty array when no bookings exist in the window", async () => {
      setRowSequence([[], [], []]);

      const result = await getDashboardDailyLog("shop-1");

      expect(result).toEqual([]);
    });

    it("maps a booking row to a DashboardLogItem with correct shape", async () => {
      const now = new Date();
      setRowSequence([
        [
          {
            id: "appt-abc",
            occurredAt: now,
            appointmentId: "appt-abc",
            customerName: "Jordan Lee",
          },
        ],
        [],
        [],
      ]);

      const result = await getDashboardDailyLog("shop-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "created-appt-abc",
        kind: "appointment_created",
        occurredAt: now,
        appointmentId: "appt-abc",
        customerName: "Jordan Lee",
        eventLabel: "New booking",
        channel: null,
        href: "/app/appointments/appt-abc",
      });
    });

    it("never exposes a phone number - customerName is the customer's full name", async () => {
      setRowSequence([
        [
          {
            id: "appt-1",
            occurredAt: new Date(),
            appointmentId: "appt-1",
            customerName: "Alex Smith",
          },
        ],
        [],
        [],
      ]);

      const [item] = await getDashboardDailyLog("shop-1");

      expect(item?.customerName).toBe("Alex Smith");
      expect(item?.customerName).not.toMatch(/^\+\d+$/);
    });

    it("sorts items newest-first", async () => {
      const older = new Date("2026-04-14T10:00:00Z");
      const newer = new Date("2026-04-15T10:00:00Z");
      setRowSequence([
        [
          {
            id: "appt-old",
            occurredAt: older,
            appointmentId: "appt-old",
            customerName: "A",
          },
          {
            id: "appt-new",
            occurredAt: newer,
            appointmentId: "appt-new",
            customerName: "B",
          },
        ],
        [],
        [],
      ]);

      const result = await getDashboardDailyLog("shop-1");

      expect(result[0]?.id).toBe("created-appt-new");
      expect(result[1]?.id).toBe("created-appt-old");
    });

    it("caps results at the limit", async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: `appt-${i}`,
        occurredAt: new Date(Date.now() - i * 1000),
        appointmentId: `appt-${i}`,
        customerName: `Customer ${i}`,
      }));
      setRowSequence([rows, [], []]);

      const result = await getDashboardDailyLog("shop-1", { limit: 5 });

      expect(result).toHaveLength(5);
    });

    it("prefixes item id with 'created-' to prevent collisions with other sources", async () => {
      setRowSequence([
        [
          {
            id: "uuid-123",
            occurredAt: new Date(),
            appointmentId: "uuid-123",
            customerName: "Someone",
          },
        ],
        [],
        [],
      ]);

      const [item] = await getDashboardDailyLog("shop-1");

      expect(item?.id).toBe("created-uuid-123");
    });

    it("merges all three sources newest-first", async () => {
      setRowSequence([
        [
          {
            id: "appt-1",
            occurredAt: new Date("2026-04-15T09:00:00Z"),
            appointmentId: "appt-1",
            customerName: "Created User",
          },
        ],
        [
          {
            id: "evt-1",
            occurredAt: new Date("2026-04-15T11:00:00Z"),
            type: "cancelled",
            appointmentId: "appt-2",
            financialOutcome: "settled",
            customerName: "Cancelled User",
          },
        ],
        [
          {
            id: "msg-1",
            createdAt: new Date("2026-04-15T10:00:00Z"),
            appointmentId: "appt-3",
            customerName: "Messaged User",
            channel: "sms",
            purpose: "appointment_reminder_24h",
            status: "sent",
          },
        ],
      ]);

      const result = await getDashboardDailyLog("shop-1");

      expect(result.map((item) => item.id)).toEqual([
        "event-evt-1",
        "msg-msg-1",
        "created-appt-1",
      ]);
    });

    it("maps outcome and message labels with the expected channel badges", async () => {
      setRowSequence([
        [],
        [
          {
            id: "evt-2",
            occurredAt: new Date("2026-04-15T12:00:00Z"),
            type: "outcome_resolved",
            appointmentId: "appt-4",
            financialOutcome: "refunded",
            customerName: "Outcome User",
          },
        ],
        [
          {
            id: "msg-2",
            createdAt: new Date("2026-04-15T13:00:00Z"),
            appointmentId: "appt-5",
            customerName: "Message User",
            channel: "email",
            purpose: "booking_confirmation",
            status: "failed",
          },
        ],
      ]);

      const result = await getDashboardDailyLog("shop-1");

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "event-evt-2",
          kind: "outcome_resolved",
          eventLabel: "Outcome: refunded",
          channel: null,
          href: "/app/appointments/appt-4",
        })
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          id: "msg-msg-2",
          kind: "message_failed",
          eventLabel: "Booking confirmation failed",
          channel: "email",
          href: "/app/appointments/appt-5",
        })
      );
    });

    it("maps reminder messages as sent items", async () => {
      setRowSequence([
        [],
        [],
        [
          {
            id: "msg-3",
            createdAt: new Date("2026-04-15T14:00:00Z"),
            appointmentId: "appt-6",
            customerName: "Reminder User",
            channel: "sms",
            purpose: "appointment_reminder_1h",
            status: "sent",
          },
        ],
      ]);

      const [item] = await getDashboardDailyLog("shop-1");

      expect(item).toMatchObject({
        id: "msg-msg-3",
        kind: "message_sent",
        eventLabel: "Reminder sent",
        channel: "sms",
        href: "/app/appointments/appt-6",
      });
    });

    it("caps results across the merged feed", async () => {
      setRowSequence([
        [
          {
            id: "appt-1",
            occurredAt: new Date("2026-04-15T09:00:00Z"),
            appointmentId: "appt-1",
            customerName: "Created User",
          },
        ],
        [
          {
            id: "evt-3",
            occurredAt: new Date("2026-04-15T11:00:00Z"),
            type: "cancelled",
            appointmentId: "appt-2",
            financialOutcome: "settled",
            customerName: "Cancelled User",
          },
        ],
        [
          {
            id: "msg-4",
            createdAt: new Date("2026-04-15T10:00:00Z"),
            appointmentId: "appt-3",
            customerName: "Messaged User",
            channel: "sms",
            purpose: "appointment_reminder_24h",
            status: "sent",
          },
        ],
      ]);

      const result = await getDashboardDailyLog("shop-1", { limit: 2 });

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.id)).toEqual([
        "event-evt-3",
        "msg-msg-4",
      ]);
    });
  });

  describe("getDepositsAtRisk", () => {
    it("returns an empty object when there are no matching rows", async () => {
      setRows([]);

      const result = await getDepositsAtRisk("shop-1", 168);

      expect(result).toEqual({});
    });

    it("returns a single-currency map", async () => {
      setRows([{ currency: "USD", total: 5000 }]);

      const result = await getDepositsAtRisk("shop-1", 168);

      expect(result).toEqual({ USD: 5000 });
    });

    it("returns a multi-currency map", async () => {
      setRows([
        { currency: "USD", total: 5000 },
        { currency: "GBP", total: 3000 },
      ]);

      const result = await getDepositsAtRisk("shop-1", 168);

      expect(result).toEqual({ USD: 5000, GBP: 3000 });
    });

    it("filters out null-currency rows", async () => {
      setRows([
        { currency: null, total: 0 },
        { currency: "USD", total: 7500 },
      ]);

      const result = await getDepositsAtRisk("shop-1", 168);

      expect(result).toEqual({ USD: 7500 });
    });

    it("groups by currency", async () => {
      setRows([]);

      await getDepositsAtRisk("shop-1", 168);

      expect(groupByMock).toHaveBeenCalledOnce();
    });
  });

  describe("getDashboardData depositsAtRisk accumulator", () => {
    const makeRow = (overrides: Record<string, unknown>) => ({
      id: "appt-1",
      customerId: "customer-1",
      startsAt: new Date(Date.now() + 3_600_000),
      endsAt: new Date(Date.now() + 7_200_000),
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "+12025550100",
      customerTier: "risk",
      customerScore: 30,
      voidedLast90Days: 0,
      confirmationStatus: "none",
      bookingUrl: null,
      smsOptIn: false,
      serviceName: null,
      depositAmount: 5000,
      depositCurrency: "USD",
      ...overrides,
    });

    it("accumulates deposits by currency for high-risk appointments", async () => {
      setRows([makeRow({})]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.depositsAtRisk).toEqual({ USD: 5000 });
    });

    it("sums multiple high-risk appointments in the same currency", async () => {
      setRows([
        makeRow({ id: "appt-1", depositAmount: 5000, depositCurrency: "USD" }),
        makeRow({ id: "appt-2", depositAmount: 3000, depositCurrency: "USD" }),
      ]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.depositsAtRisk).toEqual({ USD: 8000 });
    });

    it("returns an empty map when no appointments have deposits", async () => {
      setRows([makeRow({ depositAmount: 0, depositCurrency: null })]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.depositsAtRisk).toEqual({});
    });

    it("excludes non-high-risk appointments from the deposit map", async () => {
      setRows([makeRow({ customerTier: "top", customerScore: 95, voidedLast90Days: 0 })]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.depositsAtRisk).toEqual({});
    });
  });

  describe("V2 customerId and serviceName field presence", () => {
    it("getHighRiskAppointments includes customerId and serviceName", async () => {
      setRows([
        {
          id: "appt-3",
          customerId: "cust-abc",
          startsAt: new Date("2026-05-01T10:00:00.000Z"),
          endsAt: new Date("2026-05-01T11:00:00.000Z"),
          customerName: "Test User",
          customerEmail: "test@example.com",
          customerPhone: "+12025550100",
          customerTier: "risk",
          customerScore: 30,
          voidedLast90Days: 2,
          confirmationStatus: "none",
          bookingUrl: null,
          smsOptIn: false,
          serviceName: "Haircut",
        },
      ]);

      const result = await getHighRiskAppointments("shop-1", 168);

      expect(result[0]?.customerId).toBe("cust-abc");
      expect(result[0]?.serviceName).toBe("Haircut");
    });

    it("getHighRiskAppointments preserves null serviceName when no event type is linked", async () => {
      setRows([
        {
          id: "appt-4",
          customerId: "cust-xyz",
          startsAt: new Date("2026-05-01T10:00:00.000Z"),
          endsAt: new Date("2026-05-01T11:00:00.000Z"),
          customerName: "Other User",
          customerEmail: "other@example.com",
          customerPhone: "+12025550101",
          customerTier: "risk",
          customerScore: 25,
          voidedLast90Days: 3,
          confirmationStatus: "none",
          bookingUrl: null,
          smsOptIn: false,
          serviceName: null,
        },
      ]);

      const result = await getHighRiskAppointments("shop-1", 168);

      expect(result[0]?.customerId).toBe("cust-xyz");
      expect(result[0]?.serviceName).toBeNull();
    });

    it("getAllUpcomingAppointments includes customerId and serviceName", async () => {
      setRows([
        {
          id: "appt-5",
          customerId: "cust-def",
          startsAt: new Date("2026-05-02T10:00:00.000Z"),
          endsAt: new Date("2026-05-02T11:00:00.000Z"),
          customerName: "Another User",
          customerEmail: "another@example.com",
          customerPhone: "+12025550102",
          customerTier: "top",
          customerScore: 90,
          voidedLast90Days: 0,
          confirmationStatus: "none",
          bookingUrl: null,
          smsOptIn: true,
          serviceName: "Colour",
        },
      ]);

      const result = await getAllUpcomingAppointments("shop-1");

      expect(result[0]?.customerId).toBe("cust-def");
      expect(result[0]?.serviceName).toBe("Colour");
    });
  });

  describe("getDashboardData highRiskCustomerCount", () => {
    const makeRow = (overrides: Record<string, unknown>) => ({
      id: "appt-1",
      customerId: "customer-1",
      startsAt: new Date(Date.now() + 3_600_000),
      endsAt: new Date(Date.now() + 7_200_000),
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "+12025550100",
      customerTier: "risk",
      customerScore: 30,
      voidedLast90Days: 0,
      confirmationStatus: "none",
      bookingUrl: null,
      smsOptIn: false,
      serviceName: null,
      depositAmount: 5000,
      depositCurrency: "USD",
      ...overrides,
    });

    it("returns 0 when no appointments exist", async () => {
      setRows([]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(0);
    });

    it("returns 0 when all rows are non-high-risk", async () => {
      setRows([makeRow({ customerTier: "top", customerScore: 95, voidedLast90Days: 0 })]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(0);
    });

    it("counts 1 customer with a single high-risk appointment", async () => {
      setRows([makeRow({})]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(1);
    });

    it("deduplicates repeated appointments for the same customer", async () => {
      setRows([
        makeRow({ id: "appt-1", customerId: "customer-1" }),
        makeRow({ id: "appt-2", customerId: "customer-1" }),
        makeRow({ id: "appt-3", customerId: "customer-1" }),
      ]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(1);
    });

    it("counts distinct high-risk customers", async () => {
      setRows([
        makeRow({ id: "appt-1", customerId: "customer-1" }),
        makeRow({ id: "appt-2", customerId: "customer-2" }),
      ]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(2);
    });

    it("excludes out-of-window appointments from the count", async () => {
      setRows([
        makeRow({ id: "appt-1", customerId: "customer-1", startsAt: new Date(Date.now() + 3_600_000) }),
        makeRow({
          id: "appt-2",
          customerId: "customer-1",
          startsAt: new Date(Date.now() + 200 * 3_600_000),
        }),
      ]);

      const result = await getDashboardData("shop-1", 168);

      expect(result.highRiskCustomerCount).toBe(1);
    });
  });
});
