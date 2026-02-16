import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createAppointment } from "../../src/lib/queries/appointments";
import { createShop } from "../../src/lib/queries/shops";
import {
  appointments,
  customerContactPrefs,
  customerScores,
  customers,
  shopPolicies,
  shops,
  slotOpenings,
  user,
} from "../../src/lib/schema";
import { getEligibleCustomers } from "../../src/lib/slot-recovery";
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

const daysAgo = (days: number) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value;
};

const runRecomputeWithRetry = async (
  post: (url: string, options: { headers: Record<string, string> }) => Promise<{
    ok: () => boolean;
    json: () => Promise<unknown>;
  }>,
  attempts = 6
) => {
  let lastPayload: unknown = null;

  for (let i = 0; i < attempts; i += 1) {
    const response = await post("/api/jobs/recompute-scores", {
      headers: {
        "x-cron-secret": process.env.CRON_SECRET ?? "",
      },
    });

    if (!response.ok()) {
      throw new Error("recompute-scores request failed");
    }

    const payload = (await response.json()) as { skipped?: boolean };
    lastPayload = payload;
    if (!payload.skipped) {
      return payload;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `recompute-scores stayed locked after ${attempts} attempts: ${JSON.stringify(lastPayload)}`
  );
};

test.describe("Tier system full flow", () => {
  test.skip(!shouldRun, "Requires POSTGRES_URL and CRON_SECRET");

  test("recompute -> tier pricing -> offer prioritization", async ({ page }) => {
    process.env.STRIPE_MOCKED = "true";

    const userId = randomUUID();
    const shopSlug = `tier-full-flow-${randomUUID().slice(0, 8)}`;

    await db.insert(user).values({
      id: userId,
      name: "Tier Full Flow User",
      email: `tier-full-flow-${userId}@example.com`,
      emailVerified: true,
    });

    const shop = await createShop({
      ownerUserId: userId,
      name: "Tier Full Flow Shop",
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
        riskDepositAmountCents: 5000,
        topDepositWaived: true,
        excludeRiskFromOffers: false,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency: "USD",
          paymentMode: "deposit",
          depositAmountCents: 2000,
          riskDepositAmountCents: 5000,
          topDepositWaived: true,
          excludeRiskFromOffers: false,
        },
      });

    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Top Flow Customer",
        phone: "+12025550201",
        email: "top-flow@example.com",
      })
      .returning();
    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Neutral Flow Customer",
        phone: "+12025550202",
        email: "neutral-flow@example.com",
      })
      .returning();
    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Risk Flow Customer",
        phone: "+12025550203",
        email: "risk-flow@example.com",
      })
      .returning();

    if (!topCustomer || !neutralCustomer || !riskCustomer) {
      throw new Error("Failed to create flow customers");
    }

    await db.insert(customerContactPrefs).values([
      { customerId: topCustomer.id, smsOptIn: true },
      { customerId: neutralCustomer.id, smsOptIn: true },
      { customerId: riskCustomer.id, smsOptIn: true },
    ]);

    const seedHistory = async (input: {
      customerId: string;
      createdAt: Date;
      financialOutcome: "settled" | "voided" | "refunded";
      resolutionReason?: string | null;
      status?: "booked" | "cancelled";
    }) => {
      const startsAt = new Date(input.createdAt.getTime() - 60 * 60 * 1000);
      await db.insert(appointments).values({
        shopId: shop.id,
        customerId: input.customerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: input.status ?? "booked",
        financialOutcome: input.financialOutcome,
        resolutionReason: input.resolutionReason ?? "completed_on_time",
        createdAt: input.createdAt,
      });
    };

    // Top: enough positive history to become top tier.
    await seedHistory({
      customerId: topCustomer.id,
      createdAt: daysAgo(5),
      financialOutcome: "settled",
    });
    await seedHistory({
      customerId: topCustomer.id,
      createdAt: daysAgo(6),
      financialOutcome: "settled",
    });
    await seedHistory({
      customerId: topCustomer.id,
      createdAt: daysAgo(7),
      financialOutcome: "settled",
    });
    await seedHistory({
      customerId: topCustomer.id,
      createdAt: daysAgo(8),
      financialOutcome: "settled",
    });

    // Neutral: slight positive history.
    await seedHistory({
      customerId: neutralCustomer.id,
      createdAt: daysAgo(120),
      financialOutcome: "settled",
    });

    // Risk: two recent voids.
    await seedHistory({
      customerId: riskCustomer.id,
      createdAt: daysAgo(3),
      financialOutcome: "voided",
      resolutionReason: "no_show",
    });
    await seedHistory({
      customerId: riskCustomer.id,
      createdAt: daysAgo(4),
      financialOutcome: "voided",
      resolutionReason: "no_show",
    });

    await runRecomputeWithRetry((url, options) => page.request.post(url, options));

    const scores = await db
      .select({
        customerId: customerScores.customerId,
        score: customerScores.score,
        tier: customerScores.tier,
      })
      .from(customerScores)
      .where(eq(customerScores.shopId, shop.id));

    expect(scores.length).toBeGreaterThanOrEqual(3);
    expect(scores.find((row) => row.customerId === topCustomer.id)?.tier).toBe("top");
    expect(scores.find((row) => row.customerId === neutralCustomer.id)?.tier).toBe("neutral");
    expect(scores.find((row) => row.customerId === riskCustomer.id)?.tier).toBe("risk");

    const topBooking = await createAppointment({
      shopId: shop.id,
      startsAt: nextWeekdayAt(10, 0),
      customer: {
        fullName: topCustomer.fullName,
        phone: topCustomer.phone,
        email: topCustomer.email,
      },
      paymentsEnabled: true,
    });

    expect(topBooking.paymentRequired).toBe(false);
    expect(topBooking.amountCents).toBe(0);
    expect(topBooking.policyVersion?.depositAmountCents).toBe(0);

    const riskBooking = await createAppointment({
      shopId: shop.id,
      startsAt: nextWeekdayAt(11, 0),
      customer: {
        fullName: riskCustomer.fullName,
        phone: riskCustomer.phone,
        email: riskCustomer.email,
      },
      paymentsEnabled: true,
    });

    expect(riskBooking.paymentRequired).toBe(true);
    expect(riskBooking.amountCents).toBe(5000);
    expect(riskBooking.policyVersion?.depositAmountCents).toBe(5000);

    const sourceAppointment = await createAppointment({
      shopId: shop.id,
      startsAt: nextWeekdayAt(12, 0),
      customer: {
        fullName: "Source Appointment Customer",
        phone: "+12025550209",
        email: "source-flow@example.com",
      },
      paymentsEnabled: false,
    });

    const slotStartsAt = nextWeekdayAt(13, 0);
    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: shop.id,
        startsAt: slotStartsAt,
        endsAt: new Date(slotStartsAt.getTime() + 60 * 60 * 1000),
        sourceAppointmentId: sourceAppointment.appointment.id,
        status: "open",
      })
      .returning();

    if (!slotOpening) {
      throw new Error("Failed to create slot opening");
    }

    const eligible = await getEligibleCustomers(slotOpening);
    expect(eligible[0]?.id).toBe(topCustomer.id);

    const neutralIndex = eligible.findIndex((customer) => customer.id === neutralCustomer.id);
    const riskIndex = eligible.findIndex((customer) => customer.id === riskCustomer.id);
    expect(neutralIndex).toBeGreaterThan(-1);
    expect(riskIndex).toBeGreaterThan(-1);
    expect(neutralIndex).toBeLessThan(riskIndex);

    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
