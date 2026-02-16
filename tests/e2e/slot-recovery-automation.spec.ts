import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createShop } from "../../src/lib/queries/shops";
import {
  appointments,
  customerContactPrefs,
  customers,
  shops,
  slotOffers,
  slotOpenings,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";

const shouldRun = Boolean(
  process.env.POSTGRES_URL &&
  process.env.CRON_SECRET &&
  process.env.INTERNAL_SECRET &&
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
);

const randomPhone = () =>
  `+1202${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;

const tomorrowAt = (hourUtc: number, minuteUtc = 0) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return value;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test.describe("Slot Recovery Automation", () => {
  test.skip(!shouldRun, "Requires POSTGRES_URL, CRON_SECRET, INTERNAL_SECRET, and Twilio env");

  test("expired offer automatically advances to next customer", async ({ page }) => {
    const userId = randomUUID();
    const shopSlug = `automation-${randomUUID().slice(0, 8)}`;
    const startsAt = tomorrowAt(11);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    await db.insert(user).values({
      id: userId,
      name: "Automation User",
      email: `automation_${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Automation Shop",
      slug: shopSlug,
      status: "active",
    });

    if (!shop) {
      throw new Error("Failed to create shop");
    }

    const [sourceCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Cancelled Customer",
        phone: randomPhone(),
        email: `source_${randomUUID()}@example.com`,
      })
      .returning();

    if (!sourceCustomer) {
      throw new Error("Failed to create source customer");
    }

    const sourceStartsAt = new Date(startsAt.getTime() - 2 * 60 * 60 * 1000);
    const sourceEndsAt = new Date(sourceStartsAt.getTime() + 60 * 60 * 1000);

    const [sourceAppointment] = await db
      .insert(appointments)
      .values({
        shopId: shop.id,
        customerId: sourceCustomer.id,
        startsAt: sourceStartsAt,
        endsAt: sourceEndsAt,
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationSource: "customer",
      })
      .returning();

    if (!sourceAppointment) {
      throw new Error("Failed to create source appointment");
    }

    const [slot] = await db
      .insert(slotOpenings)
      .values({
        shopId: shop.id,
        startsAt,
        endsAt,
        sourceAppointmentId: sourceAppointment.id,
        status: "open",
      })
      .returning();

    if (!slot) {
      throw new Error("Failed to create slot opening");
    }

    const [customer1] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Offer Customer 1",
        phone: randomPhone(),
        email: `offer1_${randomUUID()}@example.com`,
      })
      .returning();

    const [customer2] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Offer Customer 2",
        phone: randomPhone(),
        email: `offer2_${randomUUID()}@example.com`,
      })
      .returning();

    if (!customer1 || !customer2) {
      throw new Error("Failed to create offer candidates");
    }

    await db.insert(customerContactPrefs).values([
      { customerId: customer1.id, smsOptIn: true },
      { customerId: customer2.id, smsOptIn: true },
    ]);

    const firstOfferResponse = await page.request.post("/api/jobs/offer-loop", {
      headers: {
        "content-type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
      },
      data: { slotOpeningId: slot.id },
    });

    expect(firstOfferResponse.ok()).toBeTruthy();

    let firstOffer = await db.query.slotOffers.findFirst({
      where: (table, { and: whereAnd }) =>
        whereAnd(eq(table.slotOpeningId, slot.id), eq(table.status, "sent")),
    });

    for (let i = 0; !firstOffer && i < 20; i += 1) {
      await sleep(200);
      firstOffer = await db.query.slotOffers.findFirst({
        where: (table, { and: whereAnd }) =>
          whereAnd(eq(table.slotOpeningId, slot.id), eq(table.status, "sent")),
      });
    }

    if (!firstOffer) {
      throw new Error("First offer was not created");
    }

    await db
      .update(slotOffers)
      .set({
        expiresAt: new Date(Date.now() - 1_000),
        updatedAt: new Date(),
      })
      .where(eq(slotOffers.id, firstOffer.id));

    const expiryResponse = await page.request.post("/api/jobs/expire-offers", {
      headers: {
        "x-cron-secret": process.env.CRON_SECRET ?? "",
      },
    });

    expect(expiryResponse.ok()).toBeTruthy();

    const expiryBody = (await expiryResponse.json()) as {
      total: number;
      expired: number;
      triggered: number;
      errors: string[];
    };

    expect(expiryBody.expired).toBeGreaterThanOrEqual(1);
    expect(expiryBody.triggered).toBeGreaterThanOrEqual(1);

    let offersForSlot = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slot.id),
    });

    for (let i = 0; offersForSlot.length < 2 && i < 20; i += 1) {
      await sleep(250);
      offersForSlot = await db.query.slotOffers.findMany({
        where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slot.id),
      });
    }

    const refreshedFirstOffer = offersForSlot.find((offer) => offer.id === firstOffer.id);
    const secondOffer = offersForSlot.find(
      (offer) => offer.id !== firstOffer.id && offer.status === "sent"
    );

    expect(refreshedFirstOffer?.status).toBe("expired");
    expect(secondOffer).toBeDefined();
    expect(secondOffer?.customerId).not.toBe(firstOffer.customerId);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
