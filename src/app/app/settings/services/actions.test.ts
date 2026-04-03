/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindFirst,
  mockGetBookingSettingsForShop,
  mockGetShopByOwnerId,
  mockInsertValues,
  mockRevalidatePath,
  mockRequireAuth,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockGetBookingSettingsForShop: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockInsertValues: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRequireAuth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
    query: {
      eventTypes: {
        findFirst: mockFindFirst,
      },
    },
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

import { createDefaultEventType } from "./actions";

describe("createDefaultEventType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockGetBookingSettingsForShop.mockResolvedValue({ slotMinutes: 120 });
    mockInsertValues.mockResolvedValue(undefined);
  });

  it("creates a default service from the shop slot duration", async () => {
    mockFindFirst.mockResolvedValue(null);

    await createDefaultEventType();

    expect(mockInsertValues).toHaveBeenCalledWith({
      shopId: "shop-1",
      name: "Service",
      description: null,
      durationMinutes: 120,
      bufferMinutes: null,
      depositAmountCents: null,
      isHidden: false,
      isActive: true,
      isDefault: true,
      sortOrder: 0,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/settings/services");
  });

  it("is idempotent when a default service already exists", async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "event-type-1", isDefault: true });

    await createDefaultEventType();
    await createDefaultEventType();

    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });
});
