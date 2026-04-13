import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePostgresUrl } from "@/test/db-test-guard";

const createCalendarEventMock = vi.fn(async () => `evt-${randomUUID()}`);
const invalidateCalendarCacheMock = vi.fn(async () => {});

vi.mock("@/lib/google-calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/google-calendar")>();
  return {
    ...actual,
    createCalendarEvent: createCalendarEventMock,
    invalidateCalendarCache: invalidateCalendarCacheMock,
  };
});

const hasPostgresUrl = Boolean(
  requirePostgresUrl("src/lib/__tests__/booking-tier-pricing.test.ts"),
);

const [{ db }, { createAppointment }, { createShop }, schema] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/appointments"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
]);

const { customerScores, customers, shopPolicies, shops, user } = schema;

let userId: string;
let shopId: string;

const insertUser = async (id: string) => {
  await db.insert(user).values({
    id,
    name: "Tier Pricing User",
    email: `tier-pricing-${id}@example.com`,
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

  createCalendarEventMock.mockClear();
  createCalendarEventMock.mockImplementation(async () => `evt-${randomUUID()}`);
  invalidateCalendarCacheMock.mockClear();

  userId = randomUUID();
  await insertUser(userId);

  const shop = await createShop({
    ownerUserId: userId,
    name: "Tier Pricing Shop",
    slug: `tier-pricing-${userId.slice(0, 8)}`,
  });
  shopId = shop.id;

  await db
    .insert(shopPolicies)
    .values({
      shopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      riskDepositAmountCents: 5000,
      topDepositWaived: true,
      topDepositAmountCents: null,
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
        topDepositAmountCents: null,
        excludeRiskFromOffers: false,
      },
    });

  const [topCustomer] = await db
    .insert(customers)
    .values({
      shopId,
      fullName: "Top Tier Customer",
      email: "top-tier@example.com",
      phone: "+12025550191",
    })
    .returning();
  const [neutralCustomer] = await db
    .insert(customers)
    .values({
      shopId,
      fullName: "Neutral Tier Customer",
      email: "neutral-tier@example.com",
      phone: "+12025550192",
    })
    .returning();
  const [riskCustomer] = await db
    .insert(customers)
    .values({
      shopId,
      fullName: "Risk Tier Customer",
      email: "risk-tier@example.com",
      phone: "+12025550193",
    })
    .returning();

  if (!topCustomer || !neutralCustomer || !riskCustomer) {
    throw new Error("Failed to seed tier pricing test customers");
  }

  await db.insert(customerScores).values([
    {
      customerId: topCustomer.id,
      shopId,
      score: 92,
      tier: "top",
      windowDays: 180,
      stats: {
        settled: 12,
        voided: 0,
        refunded: 0,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    },
    {
      customerId: neutralCustomer.id,
      shopId,
      score: 55,
      tier: "neutral",
      windowDays: 180,
      stats: {
        settled: 6,
        voided: 0,
        refunded: 1,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    },
    {
      customerId: riskCustomer.id,
      shopId,
      score: 25,
      tier: "risk",
      windowDays: 180,
      stats: {
        settled: 2,
        voided: 3,
        refunded: 0,
        lateCancels: 1,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 2,
      },
    },
  ]);
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  await db.delete(shops).where(eq(shops.id, shopId));
  await db.delete(user).where(eq(user.id, userId));
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("createAppointment tier pricing", () => {
  it("waives payment for top tier customers when configured", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Top Tier Customer",
        email: "top-tier@example.com",
        phone: "+12025550191",
      },
      paymentsEnabled: true,
    });

    expect(result.paymentRequired).toBe(false);
    expect(result.amountCents).toBe(0);
    expect(result.payment).toBeNull();
    expect(result.clientSecret).toBeNull();
    expect(result.policyVersion?.depositAmountCents).toBe(0);
    expect(result.appointment.calendarEventId).toBeTruthy();
    expect(createCalendarEventMock).toHaveBeenCalledTimes(1);
  });

  it("uses base deposit for neutral tier customers", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Neutral Tier Customer",
        email: "neutral-tier@example.com",
        phone: "+12025550192",
      },
      paymentsEnabled: true,
    });

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(2000);
    expect(result.payment?.amountCents).toBe(2000);
    expect(result.policyVersion?.depositAmountCents).toBe(2000);
    expect(result.appointment.calendarEventId).toBeNull();
    expect(createCalendarEventMock).not.toHaveBeenCalled();
  });

  it("uses risk override deposit for risk tier customers", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Risk Tier Customer",
        email: "risk-tier@example.com",
        phone: "+12025550193",
      },
      paymentsEnabled: true,
    });

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(5000);
    expect(result.payment?.amountCents).toBe(5000);
    expect(result.policyVersion?.depositAmountCents).toBe(5000);
    expect(result.appointment.calendarEventId).toBeNull();
    expect(createCalendarEventMock).not.toHaveBeenCalled();
  });

  it("treats customers without a score as neutral default", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "New Customer",
        email: "new-tier@example.com",
        phone: "+12025550199",
      },
      paymentsEnabled: true,
    });

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(2000);
    expect(result.payment?.amountCents).toBe(2000);
    expect(result.policyVersion?.depositAmountCents).toBe(2000);
    expect(result.appointment.calendarEventId).toBeNull();
    expect(createCalendarEventMock).not.toHaveBeenCalled();
  });

  it("clamps risk-tier deposits to the event type floor", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Risk Tier Customer",
        email: "risk-tier@example.com",
        phone: "+12025550193",
      },
      paymentsEnabled: true,
      eventTypeDepositCents: 6000,
    });

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(6000);
    expect(result.payment?.amountCents).toBe(6000);
    expect(result.policyVersion?.depositAmountCents).toBe(6000);
  });

  it("preserves top-tier waivers for higher-priced services", async () => {
    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Top Tier Customer",
        email: "top-tier@example.com",
        phone: "+12025550191",
      },
      paymentsEnabled: true,
      eventTypeDepositCents: 5000,
    });

    expect(result.paymentRequired).toBe(false);
    expect(result.amountCents).toBe(0);
    expect(result.payment).toBeNull();
    expect(result.policyVersion?.depositAmountCents).toBe(0);
  });

  it("preserves top-tier reduced deposits for higher-priced services", async () => {
    await db
      .insert(shopPolicies)
      .values({
        shopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        riskDepositAmountCents: 5000,
        topDepositWaived: false,
        topDepositAmountCents: 1000,
        excludeRiskFromOffers: false,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency: "USD",
          paymentMode: "deposit",
          depositAmountCents: 2000,
          riskDepositAmountCents: 5000,
          topDepositWaived: false,
          topDepositAmountCents: 1000,
          excludeRiskFromOffers: false,
        },
      });

    const result = await createAppointment({
      shopId,
      startsAt: nextWeekdayStartAt(),
      customer: {
        fullName: "Top Tier Customer",
        email: "top-tier@example.com",
        phone: "+12025550191",
      },
      paymentsEnabled: true,
      eventTypeDepositCents: 5000,
    });

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(1000);
    expect(result.payment?.amountCents).toBe(1000);
    expect(result.policyVersion?.depositAmountCents).toBe(1000);
  });

});
