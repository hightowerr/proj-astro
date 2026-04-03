/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDeleteWhere,
  mockGetShopByOwnerId,
  mockInsertBookingSettingsValues,
  mockInsertShopHoursValues,
  mockOnConflictDoUpdate,
  mockRevalidatePath,
  mockRequireAuth,
  mockTransaction,
  mockTxDelete,
  mockTxInsert,
} = vi.hoisted(() => ({
  mockDeleteWhere: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockInsertBookingSettingsValues: vi.fn(),
  mockInsertShopHoursValues: vi.fn(),
  mockOnConflictDoUpdate: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxDelete: vi.fn(),
  mockTxInsert: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/session", () => ({
  requireAuth: mockRequireAuth,
}));

import { bookingSettings, shopHours } from "@/lib/schema";
import { updateAvailabilitySettings } from "./actions";

const createFormData = (defaultBufferMinutes?: number) => {
  const formData = new FormData();
  formData.set("timezone", "UTC");
  formData.set("slotMinutes", "60");
  if (typeof defaultBufferMinutes === "number") {
    formData.set("defaultBufferMinutes", String(defaultBufferMinutes));
  }
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    formData.set(`day-${dayOfWeek}-closed`, "on");
  }
  return formData;
};

describe("updateAvailabilitySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1", slug: "demo-shop" });

    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockInsertBookingSettingsValues.mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockInsertShopHoursValues.mockResolvedValue(undefined);

    mockTxInsert.mockImplementation((table: unknown) => {
      if (table === bookingSettings) {
        return {
          values: mockInsertBookingSettingsValues,
        };
      }

      if (table === shopHours) {
        return {
          values: mockInsertShopHoursValues,
        };
      }

      return {
        values: vi.fn(),
      };
    });

    mockTxDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
      await callback({
        insert: mockTxInsert,
        delete: mockTxDelete,
      });
    });
  });

  it("persists defaultBufferMinutes=5 and revalidates", async () => {
    await updateAvailabilitySettings("shop-1", createFormData(5));

    expect(mockInsertBookingSettingsValues).toHaveBeenCalledWith({
      shopId: "shop-1",
      timezone: "UTC",
      slotMinutes: 60,
      defaultBufferMinutes: 5,
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith({
      target: bookingSettings.shopId,
      set: {
        timezone: "UTC",
        slotMinutes: 60,
        defaultBufferMinutes: 5,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/settings/availability");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/book/demo-shop");
  });

  it("persists explicit defaultBufferMinutes=0", async () => {
    await updateAvailabilitySettings("shop-1", createFormData(0));

    expect(mockInsertBookingSettingsValues).toHaveBeenCalledWith(
      expect.objectContaining({ defaultBufferMinutes: 0 })
    );
  });

  it("rejects invalid defaultBufferMinutes", async () => {
    await expect(
      updateAvailabilitySettings("shop-1", createFormData(7))
    ).rejects.toThrow("Default buffer time is invalid");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("defaults missing defaultBufferMinutes to 0", async () => {
    await updateAvailabilitySettings("shop-1", createFormData());

    expect(mockInsertBookingSettingsValues).toHaveBeenCalledWith(
      expect.objectContaining({ defaultBufferMinutes: 0 })
    );
  });

  it("throws unauthorized when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      updateAvailabilitySettings("shop-1", createFormData(5))
    ).rejects.toThrow("Unauthorized");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws unauthorized when shop is not owned by session user", async () => {
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-2", slug: "other-shop" });

    await expect(
      updateAvailabilitySettings("shop-1", createFormData(5))
    ).rejects.toThrow("Unauthorized");

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
