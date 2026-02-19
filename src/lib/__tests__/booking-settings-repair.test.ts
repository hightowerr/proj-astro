import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

const { bookingSettings, shops, user } = schema;

let userId: string;
let shopId: string;

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
  if (!hasPostgresUrl) {
    return;
  }

  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Booking Settings Repair User",
    email: `booking-settings-${userId}@example.com`,
    emailVerified: true,
  });

  const shop = await createShop({
    ownerUserId: userId,
    name: "Booking Settings Repair Shop",
    slug: `booking-settings-repair-${userId.slice(0, 8)}`,
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

describeIf("booking settings repair", () => {
  it("auto-creates missing booking settings for availability lookups", async () => {
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shopId));

    const availability = await getAvailabilityForDate(shopId, nextWeekdayDate());

    expect(availability.timezone).toBe("UTC");
    expect(availability.slotMinutes).toBe(60);

    const repaired = await db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, shopId),
    });
    expect(repaired).not.toBeNull();
  });

  it("auto-creates missing booking settings before appointment creation", async () => {
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shopId));

    const startsAt = new Date(`${nextWeekdayDate()}T09:00:00.000Z`);
    const result = await createAppointment({
      shopId,
      startsAt,
      customer: {
        fullName: "Repair Test Customer",
        phone: "+12025551234",
        email: "repair-test@example.com",
      },
      paymentsEnabled: false,
    });

    expect(result.appointment.shopId).toBe(shopId);

    const repaired = await db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, shopId),
    });
    expect(repaired).not.toBeNull();
  });
});
