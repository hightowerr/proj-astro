/* eslint-disable import/order */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSelect,
  mockGetBookingSettingsForShop,
  mockGetShopByOwnerId,
  mockRequireAuth,
  mockNotFound,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockGetBookingSettingsForShop: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockNotFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
  },
}));

vi.mock("@/lib/queries/appointments", () => ({
  getBookingSettingsForShop: mockGetBookingSettingsForShop,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

import SlotOpeningDetailPage from "./page";

type QueryRow = Record<string, unknown>;

const makeQueryBuilder = (result: QueryRow[]) => {
  const chain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };

  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockResolvedValue(result);
  chain.limit.mockResolvedValue(result);

  return chain;
};

const makeSlotRow = (eventTypeName: string | null) => {
  const now = new Date("2026-03-24T12:00:00.000Z");
  const later = new Date("2026-03-24T13:00:00.000Z");

  return {
    id: "slot-1",
    shopId: "shop-1",
    startsAt: now,
    endsAt: later,
    status: "open" as const,
    sourceAppointmentId: "appt-1",
    createdAt: now,
    updatedAt: now,
    eventTypeName,
  };
};

describe("slot-openings detail service rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockGetBookingSettingsForShop.mockResolvedValue({ timezone: "UTC" });
  });

  it("shows service line when slot opening has an event type", async () => {
    mockSelect
      .mockImplementationOnce(() => makeQueryBuilder([makeSlotRow("Haircut")]))
      .mockImplementationOnce(() => makeQueryBuilder([]))
      .mockImplementationOnce(() => makeQueryBuilder([]));

    const tree = await SlotOpeningDetailPage({
      params: Promise.resolve({ id: "slot-1" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Service:");
    expect(html).toContain("Haircut");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("omits service line when slot opening has no event type", async () => {
    mockSelect
      .mockImplementationOnce(() => makeQueryBuilder([makeSlotRow(null)]))
      .mockImplementationOnce(() => makeQueryBuilder([]))
      .mockImplementationOnce(() => makeQueryBuilder([]));

    const tree = await SlotOpeningDetailPage({
      params: Promise.resolve({ id: "slot-1" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).not.toContain("Service:");
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
