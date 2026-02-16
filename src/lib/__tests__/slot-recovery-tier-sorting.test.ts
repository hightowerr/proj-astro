import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const { isInCooldownMock } = vi.hoisted(() => ({
  isInCooldownMock: vi.fn(async () => false),
}));

vi.mock("@/lib/redis", () => ({
  acquireLock: vi.fn(async () => ({ acquired: true, lockId: "lock-id" })),
  releaseLock: vi.fn(async () => true),
  setCooldown: vi.fn(async () => undefined),
  isInCooldown: isInCooldownMock,
}));

const [{ db }, { createShop }, slotRecovery, schema] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/slot-recovery"),
  import("@/lib/schema"),
]);

const { getEligibleCustomers, getEffectiveScore, getTierSortPriority } = slotRecovery;
const {
  appointments,
  customerContactPrefs,
  customerScores,
  customers,
  shopPolicies,
  shops,
  slotOpenings,
  user,
} = schema;

let userId: string;
let shopId: string;
let slotOpeningId: string;
let topCustomerId: string;
let neutralCustomerId: string;
let riskCustomerId: string;
let noScoreCustomerId: string;

const insertUser = async (id: string) => {
  await db.insert(user).values({
    id,
    name: "Slot Recovery Tier User",
    email: `slot-recovery-tier-${id}@example.com`,
    emailVerified: true,
  });
};

