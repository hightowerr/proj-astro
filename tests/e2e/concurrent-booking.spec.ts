import { createHmac, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createShop } from "../../src/lib/queries/shops";
import { isInCooldown } from "../../src/lib/redis";
import {
  appointments,
  customers,
  slotOffers,
  slotOpenings,
  shops,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";

const shouldRun = Boolean(
  process.env.POSTGRES_URL &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
);

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

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

const signTwilio = (
  authToken: string,
  url: string,
  params: Record<string, string>
): string => {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  const hmac = createHmac("sha1", authToken);
  hmac.update(data);
  return hmac.digest("base64");
};

test.describe("Concurrent Slot Recovery Booking", () => {
  test.skip(!shouldRun, "Requires POSTGRES_URL, TWILIO_AUTH_TOKEN, and Upstash env");

  test("concurrent YES replies result in exactly one booking", async ({ page }) => {
    const userId = randomUUID();
    const shopSlug = `concurrent-${randomUUID().slice(0, 8)}`;
    const start = tomorrowAt(10);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await db.insert(user).values({
      id: userId,
      name: "Concurrent User",
      email: `concurrent_${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Concurrent Shop",
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
        fullName: "Source Customer",
        phone: randomPhone(),
        email: `source_${randomUUID()}@example.com`,
      })
      .returning();

    if (!sourceCustomer) {
      throw new Error("Failed to create source customer");
    }

    const sourceStartsAt = new Date(start.getTime() - 2 * 60 * 60 * 1000);
    const sourceEndsAt = new Date(start.getTime() - 60 * 60 * 1000);

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
        startsAt: start,
        endsAt: end,
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
        fullName: "Concurrent Customer 1",
        phone: randomPhone(),
        email: `offer_${randomUUID()}@example.com`,
      })
      .returning();

    const [customer2] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Concurrent Customer 2",
        phone: randomPhone(),
        email: `offer_${randomUUID()}@example.com`,
      })
      .returning();

    if (!customer1 || !customer2) {
      throw new Error("Failed to create offered customers");
    }

    await db.insert(slotOffers).values([
      {
        slotOpeningId: slot.id,
        customerId: customer1.id,
        channel: "sms",
        status: "sent",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      {
        slotOpeningId: slot.id,
        customerId: customer2.id,
        channel: "sms",
        status: "sent",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    ]);

    const inboundUrl = new URL("/api/twilio/inbound", baseUrl).toString();
    const authToken = process.env.TWILIO_AUTH_TOKEN!;

    const sendYes = async (from: string) => {
      const params = { Body: "YES", From: from };
      const signature = signTwilio(authToken, inboundUrl, params);

      return page.request.post("/api/twilio/inbound", {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-twilio-signature": signature,
        },
        data: new URLSearchParams(params).toString(),
      });
    };

    const [response1, response2] = await Promise.all([
      sendYes(customer1.phone),
      sendYes(customer2.phone),
    ]);
    const [twiml1, twiml2] = await Promise.all([response1.text(), response2.text()]);

    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);

    const bookings = await db.query.appointments.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.sourceSlotOpeningId, slot.id),
    });
    expect(bookings).toHaveLength(1);

    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slot.id),
    });
    expect(updatedSlot?.status).toBe("filled");

    const offers = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slot.id),
    });
    expect(offers.filter((offer) => offer.status === "accepted")).toHaveLength(1);
    expect(offers.filter((offer) => offer.status === "sent")).toHaveLength(1);

    const winnerId = bookings[0]?.customerId;
    if (!winnerId) {
      throw new Error("No winning booking customer ID");
    }
    expect(await isInCooldown(winnerId)).toBe(true);

    expect(
      [twiml1, twiml2].some((body) =>
        body.includes("Sorry, this slot has just been taken by another customer.")
      )
    ).toBe(true);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
