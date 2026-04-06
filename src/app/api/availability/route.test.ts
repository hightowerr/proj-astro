/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAvailabilityForDate,
  mockGetEventTypeById,
  mockGetShopBySlug,
} = vi.hoisted(() => ({
  mockGetAvailabilityForDate: vi.fn(),
  mockGetEventTypeById: vi.fn(),
  mockGetShopBySlug: vi.fn(),
}));

vi.mock("@/lib/queries/appointments", () => ({
  getAvailabilityForDate: mockGetAvailabilityForDate,
}));

vi.mock("@/lib/queries/event-types", () => ({
  getEventTypeById: mockGetEventTypeById,
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopBySlug: mockGetShopBySlug,
}));

import { GET } from "./route";

describe("GET /api/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetShopBySlug.mockResolvedValue({ id: "shop-1", slug: "demo-shop" });
    mockGetEventTypeById.mockResolvedValue(null);
    mockGetAvailabilityForDate.mockResolvedValue({
      date: "2026-03-15",
      timezone: "UTC",
      slotMinutes: 60,
      durationMinutes: 60,
      slots: [
        {
          startsAt: new Date("2026-03-15T10:00:00.000Z"),
          endsAt: new Date("2026-03-15T11:00:00.000Z"),
        },
      ],
    });
  });

  it("returns default slot duration when no service is provided", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/availability?shop=demo-shop&date=2026-03-15")
    );
    const body = (await response.json()) as { durationMinutes?: number };

    expect(response.status).toBe(200);
    expect(mockGetAvailabilityForDate).toHaveBeenCalledWith(
      "shop-1",
      "2026-03-15",
      undefined,
      undefined
    );
    expect(body.durationMinutes).toBe(60);
  });

  it("uses the selected service duration when the service is valid", async () => {
    mockGetEventTypeById.mockResolvedValue({
      id: "event-type-1",
      shopId: "shop-1",
      isActive: true,
      durationMinutes: 90,
      bufferMinutes: 10,
    });
    mockGetAvailabilityForDate.mockResolvedValue({
      date: "2026-03-15",
      timezone: "UTC",
      slotMinutes: 60,
      durationMinutes: 90,
      slots: [
        {
          startsAt: new Date("2026-03-15T10:00:00.000Z"),
          endsAt: new Date("2026-03-15T11:30:00.000Z"),
        },
      ],
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/availability?shop=demo-shop&date=2026-03-15&service=11111111-1111-4111-8111-111111111111"
      )
    );
    const body = (await response.json()) as {
      durationMinutes?: number;
      slots?: Array<{ endsAt: string }>;
    };

    expect(response.status).toBe(200);
    expect(mockGetAvailabilityForDate).toHaveBeenCalledWith(
      "shop-1",
      "2026-03-15",
      90,
      10
    );
    expect(body.durationMinutes).toBe(90);
    expect(body.slots?.[0]?.endsAt).toBe("2026-03-15T11:30:00.000Z");
  });

  it("falls back silently when the service is inactive or belongs to another shop", async () => {
    mockGetEventTypeById.mockResolvedValue({
      id: "event-type-1",
      shopId: "shop-2",
      isActive: true,
      durationMinutes: 90,
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/availability?shop=demo-shop&date=2026-03-15&service=11111111-1111-4111-8111-111111111111"
      )
    );

    expect(response.status).toBe(200);
    expect(mockGetAvailabilityForDate).toHaveBeenCalledWith(
      "shop-1",
      "2026-03-15",
      undefined,
      undefined
    );
  });
});
