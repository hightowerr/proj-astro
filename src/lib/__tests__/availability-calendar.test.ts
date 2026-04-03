import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetchCalendarEventsWithCache, mockFilterSlotsForConflicts } =
  vi.hoisted(() => ({
    mockFetchCalendarEventsWithCache: vi.fn(),
    mockFilterSlotsForConflicts: vi.fn(),
  }));

vi.mock("@/lib/google-calendar-cache", () => ({
  fetchCalendarEventsWithCache: mockFetchCalendarEventsWithCache,
  filterSlotsForConflicts: mockFilterSlotsForConflicts,
}));

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const [{ db }, { createAppointment, getAvailabilityForDate }, { createShop }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/shops"),
    import("@/lib/schema"),
  ]);

const { shops, user } = schema;

let shopId: string;
let userId: string;

const nextWeekdayDate = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);

  for (let i = 0; i < 7; i += 1) {
    const day = date.getUTCDay();
    if (day >= 1 && day <= 5) {
      return date.toISOString().slice(0, 10);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
};

beforeEach(async () => {
  mockFetchCalendarEventsWithCache.mockReset();
  mockFilterSlotsForConflicts.mockReset();
  mockFetchCalendarEventsWithCache.mockResolvedValue([]);
  mockFilterSlotsForConflicts.mockImplementation((slots) => slots);

  if (!hasPostgresUrl) {
    return;
  }

  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Availability Calendar User",
    email: `availability-calendar-${userId}@example.com`,
    emailVerified: true,
  });

  const shop = await createShop({
    ownerUserId: userId,
    name: "Availability Calendar Shop",
    slug: `availability-calendar-${userId.slice(0, 8)}`,
  });
  shopId = shop.id;
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  await db.delete(shops).where(eq(shops.id, shopId));
  await db.delete(user).where(eq(user.id, userId));
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("availability with calendar filtering", () => {
  it("filters slots using calendar events", async () => {
    const date = nextWeekdayDate();
    const events = [
      {
        id: "evt-1",
        summary: "Busy",
        start: { dateTime: "2026-03-15T10:00:00.000Z" },
        end: { dateTime: "2026-03-15T11:00:00.000Z" },
      },
    ];
    mockFetchCalendarEventsWithCache.mockResolvedValue(events);
    mockFilterSlotsForConflicts.mockImplementation(
      (slots: { startsAt: Date; endsAt: Date }[]) => slots.slice(1)
    );

    const availability = await getAvailabilityForDate(shopId, date);

    expect(mockFetchCalendarEventsWithCache).toHaveBeenCalledWith(
      shopId,
      date,
      "UTC"
    );
    expect(mockFilterSlotsForConflicts).toHaveBeenCalledTimes(1);
    expect(availability.slots).toHaveLength(7);
  });

  it("returns base availability when calendar fetch fails", async () => {
    const date = nextWeekdayDate();
    mockFetchCalendarEventsWithCache.mockRejectedValue(new Error("Calendar API down"));

    const availability = await getAvailabilityForDate(shopId, date);

    expect(mockFilterSlotsForConflicts).not.toHaveBeenCalled();
    expect(availability.slots).toHaveLength(8);
  });

  it("hides later grid starts that overlap a longer booked appointment", async () => {
    const date = nextWeekdayDate();
    const startsAt = new Date(`${date}T10:00:00.000Z`);

    await createAppointment({
      shopId,
      startsAt,
      durationMinutes: 90,
      paymentsEnabled: false,
      customer: {
        fullName: "Overlap Test Customer",
        phone: "+12025550155",
        email: "overlap-test@example.com",
      },
    });

    const availability = await getAvailabilityForDate(shopId, date);
    const slotStarts = availability.slots.map((slot) => slot.startsAt.toISOString());

    expect(slotStarts).not.toContain(`${date}T10:00:00.000Z`);
    expect(slotStarts).not.toContain(`${date}T11:00:00.000Z`);
    expect(slotStarts).toContain(`${date}T09:00:00.000Z`);
    expect(slotStarts).toContain(`${date}T12:00:00.000Z`);
  });

  it("hides slots whose own buffer would run into a later appointment", async () => {
    const date = nextWeekdayDate();

    await createAppointment({
      shopId,
      startsAt: new Date(`${date}T10:00:00.000Z`),
      paymentsEnabled: false,
      customer: {
        fullName: "Later Appointment Customer",
        phone: "+12025550156",
        email: "later-appointment@example.com",
      },
    });

    const availability = await getAvailabilityForDate(shopId, date, 60, 10);
    const slotStarts = availability.slots.map((slot) => slot.startsAt.toISOString());

    expect(slotStarts).not.toContain(`${date}T09:00:00.000Z`);
    expect(slotStarts).not.toContain(`${date}T10:00:00.000Z`);
    expect(slotStarts).toContain(`${date}T11:00:00.000Z`);
  });
});
