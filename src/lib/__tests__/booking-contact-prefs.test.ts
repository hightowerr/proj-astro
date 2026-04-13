import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requirePostgresUrl } from "@/test/db-test-guard";

const hasPostgresUrl = Boolean(
  requirePostgresUrl("src/lib/__tests__/booking-contact-prefs.test.ts"),
);

const [{ db }, { createAppointment }, { createShop }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/shops"),
    import("@/lib/schema"),
  ]);

const { shops, user } = schema;

let userId: string;
let shopId: string;

const insertUser = async (id: string) => {
  await db.insert(user).values({
    id,
    name: "Booking Contact Prefs User",
    email: `booking-contact-prefs-${id}@example.com`,
    emailVerified: true,
  });
};

const nextWeekdayStartAt = () => {
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 1);

  for (let i = 0; i < 7; i += 1) {
    const day = date.getUTCDay();
    if (day >= 1 && day <= 5) {
      return new Date(date);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return new Date(date);
};

beforeEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  userId = randomUUID();
  await insertUser(userId);

  const shop = await createShop({
    ownerUserId: userId,
    name: "Booking Contact Prefs Shop",
    slug: `booking-contact-prefs-${userId.slice(0, 8)}`,
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

describeIf("createAppointment contact prefs", () => {
  it("creates contact preferences with email opt-in from booking input", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Consent Customer",
        email: "consent@example.com",
        phone: "+12025550194",
        smsOptIn: true,
        emailOptIn: false,
      },
      paymentsEnabled: false,
    });

    const prefs = await db.query.customerContactPrefs.findFirst({
      where: (table, { eq }) => eq(table.customerId, result.customer.id),
    });

    expect(prefs).not.toBeNull();
    expect(prefs?.smsOptIn).toBe(true);
    expect(prefs?.emailOptIn).toBe(false);
  });

  it("updates existing email opt-in without overwriting sms opt-in when omitted", async () => {
    const firstBooking = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Returning Customer",
        email: "returning@example.com",
        phone: "+12025550195",
        smsOptIn: true,
        emailOptIn: true,
      },
      paymentsEnabled: false,
    });

    const secondStart = nextWeekdayStartAt();
    secondStart.setUTCDate(secondStart.getUTCDate() + 1);

    await createAppointment({
      shopId,
      startsAt: secondStart,
      customer: {
        fullName: "Returning Customer",
        email: "returning@example.com",
        phone: "+12025550195",
        emailOptIn: false,
      },
      paymentsEnabled: false,
    });

    const prefs = await db.query.customerContactPrefs.findFirst({
      where: (table, { eq }) => eq(table.customerId, firstBooking.customer.id),
    });

    expect(prefs).not.toBeNull();
    expect(prefs?.smsOptIn).toBe(true);
    expect(prefs?.emailOptIn).toBe(false);
  });
});
