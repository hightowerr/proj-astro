import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const [{ db }, { createAppointment }, { createShop }, schema] = await Promise.all([
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

const upsertDefaultBuffer = async (defaultBufferMinutes: 0 | 5 | 10) => {
  await db
    .insert(bookingSettings)
    .values({
      shopId,
      timezone: "UTC",
      slotMinutes: 60,
      reminderTimings: ["24h"],
      defaultBufferMinutes,
    })
    .onConflictDoUpdate({
      target: bookingSettings.shopId,
      set: {
        timezone: "UTC",
        slotMinutes: 60,
        reminderTimings: ["24h"],
        defaultBufferMinutes,
      },
    });
};

beforeEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Buffer Time User",
    email: `buffer-time-${userId}@example.com`,
    emailVerified: true,
  });

  const shop = await createShop({
    ownerUserId: userId,
    name: "Buffer Time Shop",
    slug: `buffer-time-${userId.slice(0, 8)}`,
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

describeIf("buffer time resolver fallback", () => {
  it("inherits shop default when event type buffer is null", async () => {
    await upsertDefaultBuffer(5);

    const startsAt = new Date(`${nextWeekdayDate()}T09:00:00.000Z`);
    const result = await createAppointment({
      shopId,
      startsAt,
      paymentsEnabled: false,
      eventTypeBufferMinutes: null,
      customer: {
        fullName: "Fallback Customer",
        phone: "+12025550151",
        email: "fallback-customer@example.com",
      },
    });

    expect(result.appointment.effectiveBufferAfterMinutes).toBe(5);
  });

  it("uses the event type buffer when provided", async () => {
    await upsertDefaultBuffer(5);

    const startsAt = new Date(`${nextWeekdayDate()}T10:00:00.000Z`);
    const result = await createAppointment({
      shopId,
      startsAt,
      paymentsEnabled: false,
      eventTypeBufferMinutes: 10,
      customer: {
        fullName: "Override Customer",
        phone: "+12025550152",
        email: "override-customer@example.com",
      },
    });

    expect(result.appointment.effectiveBufferAfterMinutes).toBe(10);
  });

  it("keeps zero when shop default is zero and service buffer is null", async () => {
    await upsertDefaultBuffer(0);

    const startsAt = new Date(`${nextWeekdayDate()}T11:00:00.000Z`);
    const result = await createAppointment({
      shopId,
      startsAt,
      paymentsEnabled: false,
      eventTypeBufferMinutes: null,
      customer: {
        fullName: "Zero Default Customer",
        phone: "+12025550153",
        email: "zero-default@example.com",
      },
    });

    expect(result.appointment.effectiveBufferAfterMinutes).toBe(0);
  });

  it("falls back to zero when settings are repaired and no service buffer is provided", async () => {
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shopId));

    const startsAt = new Date(`${nextWeekdayDate()}T12:00:00.000Z`);
    const result = await createAppointment({
      shopId,
      startsAt,
      paymentsEnabled: false,
      eventTypeBufferMinutes: null,
      customer: {
        fullName: "Repair Fallback Customer",
        phone: "+12025550154",
        email: "repair-fallback@example.com",
      },
    });

    expect(result.appointment.effectiveBufferAfterMinutes).toBe(0);

    const repaired = await db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, shopId),
    });
    expect(repaired?.defaultBufferMinutes ?? 0).toBe(0);
  });
});
