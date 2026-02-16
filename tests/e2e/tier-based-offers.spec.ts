import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createShop } from "../../src/lib/queries/shops";
import {
  appointments,
  customerContactPrefs,
  customerScores,
  customers,
  shopPolicies,
  shops,
  slotOffers,
  slotOpenings,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";

const shouldRun = Boolean(
  process.env.POSTGRES_URL &&
    process.env.INTERNAL_SECRET &&
    process.env.CRON_SECRET &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
);

const randomPhone = () =>
  `+1202${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForOfferCount = async (
  slotOpeningId: string,
  minCount: number,
  maxAttempts = 30
) => {
  let offers = await db.query.slotOffers.findMany({
    where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slotOpeningId),
    orderBy: (table) => [asc(table.sentAt)],
  });

  for (let i = 0; offers.length < minCount && i < maxAttempts; i += 1) {
    await sleep(250);
    offers = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slotOpeningId),
      orderBy: (table) => [asc(table.sentAt)],
    });
  }

  return offers;
};

test.describe("Tier-based offers", () => {
  test.skip(!shouldRun, "Requires DB + internal job + Twilio env");

  test("offers in order top -> neutral -> risk", async ({ page }) => {
    const userId = randomUUID();
    const shopSlug = `tier-offers-${randomUUID().slice(0, 8)}`;

    await db.insert(user).values({
      id: userId,
      name: "Tier Offer User",
      email: `tier-offers-${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Tier Offer Shop",
      slug: shopSlug,
      status: "active",
    });

    await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        excludeRiskFromOffers: false,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          excludeRiskFromOffers: false,
        },
      });

    const [sourceCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Source Customer",
        phone: randomPhone(),
        email: `source-${randomUUID()}@example.com`,
      })
      .returning();

    if (!sourceCustomer) {
      throw new Error("Failed to create source customer");
    }

    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    startsAt.setUTCHours(11, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [sourceAppointment] = await db
      .insert(appointments)
      .values({
        shopId: shop.id,
        customerId: sourceCustomer.id,
        startsAt: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000),
        endsAt: new Date(startsAt.getTime() - 60 * 60 * 1000),
      })
      .returning();

    if (!sourceAppointment) {
      throw new Error("Failed to create source appointment");
    }

    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: shop.id,
        startsAt,
        endsAt,
        sourceAppointmentId: sourceAppointment.id,
        status: "open",
      })
      .returning();

    if (!slotOpening) {
      throw new Error("Failed to create slot opening");
    }

    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Top Customer",
        phone: randomPhone(),
        email: `top-${randomUUID()}@example.com`,
      })
      .returning();
    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Neutral Customer",
        phone: randomPhone(),
        email: `neutral-${randomUUID()}@example.com`,
      })
      .returning();
    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Risk Customer",
        phone: randomPhone(),
        email: `risk-${randomUUID()}@example.com`,
      })
      .returning();

    if (!topCustomer || !neutralCustomer || !riskCustomer) {
      throw new Error("Failed to create tier customers");
    }

    await db.insert(customerContactPrefs).values([
      { customerId: topCustomer.id, smsOptIn: true },
      { customerId: neutralCustomer.id, smsOptIn: true },
      { customerId: riskCustomer.id, smsOptIn: true },
    ]);

    await db.insert(customerScores).values([
      {
        customerId: topCustomer.id,
        shopId: shop.id,
        score: 90,
        tier: "top",
        windowDays: 180,
        stats: {
          settled: 10,
          voided: 0,
          refunded: 0,
          lateCancels: 0,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 0,
        },
      },
      {
        customerId: neutralCustomer.id,
        shopId: shop.id,
        score: 55,
        tier: "neutral",
        windowDays: 180,
        stats: {
          settled: 5,
          voided: 0,
          refunded: 0,
          lateCancels: 0,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 0,
        },
      },
      {
        customerId: riskCustomer.id,
        shopId: shop.id,
        score: 25,
        tier: "risk",
        windowDays: 180,
        stats: {
          settled: 1,
          voided: 2,
          refunded: 0,
          lateCancels: 1,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 2,
        },
      },
    ]);

    const headers = {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
    };

    const firstResponse = await page.request.post("/api/jobs/offer-loop", {
      headers,
      data: { slotOpeningId: slotOpening.id },
    });
    expect(firstResponse.ok()).toBeTruthy();

    let offers = await waitForOfferCount(slotOpening.id, 1);
    expect(offers[0]?.customerId).toBe(topCustomer.id);

    await db
      .update(slotOffers)
      .set({ expiresAt: new Date(Date.now() - 1_000), updatedAt: new Date() })
      .where(eq(slotOffers.id, offers[0]!.id));

    const expireHeaders = {
      "x-cron-secret": process.env.CRON_SECRET ?? "",
    };

    const expireFirstResponse = await page.request.post("/api/jobs/expire-offers", {
      headers: expireHeaders,
    });
    expect(expireFirstResponse.ok()).toBeTruthy();

    offers = await waitForOfferCount(slotOpening.id, 2);
    expect(offers[1]?.customerId).toBe(neutralCustomer.id);

    await db
      .update(slotOffers)
      .set({ expiresAt: new Date(Date.now() - 1_000), updatedAt: new Date() })
      .where(eq(slotOffers.id, offers[1]!.id));

    const expireSecondResponse = await page.request.post("/api/jobs/expire-offers", {
      headers: expireHeaders,
    });
    expect(expireSecondResponse.ok()).toBeTruthy();

    offers = await waitForOfferCount(slotOpening.id, 3);
    expect(offers[2]?.customerId).toBe(riskCustomer.id);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  test("never offers to risk tier when excludeRiskFromOffers=true", async ({ page }) => {
    const userId = randomUUID();
    const shopSlug = `tier-offers-exclude-${randomUUID().slice(0, 8)}`;

    await db.insert(user).values({
      id: userId,
      name: "Tier Exclude User",
      email: `tier-offers-exclude-${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Tier Exclude Shop",
      slug: shopSlug,
      status: "active",
    });

    await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        excludeRiskFromOffers: true,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          excludeRiskFromOffers: true,
        },
      });

    const [sourceCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Source Customer",
        phone: randomPhone(),
        email: `source-${randomUUID()}@example.com`,
      })
      .returning();

    if (!sourceCustomer) {
      throw new Error("Failed to create source customer");
    }

    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    startsAt.setUTCHours(12, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [sourceAppointment] = await db
      .insert(appointments)
      .values({
        shopId: shop.id,
        customerId: sourceCustomer.id,
        startsAt: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000),
        endsAt: new Date(startsAt.getTime() - 60 * 60 * 1000),
      })
      .returning();

    if (!sourceAppointment) {
      throw new Error("Failed to create source appointment");
    }

    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: shop.id,
        startsAt,
        endsAt,
        sourceAppointmentId: sourceAppointment.id,
        status: "open",
      })
      .returning();

    if (!slotOpening) {
      throw new Error("Failed to create slot opening");
    }

    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Top Customer",
        phone: randomPhone(),
        email: `top-${randomUUID()}@example.com`,
      })
      .returning();
    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Neutral Customer",
        phone: randomPhone(),
        email: `neutral-${randomUUID()}@example.com`,
      })
      .returning();
    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Risk Customer",
        phone: randomPhone(),
        email: `risk-${randomUUID()}@example.com`,
      })
      .returning();

    if (!topCustomer || !neutralCustomer || !riskCustomer) {
      throw new Error("Failed to create tier customers");
    }

    await db.insert(customerContactPrefs).values([
      { customerId: topCustomer.id, smsOptIn: true },
      { customerId: neutralCustomer.id, smsOptIn: true },
      { customerId: riskCustomer.id, smsOptIn: true },
    ]);

    await db.insert(customerScores).values([
      {
        customerId: topCustomer.id,
        shopId: shop.id,
        score: 90,
        tier: "top",
        windowDays: 180,
        stats: {
          settled: 10,
          voided: 0,
          refunded: 0,
          lateCancels: 0,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 0,
        },
      },
      {
        customerId: neutralCustomer.id,
        shopId: shop.id,
        score: 55,
        tier: "neutral",
        windowDays: 180,
        stats: {
          settled: 5,
          voided: 0,
          refunded: 0,
          lateCancels: 0,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 0,
        },
      },
      {
        customerId: riskCustomer.id,
        shopId: shop.id,
        score: 25,
        tier: "risk",
        windowDays: 180,
        stats: {
          settled: 1,
          voided: 2,
          refunded: 0,
          lateCancels: 1,
          lastActivityAt: new Date().toISOString(),
          voidedLast90Days: 2,
        },
      },
    ]);

    const headers = {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
    };
    const cronHeaders = {
      "x-cron-secret": process.env.CRON_SECRET ?? "",
    };

    const firstResponse = await page.request.post("/api/jobs/offer-loop", {
      headers,
      data: { slotOpeningId: slotOpening.id },
    });
    expect(firstResponse.ok()).toBeTruthy();

    let offers = await waitForOfferCount(slotOpening.id, 1);
    expect(offers[0]?.customerId).toBe(topCustomer.id);

    await db
      .update(slotOffers)
      .set({ expiresAt: new Date(Date.now() - 1_000), updatedAt: new Date() })
      .where(eq(slotOffers.id, offers[0]!.id));

    const expireResponse = await page.request.post("/api/jobs/expire-offers", {
      headers: cronHeaders,
    });
    expect(expireResponse.ok()).toBeTruthy();

    offers = await waitForOfferCount(slotOpening.id, 2);
    expect(offers[1]?.customerId).toBe(neutralCustomer.id);
    expect(offers.some((offer) => offer.customerId === riskCustomer.id)).toBe(false);

    await db
      .update(slotOffers)
      .set({ expiresAt: new Date(Date.now() - 1_000), updatedAt: new Date() })
      .where(eq(slotOffers.id, offers[1]!.id));

    const expireSecondResponse = await page.request.post("/api/jobs/expire-offers", {
      headers: cronHeaders,
    });
    expect(expireSecondResponse.ok()).toBeTruthy();

    const offersAfterSecondExpire = await waitForOfferCount(slotOpening.id, 2);
    expect(offersAfterSecondExpire.some((offer) => offer.customerId === riskCustomer.id)).toBe(
      false
    );

    const riskOffer = await db.query.slotOffers.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.slotOpeningId, slotOpening.id),
          whereEq(table.customerId, riskCustomer.id)
        ),
    });
    expect(riskOffer).toBeUndefined();

    const openSlot = await db.query.slotOpenings.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(table.id, slotOpening.id), whereEq(table.status, "open")),
    });
    if (openSlot) {
      await page.request.post("/api/jobs/offer-loop", {
        headers,
        data: { slotOpeningId: slotOpening.id },
      });
    }

    const finalOffers = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slotOpening.id),
      orderBy: (table) => [asc(table.sentAt)],
    });

    expect(finalOffers.length).toBe(2);
    expect(finalOffers.map((offer) => offer.customerId)).toEqual([
      topCustomer.id,
      neutralCustomer.id,
    ]);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
