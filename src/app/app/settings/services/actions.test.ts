/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbInsert,
  mockDbSelect,
  mockDbUpdate,
  mockFindFirst,
  mockGetBookingSettingsForShop,
  mockGetShopByOwnerId,
  mockInsertReturning,
  mockInsertValues,
  mockRevalidatePath,
  mockRequireAuth,
  mockSelectFrom,
  mockSelectLimit,
  mockSelectOrderBy,
  mockSelectWhere,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockDbInsert: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockFindFirst: vi.fn(),
  mockGetBookingSettingsForShop: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockInsertReturning: vi.fn(),
  mockInsertValues: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockSelectFrom: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockSelectOrderBy: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
    update: mockDbUpdate,
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

import {
  createDefaultEventType,
  createEventType,
  restoreEventType,
  updateEventType,
} from "./actions";

const baseValues = {
  name: "Signature Service",
  description: "Tailored experience",
  durationMinutes: 120,
  bufferMinutes: null,
  depositAmountCents: 2500,
  isHidden: false,
  isActive: true,
};

describe("service actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockGetBookingSettingsForShop.mockResolvedValue({ slotMinutes: 60 });

    mockDbInsert.mockReturnValue({
      values: mockInsertValues,
    });
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
    });
    mockInsertReturning.mockResolvedValue([{ id: "event-type-2" }]);

    mockDbSelect.mockReturnValue({
      from: mockSelectFrom,
    });
    mockSelectFrom.mockReturnValue({
      where: mockSelectWhere,
    });
    mockSelectWhere.mockReturnValue({
      orderBy: mockSelectOrderBy,
    });
    mockSelectOrderBy.mockReturnValue({
      limit: mockSelectLimit,
    });
    mockSelectLimit.mockResolvedValue([]);

    mockDbUpdate.mockReturnValue({
      set: mockUpdateSet,
    });
    mockUpdateSet.mockReturnValue({
      where: mockUpdateWhere,
    });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it("returns the created id and revalidates on create", async () => {
    const result = await createEventType({ ...baseValues });

    expect(result).toEqual({ ok: true, data: { id: "event-type-2" } });
    expect(mockInsertValues).toHaveBeenCalledWith({
      shopId: "shop-1",
      name: "Signature Service",
      description: "Tailored experience",
      durationMinutes: 120,
      bufferMinutes: null,
      depositAmountCents: 2500,
      isHidden: false,
      isActive: true,
      isDefault: false,
      sortOrder: 0,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/settings/services");
  });

  it("rejects create durations above the maximum", async () => {
    const result = await createEventType({
      ...baseValues,
      durationMinutes: 300,
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        durationMinutes: "Duration must be 240 minutes or less",
      },
    });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("rejects deactivating the default service", async () => {
    mockFindFirst.mockResolvedValue({
      id: "event-type-1",
      shopId: "shop-1",
      isDefault: true,
    });

    const result = await updateEventType("event-type-1", {
      ...baseValues,
      isActive: false,
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        isActive: "Cannot deactivate the default service",
      },
    });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("restores hidden and inactive services", async () => {
    mockFindFirst.mockResolvedValue({
      id: "event-type-1",
      shopId: "shop-1",
      isDefault: false,
      isHidden: true,
      isActive: false,
    });

    const result = await restoreEventType("event-type-1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(mockUpdateSet).toHaveBeenCalledWith({
      isHidden: false,
      isActive: true,
      updatedAt: expect.any(Date),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/settings/services");
  });
});

describe("createDefaultEventType", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockGetBookingSettingsForShop.mockResolvedValue({ slotMinutes: 120 });

    mockDbInsert.mockReturnValue({
      values: mockInsertValues,
    });
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
    });
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