const seedCandidate = async (input: {
  shopId: string;
  fullName: string;
  phone: string;
  email: string;
  score?: number;
  tier?: "top" | "neutral" | "risk";
  computedAt?: Date;
}) => {
  const [customer] = await db
    .insert(customers)
    .values({
      shopId: input.shopId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create candidate");
  }

  await db.insert(customerContactPrefs).values({
    customerId: customer.id,
    smsOptIn: true,
  });

  if (typeof input.score === "number" && input.tier) {
    await db.insert(customerScores).values({
      customerId: customer.id,
      shopId: input.shopId,
      score: input.score,
      tier: input.tier,
      windowDays: 180,
      stats: {
        settled: 0,
        voided: 0,
        refunded: 0,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
      computedAt: input.computedAt ?? new Date(),
    });
  }

  return customer.id;
};

beforeEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  vi.clearAllMocks();
  isInCooldownMock.mockResolvedValue(false);

  userId = randomUUID();
  await insertUser(userId);

  const shop = await createShop({
    ownerUserId: userId,
    name: "Slot Recovery Tier Shop",
    slug: `slot-recovery-tier-${userId.slice(0, 8)}`,
  });
  shopId = shop.id;

  await db
    .insert(shopPolicies)
    .values({
      shopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      excludeRiskFromOffers: false,
    })
    .onConflictDoUpdate({
      target: shopPolicies.shopId,
      set: {
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        excludeRiskFromOffers: false,
      },
    });

  const [sourceCustomer] = await db
    .insert(customers)
    .values({
      shopId,
      fullName: "Source Customer",
      phone: `+1202${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      email: `source-${randomUUID()}@example.com`,
    })
    .returning();

  if (!sourceCustomer) {
    throw new Error("Failed to create source customer");
  }

  const startsAt = new Date();
  startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  startsAt.setUTCHours(11, 0, 0, 0);

  const [sourceAppointment] = await db
    .insert(appointments)
    .values({
      shopId,
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
      shopId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      sourceAppointmentId: sourceAppointment.id,
      status: "open",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  slotOpeningId = slotOpening.id;

  topCustomerId = await seedCandidate({
    shopId,
    fullName: "Top Tier Customer",
    phone: "+12025550121",
    email: "top-tier-slot-recovery@example.com",
    score: 90,
    tier: "top",
    computedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  neutralCustomerId = await seedCandidate({
    shopId,
    fullName: "Neutral Tier Customer",
    phone: "+12025550122",
    email: "neutral-tier-slot-recovery@example.com",
    score: 55,
    tier: "neutral",
    computedAt: new Date("2026-01-02T00:00:00.000Z"),
  });

  noScoreCustomerId = await seedCandidate({
    shopId,
    fullName: "No Score Customer",
    phone: "+12025550123",
    email: "no-score-slot-recovery@example.com",
  });

  riskCustomerId = await seedCandidate({
    shopId,
    fullName: "Risk Tier Customer",
    phone: "+12025550124",
    email: "risk-tier-slot-recovery@example.com",
    score: 25,
    tier: "risk",
    computedAt: new Date("2026-01-03T00:00:00.000Z"),
  });
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  await db.delete(shops).where(eq(shops.id, shopId));
  await db.delete(user).where(eq(user.id, userId));
});

describe("tier sorting helpers", () => {
  it("returns expected tier sort priorities", () => {
    expect(getTierSortPriority("top")).toBe(1);
    expect(getTierSortPriority("neutral")).toBe(2);
    expect(getTierSortPriority(null)).toBe(2);
    expect(getTierSortPriority("risk")).toBe(3);
  });

  it("returns effective score for null values", () => {
    expect(getEffectiveScore(88)).toBe(88);
    expect(getEffectiveScore(null)).toBe(50);
  });
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("getEligibleCustomers tier prioritization", () => {
  it("orders customers by top > neutral > no-score > risk", async () => {
    const slotOpening = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpeningId),
    });

    if (!slotOpening) {
      throw new Error("Slot opening not found");
    }

    const eligible = await getEligibleCustomers(slotOpening);
    expect(eligible.map((customer) => customer.id)).toEqual([
      topCustomerId,
      neutralCustomerId,
      noScoreCustomerId,
      riskCustomerId,
    ]);
  });

  it("excludes risk tier customers when policy excludes risk offers", async () => {
    await db
      .update(shopPolicies)
      .set({ excludeRiskFromOffers: true })
      .where(eq(shopPolicies.shopId, shopId));

    const slotOpening = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpeningId),
    });

    if (!slotOpening) {
      throw new Error("Slot opening not found");
    }

    const eligible = await getEligibleCustomers(slotOpening);
    expect(eligible.some((customer) => customer.id === riskCustomerId)).toBe(false);
    expect(eligible.map((customer) => customer.id)).toEqual([
      topCustomerId,
      neutralCustomerId,
      noScoreCustomerId,
    ]);
  });

  it("sorts by score descending within the same tier", async () => {
    const higherScoreNeutralId = await seedCandidate({
      shopId,
      fullName: "Neutral High Score",
      phone: "+12025550125",
      email: "neutral-high-slot-recovery@example.com",
      score: 70,
      tier: "neutral",
      computedAt: new Date("2026-01-05T00:00:00.000Z"),
    });

    const lowerScoreNeutralId = await seedCandidate({
      shopId,
      fullName: "Neutral Low Score",
      phone: "+12025550126",
      email: "neutral-low-slot-recovery@example.com",
      score: 45,
      tier: "neutral",
      computedAt: new Date("2026-01-04T00:00:00.000Z"),
    });

    const slotOpening = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpeningId),
    });

    if (!slotOpening) {
      throw new Error("Slot opening not found");
    }

    const eligible = await getEligibleCustomers(slotOpening);
    const higherIndex = eligible.findIndex((customer) => customer.id === higherScoreNeutralId);
    const lowerIndex = eligible.findIndex((customer) => customer.id === lowerScoreNeutralId);

    expect(higherIndex).toBeGreaterThan(-1);
    expect(lowerIndex).toBeGreaterThan(-1);
    expect(higherIndex).toBeLessThan(lowerIndex);
  });

  it("is deterministic across repeated runs", async () => {
    const slotOpening = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpeningId),
    });

    if (!slotOpening) {
      throw new Error("Slot opening not found");
    }

    const run1 = await getEligibleCustomers(slotOpening);
    const run2 = await getEligibleCustomers(slotOpening);
    const run3 = await getEligibleCustomers(slotOpening);

    expect(run1.map((customer) => customer.id)).toEqual(run2.map((customer) => customer.id));
    expect(run2.map((customer) => customer.id)).toEqual(run3.map((customer) => customer.id));
  });
});
