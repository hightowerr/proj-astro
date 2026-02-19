import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createAppointment } from "../../src/lib/queries/appointments";
import { createShop } from "../../src/lib/queries/shops";
import {
  customerScores,
  customers,
  shopPolicies,
  shops,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";

const shouldRun = Boolean(process.env.POSTGRES_URL && process.env.CRON_SECRET);

const nextWeekdayAt = (hourUtc: number, minuteUtc = 0) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(hourUtc, minuteUtc, 0, 0);

  for (let i = 0; i < 7; i += 1) {
    const day = value.getUTCDay();
    if (day >= 1 && day <= 5) {
      return new Date(value);
    }
    value.setUTCDate(value.getUTCDate() + 1);
  }

  return new Date(value);
};

test.describe("Tier system edge cases", () => {
  test.skip(!shouldRun, "Requires POSTGRES_URL and CRON_SECRET");
  const recomputeLockId = String(900000 + Math.floor(Math.random() * 100000));

  test("new customer with no score falls back to base policy", async () => {
    process.env.STRIPE_MOCKED = "true";

    const userId = randomUUID();
    const shopSlug = `tier-edge-${randomUUID().slice(0, 8)}`;

    await db.insert(user).values({
      id: userId,
      name: "Tier Edge User",
      email: `tier-edge-${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Tier Edge Shop",
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
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency: "USD",
          paymentMode: "deposit",
          depositAmountCents: 2000,
        },
      });

    const booking = await createAppointment({
      shopId: shop.id,
      startsAt: nextWeekdayAt(10, 0),
      customer: {
        fullName: "No Score Customer",
        phone: "+12025550301",
        email: "no-score-edge@example.com",
      },
      paymentsEnabled: true,
    });

    expect(booking.paymentRequired).toBe(true);
    expect(booking.amountCents).toBe(2000);
    expect(booking.policyVersion?.depositAmountCents).toBe(2000);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  test("risk customer falls back to base when risk override is null", async () => {
    process.env.STRIPE_MOCKED = "true";

    const userId = randomUUID();
    const shopSlug = `tier-edge-risk-${randomUUID().slice(0, 8)}`;

    await db.insert(user).values({
      id: userId,
      name: "Tier Edge Risk User",
      email: `tier-edge-risk-${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Tier Edge Risk Shop",
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
        riskDepositAmountCents: null,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency: "USD",
          paymentMode: "deposit",
          depositAmountCents: 2000,
          riskDepositAmountCents: null,
        },
      });

    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Risk Edge Customer",
        phone: "+12025550302",
        email: "risk-edge@example.com",
      })
      .returning();

    if (!riskCustomer) {
      throw new Error("Failed to create risk customer");
    }

    await db.insert(customerScores).values({
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
    });

    const booking = await createAppointment({
      shopId: shop.id,
      startsAt: nextWeekdayAt(11, 0),
      customer: {
        fullName: riskCustomer.fullName,
        phone: riskCustomer.phone,
        email: riskCustomer.email,
      },
      paymentsEnabled: true,
    });

    expect(booking.amountCents).toBe(2000);
    expect(booking.policyVersion?.depositAmountCents).toBe(2000);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  test("recompute endpoint returns processed count and error metadata shape", async ({ page }) => {
    const response = await page.request.post(
      `/api/jobs/recompute-scores?lockId=${recomputeLockId}`,
      {
      headers: {
        "x-cron-secret": process.env.CRON_SECRET ?? "",
      },
      }
    );

    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as {
      processed: number;
      errors: number;
      errorDetails: Array<{ customerId: string; shopId: string; error: string }>;
    };

    expect(typeof data.processed).toBe("number");
    expect(typeof data.errors).toBe("number");
    expect(Array.isArray(data.errorDetails)).toBe(true);
  });
});
