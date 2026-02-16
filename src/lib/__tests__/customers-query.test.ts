import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listCustomersForShop } from "@/lib/queries/customers";
import type { ScoringStats, Tier } from "@/lib/scoring";

const { selectMock, fromMock, leftJoinMock, whereMock, orderByMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  leftJoinMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

type QueryRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
  score: number | null;
  tier?: Tier | null;
  stats?: ScoringStats | null;
  computedAt?: Date | null;
};

const makeRow = (overrides: Partial<QueryRow> = {}): QueryRow => ({
  id: "customer-1",
  fullName: "Alex Carter",
  email: "alex@example.com",
  phone: "+12025550100",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  score: 88,
  tier: "top",
  stats: {
    settled: 6,
    voided: 0,
    refunded: 0,
    lateCancels: 0,
    lastActivityAt: "2026-01-30T00:00:00.000Z",
    voidedLast90Days: 0,
  },
  computedAt: new Date("2026-02-01T00:00:00.000Z"),
  ...overrides,
});

describe("listCustomersForShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    orderByMock.mockResolvedValue([]);
    whereMock.mockReturnValue({ orderBy: orderByMock });
    leftJoinMock.mockReturnValue({ where: whereMock });
    fromMock.mockReturnValue({ leftJoin: leftJoinMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns customer rows and normalizes missing score metadata to null", async () => {
    orderByMock.mockResolvedValue([
      makeRow(),
      {
        ...makeRow({
          id: "customer-2",
          fullName: "Taylor Reed",
          email: "taylor@example.com",
          score: null,
        }),
        tier: undefined,
        stats: undefined,
        computedAt: undefined,
      } as unknown as QueryRow,
    ]);

    const result = await listCustomersForShop("shop-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "customer-1",
      fullName: "Alex Carter",
      score: 88,
      tier: "top",
    });
    expect(result[1]).toMatchObject({
      id: "customer-2",
      fullName: "Taylor Reed",
      score: null,
      tier: null,
      stats: null,
      computedAt: null,
    });
  });

  it("builds select shape and applies deterministic three-part ordering", async () => {
    await listCustomersForShop("shop-1");

    expect(selectMock).toHaveBeenCalledOnce();
    const selectShape = selectMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(selectShape)).toEqual([
      "id",
      "fullName",
      "email",
      "phone",
      "createdAt",
      "score",
      "tier",
      "stats",
      "computedAt",
    ]);

    expect(fromMock).toHaveBeenCalledOnce();
    expect(leftJoinMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
    expect(orderByMock).toHaveBeenCalledOnce();
    expect(orderByMock.mock.calls[0]).toHaveLength(3);
  });
});
