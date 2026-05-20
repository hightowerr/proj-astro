/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockGetShopByOwnerId,
  mockGetShopBySlug,
  mockCreateShopRecord,
  mockRedirect,
  mockHeaders,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockGetShopBySlug: vi.fn(),
  mockCreateShopRecord: vi.fn(),
  mockRedirect: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/lib/queries/shops", () => ({
  createShop: mockCreateShopRecord,
  getShopByOwnerId: mockGetShopByOwnerId,
  getShopBySlug: mockGetShopBySlug,
}));

import { createShop } from "./actions";

const validInput = {
  businessType: "hair",
  shopName: "My Hair Salon",
  shopSlug: "my-hair-salon",
};

describe("createShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue(null);
    mockGetShopBySlug.mockResolvedValue(null);
    mockCreateShopRecord.mockResolvedValue({ id: "shop-1" });
  });

  it("creates a shop with valid input", async () => {
    const result = await createShop(validInput);

    expect(result).toEqual({ shopId: "shop-1" });
    expect(mockCreateShopRecord).toHaveBeenCalledWith({
      ownerUserId: "user-1",
      name: "My Hair Salon",
      slug: "my-hair-salon",
      businessType: "hair",
    });
  });

  it("redirects to /login when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(createShop(validInput)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockCreateShopRecord).not.toHaveBeenCalled();
  });

  it("returns existing shop if owner already has one", async () => {
    mockGetShopByOwnerId.mockResolvedValue({ id: "existing-shop" });

    const result = await createShop(validInput);

    expect(result).toEqual({ shopId: "existing-shop" });
    expect(mockCreateShopRecord).not.toHaveBeenCalled();
  });

  it("throws when slug is already taken by another user", async () => {
    mockGetShopBySlug.mockResolvedValue({
      id: "other-shop",
      ownerUserId: "other-user",
    });

    await expect(createShop(validInput)).rejects.toThrow(
      "This shop URL is already taken"
    );
    expect(mockCreateShopRecord).not.toHaveBeenCalled();
  });

  it("normalizes slugs with special characters", async () => {
    await createShop({
      ...validInput,
      shopSlug: "  My--Hair!! Salon  ",
    });

    expect(mockCreateShopRecord).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "my-hair-salon" })
    );
  });

  it("throws for invalid business type", async () => {
    await expect(
      createShop({ ...validInput, businessType: "invalid-type" })
    ).rejects.toThrow();
    expect(mockCreateShopRecord).not.toHaveBeenCalled();
  });

  it("throws when shop name is too short", async () => {
    await expect(
      createShop({ ...validInput, shopName: "A" })
    ).rejects.toThrow("Shop name must be at least 2 characters");
  });

  it("throws when slug is too short after normalization", async () => {
    await expect(
      createShop({ ...validInput, shopSlug: "ab!" })
    ).rejects.toThrow("Shop URL slug must include at least 3 valid characters");
  });
});
