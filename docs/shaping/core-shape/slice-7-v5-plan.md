# V5: Offer Loop Tier Prioritization

**Goal:** Prioritize slot recovery offers by customer tier (top > neutral > risk) with configurable risk tier handling

**Appetite:** 0.5-1 day

**Demo:** Create slot opening → verify highest-tier customers receive offers first, risk tier customers are deprioritized or excluded based on settings

---

## Overview

V5 integrates tier-based prioritization into the slot recovery offer loop. When a slot opens (from cancellation), the system now sends offers to the most reliable customers first, improving booking quality and reducing SMS waste. Shops can configure whether risk tier customers are simply deprioritized (default) or completely excluded from receiving offers.

### What's Built

- Modify: `getEligibleCustomers()` in `/src/lib/slot-recovery.ts`
- Add joins to `customer_scores` and `shop_policies` tables
- Replace random ordering with tier-based deterministic sort
- Implement configurable risk tier filtering via `excludeRiskFromOffers` setting
- Unit tests for tier sorting logic
- Integration tests for offer prioritization flow

---

## Scope

### In Scope

- Load customer scores and tiers during eligible customer query
- Load shop policy to check `excludeRiskFromOffers` setting
- Sort eligible customers by tier priority: top (1) > neutral (2) > risk (3)
- Within same tier, sort by score descending (higher scores first)
- Treat NULL tier/score as neutral tier with score 50 (default behavior)
- When `excludeRiskFromOffers=true`, completely filter out risk tier customers
- When `excludeRiskFromOffers=false` (default), risk tier goes last in priority
- Maintain deterministic ordering (no randomness)
- Unit tests for sorting logic with different tier combinations
- E2E tests verifying offer sequence follows tier priority

### Out of Scope

- Real-time tier updates during offer loop (use scores from last nightly batch)
- Tier-based offer expiry times (all offers still expire in 15 minutes)
- Tier-aware SMS messaging (all customers get same message)
- Dashboard UI for viewing offer sequences (V6)
- Manual tier override for specific offers
- Historical migration of existing slot openings
- Tier-based limits on number of offers sent

---

## Implementation Steps

### Step 1: Modify getEligibleCustomers Query

**File:** `src/lib/slot-recovery.ts`

Modify the `getEligibleCustomers()` function (lines 114-165) to add tier joins and sorting:

```typescript
import { and, desc, eq, gt, isNull, sql, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAppointment } from "@/lib/queries/appointments";
import { acquireLock, isInCooldown, releaseLock, setCooldown } from "@/lib/redis";
import {
  appointments,
  customerContactPrefs,
  customers,
  customerScores,
  payments,
  shopPolicies,
  shops,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
import { sendTwilioSms } from "@/lib/twilio";

// ... existing code ...

/**
 * Get eligible customers for a slot opening, prioritized by tier.
 *
 * Filters:
 * - sms_opt_in = true
 * - phone present
 * - no overlapping booked/pending appointment
 * - no prior offer for this slot
 * - not in Redis cooldown
 * - (optional) exclude risk tier if shop policy configured
 *
 * Ordering (deterministic):
 * 1. Tier priority: top (1) > neutral (2) > risk (3)
 * 2. Score descending (within same tier)
 * 3. Computed timestamp descending (recency tiebreaker)
 * 4. NULL tier/score treated as neutral tier with score 50
 */
export async function getEligibleCustomers(
  slotOpening: typeof slotOpenings.$inferSelect
): Promise<EligibleCustomer[]> {
  // Load shop policy to check exclude_risk_from_offers setting
  const [shopPolicy] = await db
    .select({
      excludeRiskFromOffers: shopPolicies.excludeRiskFromOffers,
    })
    .from(shopPolicies)
    .where(eq(shopPolicies.shopId, slotOpening.shopId))
    .limit(1);

  const excludeRisk = shopPolicy?.excludeRiskFromOffers ?? false;

  // Build WHERE conditions
  const whereConditions = [
    eq(customers.shopId, slotOpening.shopId),
    eq(customerContactPrefs.smsOptIn, true),
    isNull(slotOffers.id),
    sql`${customers.phone} <> ''`,
  ];

  // If exclude_risk_from_offers is enabled, filter out risk tier
  if (excludeRisk) {
    whereConditions.push(
      sql`(${customerScores.tier} IS NULL OR ${customerScores.tier} != 'risk')`
    );
  }

  const candidates = await db
    .select({
      id: customers.id,
      phone: customers.phone,
      fullName: customers.fullName,
      tier: customerScores.tier,
      score: customerScores.score,
      computedAt: customerScores.computedAt,
    })
    .from(customers)
    .innerJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, customers.id),
        eq(customerScores.shopId, slotOpening.shopId)
      )
    )
    .leftJoin(
      slotOffers,
      and(eq(slotOffers.customerId, customers.id), eq(slotOffers.slotOpeningId, slotOpening.id))
    )
    .where(and(...whereConditions))
    .orderBy(
      // 1. Tier priority: top=1, neutral/null=2, risk=3
      sql`CASE
        WHEN ${customerScores.tier} = 'top' THEN 1
        WHEN ${customerScores.tier} = 'neutral' OR ${customerScores.tier} IS NULL THEN 2
        WHEN ${customerScores.tier} = 'risk' THEN 3
        END ASC`,
      // 2. Score descending (NULL treated as 50)
      sql`COALESCE(${customerScores.score}, 50) DESC`,
      // 3. Recency tiebreaker (most recently computed first)
      sql`${customerScores.computedAt} DESC NULLS LAST`
    )
    .limit(50);

  const eligible: EligibleCustomer[] = [];

  for (const candidate of candidates) {
    // Check for overlapping appointments
    const overlapping = await db.query.appointments.findFirst({
      where: (table, { and: whereAnd, eq: whereEq, gt: whereGt, inArray, lt: whereLt }) =>
        whereAnd(
          whereEq(table.shopId, slotOpening.shopId),
          whereEq(table.customerId, candidate.id),
          inArray(table.status, ["booked", "pending"]),
          whereLt(table.startsAt, slotOpening.endsAt),
          whereGt(table.endsAt, slotOpening.startsAt)
        ),
    });

    if (!overlapping) {
      // Check Redis cooldown
      const inCooldown = await isInCooldown(candidate.id);
      if (inCooldown) {
        continue;
      }

      eligible.push({
        id: candidate.id,
        phone: candidate.phone,
        fullName: candidate.fullName,
      });
    }
  }

  return eligible;
}

// ... rest of existing code unchanged ...
```

**Key changes:**
1. Import `customerScores`, `shopPolicies`, `ne` from schema
2. Load shop policy to check `excludeRiskFromOffers` setting
3. Add LEFT JOIN to `customerScores` table
4. Add conditional WHERE clause to exclude risk tier when configured
5. Replace `.orderBy(sql\`random()\`)` with deterministic tier-based sort
6. Extend select to include tier, score, computedAt for debugging (not returned in final result)

---

### Step 2: Add Tier Sorting Helper (Optional)

**File:** `src/lib/slot-recovery.ts`

For better testability, extract tier sorting logic into a pure function:

```typescript
/**
 * Calculate tier sort priority for deterministic ordering.
 *
 * Returns a numeric priority where lower numbers come first:
 * - top tier: 1
 * - neutral tier or NULL: 2
 * - risk tier: 3
 *
 * @param tier - Customer tier or null
 * @returns Sort priority (1-3)
 */
export function getTierSortPriority(tier: "top" | "neutral" | "risk" | null): number {
  if (tier === "top") return 1;
  if (tier === "neutral" || tier === null) return 2;
  if (tier === "risk") return 3;
  return 2; // Default to neutral priority
}

/**
 * Get effective score for sorting (NULL treated as 50).
 *
 * @param score - Customer score or null
 * @returns Score value for sorting (0-100)
 */
export function getEffectiveScore(score: number | null): number {
  return score ?? 50;
}
```

**Note:** This step is optional but improves testability. The sorting logic is already embedded in the SQL ORDER BY clause.

---

### Step 3: Unit Tests for Tier Sorting Logic

**File:** `src/lib/__tests__/slot-recovery-tier-sorting.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import {
  customers,
  customerScores,
  customerContactPrefs,
  shops,
  shopPolicies,
  slotOpenings,
} from "@/lib/schema";
import { getEligibleCustomers } from "@/lib/slot-recovery";
import { eq } from "drizzle-orm";

describe("Tier-based offer prioritization", () => {
  let testShopId: string;
  let slotOpeningId: string;
  let topCustomerId: string;
  let neutralCustomerId: string;
  let riskCustomerId: string;
  let noScoreCustomerId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Test Tier Shop",
        slug: "test-tier-shop",
        currency: "USD",
        ownerId: "test-owner",
        status: "active",
      })
      .returning();
    testShopId = shop.id;

    // Create shop policy with default settings (exclude_risk = false)
    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      resolutionGraceMinutes: 30,
      excludeRiskFromOffers: false, // Default: deprioritize, don't exclude
    });

    // Create slot opening
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const [slot] = await db
      .insert(slotOpenings)
      .values({
        shopId: testShopId,
        startsAt: futureTime,
        endsAt: new Date(futureTime.getTime() + 60 * 60 * 1000), // 1 hour later
        sourceAppointmentId: "test-appt",
        status: "open",
      })
      .returning();
    slotOpeningId = slot.id;

    // Create customers with different tiers
    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Top Tier Customer",
        phone: "+15551111111",
        email: "top@example.com",
      })
      .returning();
    topCustomerId = topCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: topCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: topCustomerId,
      shopId: testShopId,
      score: 85,
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
    });

    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Neutral Tier Customer",
        phone: "+15552222222",
        email: "neutral@example.com",
      })
      .returning();
    neutralCustomerId = neutralCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: neutralCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: neutralCustomerId,
      shopId: testShopId,
      score: 55,
      tier: "neutral",
      windowDays: 180,
      stats: {
        settled: 5,
        voided: 0,
        refunded: 1,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    });

    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Risk Tier Customer",
        phone: "+15553333333",
        email: "risk@example.com",
      })
      .returning();
    riskCustomerId = riskCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: riskCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: riskCustomerId,
      shopId: testShopId,
      score: 30,
      tier: "risk",
      windowDays: 180,
      stats: {
        settled: 2,
        voided: 2,
        refunded: 0,
        lateCancels: 1,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 2,
      },
    });

    const [noScoreCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "New Customer No Score",
        phone: "+15554444444",
        email: "new@example.com",
      })
      .returning();
    noScoreCustomerId = noScoreCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: noScoreCustomerId,
      smsOptIn: true,
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await db.delete(customerScores).where(eq(customerScores.shopId, testShopId));
    await db.delete(customerContactPrefs);
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(slotOpenings).where(eq(slotOpenings.shopId, testShopId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("prioritizes top tier customers first", async () => {
    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    expect(eligible.length).toBeGreaterThanOrEqual(4);
    expect(eligible[0].id).toBe(topCustomerId); // Top tier goes first
  });

  it("places neutral tier customers before risk tier", async () => {
    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    const neutralIndex = eligible.findIndex((c) => c.id === neutralCustomerId);
    const riskIndex = eligible.findIndex((c) => c.id === riskCustomerId);

    expect(neutralIndex).toBeGreaterThan(-1);
    expect(riskIndex).toBeGreaterThan(-1);
    expect(neutralIndex).toBeLessThan(riskIndex); // Neutral before risk
  });

  it("treats customers without scores as neutral tier", async () => {
    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    const noScoreIndex = eligible.findIndex((c) => c.id === noScoreCustomerId);
    const riskIndex = eligible.findIndex((c) => c.id === riskCustomerId);

    expect(noScoreIndex).toBeGreaterThan(-1);
    expect(riskIndex).toBeGreaterThan(-1);
    expect(noScoreIndex).toBeLessThan(riskIndex); // No score (neutral) before risk
  });

  it("excludes risk tier when excludeRiskFromOffers is true", async () => {
    // Update shop policy to exclude risk tier
    await db
      .update(shopPolicies)
      .set({ excludeRiskFromOffers: true })
      .where(eq(shopPolicies.shopId, testShopId));

    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    const riskInList = eligible.some((c) => c.id === riskCustomerId);
    expect(riskInList).toBe(false); // Risk tier excluded
    expect(eligible.some((c) => c.id === topCustomerId)).toBe(true); // Top tier included
    expect(eligible.some((c) => c.id === neutralCustomerId)).toBe(true); // Neutral included
  });

  it("includes risk tier (last) when excludeRiskFromOffers is false", async () => {
    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    const riskInList = eligible.some((c) => c.id === riskCustomerId);
    expect(riskInList).toBe(true); // Risk tier included (but last)
  });

  it("sorts by score within same tier", async () => {
    // Create two neutral tier customers with different scores
    const [neutral1] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Neutral High Score",
        phone: "+15555555555",
        email: "neutral-high@example.com",
      })
      .returning();

    await db.insert(customerContactPrefs).values({
      customerId: neutral1.id,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: neutral1.id,
      shopId: testShopId,
      score: 65, // Higher score
      tier: "neutral",
      windowDays: 180,
      stats: {
        settled: 7,
        voided: 0,
        refunded: 0,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    });

    const [neutral2] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Neutral Low Score",
        phone: "+15556666666",
        email: "neutral-low@example.com",
      })
      .returning();

    await db.insert(customerContactPrefs).values({
      customerId: neutral2.id,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: neutral2.id,
      shopId: testShopId,
      score: 45, // Lower score
      tier: "neutral",
      windowDays: 180,
      stats: {
        settled: 3,
        voided: 0,
        refunded: 1,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    });

    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const eligible = await getEligibleCustomers(slot);

    const highScoreIndex = eligible.findIndex((c) => c.id === neutral1.id);
    const lowScoreIndex = eligible.findIndex((c) => c.id === neutral2.id);

    expect(highScoreIndex).toBeGreaterThan(-1);
    expect(lowScoreIndex).toBeGreaterThan(-1);
    expect(highScoreIndex).toBeLessThan(lowScoreIndex); // Higher score comes first
  });

  it("produces deterministic ordering (no randomness)", async () => {
    const [slot] = await db
      .select()
      .from(slotOpenings)
      .where(eq(slotOpenings.id, slotOpeningId))
      .limit(1);

    const run1 = await getEligibleCustomers(slot);
    const run2 = await getEligibleCustomers(slot);
    const run3 = await getEligibleCustomers(slot);

    // Order should be identical across runs
    expect(run1.map((c) => c.id)).toEqual(run2.map((c) => c.id));
    expect(run2.map((c) => c.id)).toEqual(run3.map((c) => c.id));
  });
});
```

---

### Step 4: E2E Test for Offer Sequence

**File:** `tests/e2e/tier-based-offers.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  customerContactPrefs,
  customerScores,
  payments,
  shops,
  shopPolicies,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Tier-based slot recovery offers", () => {
  let testShopId: string;
  let topCustomerId: string;
  let neutralCustomerId: string;
  let riskCustomerId: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Tier Test Shop",
        slug: "e2e-tier-shop",
        currency: "USD",
        ownerId: "test-owner",
        status: "active",
      })
      .returning();
    testShopId = shop.id;

    // Create shop policy (default: deprioritize risk)
    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      resolutionGraceMinutes: 30,
      excludeRiskFromOffers: false,
    });

    // Create customers with different tiers
    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Top Customer",
        phone: "+15551111111",
        email: "top-e2e@example.com",
      })
      .returning();
    topCustomerId = topCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: topCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: topCustomerId,
      shopId: testShopId,
      score: 90,
      tier: "top",
      windowDays: 180,
      stats: {
        settled: 15,
        voided: 0,
        refunded: 0,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    });

    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Neutral Customer",
        phone: "+15552222222",
        email: "neutral-e2e@example.com",
      })
      .returning();
    neutralCustomerId = neutralCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: neutralCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: neutralCustomerId,
      shopId: testShopId,
      score: 50,
      tier: "neutral",
      windowDays: 180,
      stats: {
        settled: 5,
        voided: 0,
        refunded: 1,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 0,
      },
    });

    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Risk Customer",
        phone: "+15553333333",
        email: "risk-e2e@example.com",
      })
      .returning();
    riskCustomerId = riskCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: riskCustomerId,
      smsOptIn: true,
    });

    await db.insert(customerScores).values({
      customerId: riskCustomerId,
      shopId: testShopId,
      score: 25,
      tier: "risk",
      windowDays: 180,
      stats: {
        settled: 1,
        voided: 2,
        refunded: 0,
        lateCancels: 2,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 2,
      },
    });
  });

  test.afterEach(async () => {
    // Cleanup
    await db.delete(slotOffers).where(eq(slotOffers.slotOpeningId, testShopId));
    await db.delete(slotOpenings).where(eq(slotOpenings.shopId, testShopId));
    await db.delete(payments).where(eq(payments.shopId, testShopId));
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customerScores).where(eq(customerScores.shopId, testShopId));
    await db.delete(customerContactPrefs);
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("sends offers in tier priority order: top -> neutral -> risk", async () => {
    // Create slot opening
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [slot] = await db
      .insert(slotOpenings)
      .values({
        shopId: testShopId,
        startsAt: futureTime,
        endsAt: new Date(futureTime.getTime() + 60 * 60 * 1000),
        sourceAppointmentId: "test-appt",
        status: "open",
      })
      .returning();

    // Trigger offer loop
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const internalSecret = process.env.INTERNAL_SECRET;

    const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    expect(response.ok).toBe(true);

    // Verify first offer went to top tier customer
    const firstOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
    });

    expect(firstOffer).toBeDefined();
    expect(firstOffer?.customerId).toBe(topCustomerId);

    // Expire first offer and trigger next
    await db
      .update(slotOffers)
      .set({ status: "expired", expiresAt: new Date(Date.now() - 1000) })
      .where(eq(slotOffers.id, firstOffer!.id));

    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    // Verify second offer went to neutral tier customer
    const allOffers = await db.query.slotOffers.findMany({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
      orderBy: (table, { asc }) => [asc(table.sentAt)],
    });

    expect(allOffers.length).toBe(2);
    expect(allOffers[1].customerId).toBe(neutralCustomerId);

    // Expire second offer and trigger next
    await db
      .update(slotOffers)
      .set({ status: "expired", expiresAt: new Date(Date.now() - 1000) })
      .where(eq(slotOffers.id, allOffers[1].id));

    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    // Verify third offer went to risk tier customer
    const finalOffers = await db.query.slotOffers.findMany({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
      orderBy: (table, { asc }) => [asc(table.sentAt)],
    });

    expect(finalOffers.length).toBe(3);
    expect(finalOffers[2].customerId).toBe(riskCustomerId);
  });

  test("excludes risk tier when excludeRiskFromOffers is enabled", async () => {
    // Enable risk tier exclusion
    await db
      .update(shopPolicies)
      .set({ excludeRiskFromOffers: true })
      .where(eq(shopPolicies.shopId, testShopId));

    // Create slot opening
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [slot] = await db
      .insert(slotOpenings)
      .values({
        shopId: testShopId,
        startsAt: futureTime,
        endsAt: new Date(futureTime.getTime() + 60 * 60 * 1000),
        sourceAppointmentId: "test-appt",
        status: "open",
      })
      .returning();

    // Trigger offer loop
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const internalSecret = process.env.INTERNAL_SECRET;

    // Send first offer (top tier)
    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    const firstOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq }) => eq(table.slotOpeningId, slot.id),
    });

    expect(firstOffer?.customerId).toBe(topCustomerId);

    // Expire and send second offer (should go to neutral, skip risk)
    await db
      .update(slotOffers)
      .set({ status: "expired" })
      .where(eq(slotOffers.id, firstOffer!.id));

    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slot.id }),
    });

    const secondOffer = await db.query.slotOffers.findFirst({
      where: (table, { and: whereAnd, eq: whereEq, ne: whereNe }) =>
        whereAnd(
          whereEq(table.slotOpeningId, slot.id),
          whereNe(table.id, firstOffer!.id)
        ),
    });

    expect(secondOffer?.customerId).toBe(neutralCustomerId); // Skip risk, go to neutral

    // Verify risk customer never received an offer
    const riskOffer = await db.query.slotOffers.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.slotOpeningId, slot.id),
          whereEq(table.customerId, riskCustomerId)
        ),
    });

    expect(riskOffer).toBeUndefined(); // Risk tier excluded
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Setup test environment:**
   ```bash
   # Ensure V1 (scoring) completed and scores populated
   pnpm db:migrate
   pnpm db:studio
   # Verify customer_scores table has data
   ```

2. **Create test scenario:**
   - Create shop with 3+ customers having different tiers
   - Use Drizzle Studio or seed script:
     - Customer A: tier=top, score=85
     - Customer B: tier=neutral, score=55
     - Customer C: tier=risk, score=30
     - Customer D: no score (NULL tier)

3. **Test default behavior (deprioritize risk):**
   ```bash
   # Create slot opening (cancel a booking)
   # Or use API: POST /api/manage/{token}/cancel

   # Check slot_offers table
   # Verify offers sent in order: A → B → D → C
   # (top → neutral → no-score → risk)
   ```

4. **Test risk tier exclusion:**
   ```bash
   # Update shop_policies: exclude_risk_from_offers = true
   pnpm db:studio

   # Create new slot opening
   # Check slot_offers table
   # Verify Customer C (risk) never receives offer
   # Offers sent: A → B → D only
   ```

5. **Test score-based sorting within tiers:**
   - Create 2 neutral tier customers with different scores (60 vs 45)
   - Create slot opening
   - Verify higher score (60) gets offer before lower score (45)

6. **Test deterministic ordering:**
   - Create slot opening 3 times (separate test runs)
   - Verify identical offer sequence each time (no randomness)

### Database Verification

```sql
-- Check offer sequence for a slot
SELECT
  so.sent_at,
  c.full_name,
  cs.tier,
  cs.score,
  so.status
FROM slot_offers so
JOIN customers c ON c.id = so.customer_id
LEFT JOIN customer_scores cs ON cs.customer_id = c.id AND cs.shop_id = c.shop_id
WHERE so.slot_opening_id = '<slot-opening-id>'
ORDER BY so.sent_at ASC;

-- Expected result:
-- sent_at              | full_name         | tier    | score | status
-- 2024-01-01 10:00:00  | Top Customer      | top     | 85    | expired
-- 2024-01-01 10:15:00  | Neutral Customer  | neutral | 55    | expired
-- 2024-01-01 10:30:00  | New Customer      | NULL    | NULL  | sent
-- 2024-01-01 10:45:00  | Risk Customer     | risk    | 30    | sent
```

### Automated Testing

```bash
# Run unit tests
pnpm test src/lib/__tests__/slot-recovery-tier-sorting.test.ts

# Run E2E tests
pnpm test:e2e tests/e2e/tier-based-offers.spec.ts

# Run all tests
pnpm test
pnpm test:e2e
```

**Expected:**
- ✅ All tier sorting tests pass
- ✅ Risk exclusion test passes
- ✅ Deterministic ordering verified
- ✅ E2E offer sequence test passes

---

## Acceptance Criteria

- ✅ `getEligibleCustomers()` joins to `customer_scores` table
- ✅ Shop policy `excludeRiskFromOffers` setting is loaded and respected
- ✅ Customers sorted by tier priority: top (1) > neutral (2) > risk (3)
- ✅ Within same tier, sorted by score descending (higher scores first)
- ✅ NULL tier/score treated as neutral tier with score 50
- ✅ When `excludeRiskFromOffers=true`, risk tier filtered out entirely
- ✅ When `excludeRiskFromOffers=false` (default), risk tier goes last
- ✅ Ordering is deterministic (no `random()` used)
- ✅ Recency tiebreaker uses `computedAt DESC NULLS LAST`
- ✅ All unit tests pass with >90% coverage
- ✅ E2E tests verify offer sequence follows tier priority
- ✅ No performance regression (indexed joins on customer_id + shop_id)

---

## Dependencies

**Required:**
- V1: `customer_scores` table with populated tiers and scores
- V1: Recompute job has run (scores computed)
- V3: `shop_policies.excludeRiskFromOffers` column exists
- Existing: `getEligibleCustomers()` function
- Existing: Offer loop endpoint (`/api/jobs/offer-loop`)

**Provides to:**
- V6: Complete tier system ready for end-to-end polish
- Production: Tier-optimized slot recovery (quality > quantity)

---

## Cut Strategy

If time runs short:

**Must have:**
- ✅ Tier-based sorting (ORDER BY tier, score, recency)
- ✅ NULL tier handling (treat as neutral)
- ✅ Basic unit tests

**Nice to have:**
- Risk tier exclusion setting (`excludeRiskFromOffers`)
- Comprehensive E2E tests
- Score-within-tier sorting tests

**Can cut entirely:**
- Recency tiebreaker (just use tier + score)
- Helper functions (`getTierSortPriority`, `getEffectiveScore`)
- Extensive edge case tests

Core tier prioritization is more important than configurability. Default behavior (deprioritize risk) delivers value even without exclusion toggle.

---

## Performance Considerations

**Query complexity:**
- Added 2 LEFT JOINs: `customer_scores`, `shop_policies`
- Both joins use indexed columns (unique constraint on customer_id + shop_id)
- LIMIT 50 keeps result set small

**Index verification:**
```sql
-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customer_scores';

-- Expected: customer_scores_customer_shop_idx (customer_id, shop_id)
```

**Estimated impact:**
- Query time: <50ms (indexed joins)
- Offers still processed sequentially (no change)
- Overall latency: <10ms added per offer loop execution

**Optimization notes:**
- Scores pre-computed nightly (no real-time calculation)
- Shop policy loaded once per query (not per customer)
- Overlapping appointment check still N+1 (can optimize in V6 if needed)

---

## Rollback Plan

If V5 causes issues:

1. **Revert code changes:**
   ```bash
   git revert <v5-commit-hash>
   git push
   ```

2. **Database:**
   - No schema changes (uses existing tables)
   - Old code still works (LEFT JOINs backward-compatible)

3. **Behavior:**
   - Reverts to random ordering
   - No tier prioritization
   - V1-V4 features unaffected

V5 only changes offer order. Existing slot recovery functionality remains intact.

---

## Security Notes

- No new authentication (uses existing offer loop security)
- No customer-facing tier disclosure (internal logic only)
- Scores read from database (no user input)
- Policy setting requires business owner authentication (V3)
- SQL injection prevented by parameterized queries

---

## Integration Points

### V1: Customer Scores

V5 reads tier and score from `customer_scores`:

```typescript
.leftJoin(
  customerScores,
  and(
    eq(customerScores.customerId, customers.id),
    eq(customerScores.shopId, slotOpening.shopId)
  )
)
```

### V3: Tier Policy Settings

V5 reads `excludeRiskFromOffers` from `shop_policies`:

```typescript
const [shopPolicy] = await db
  .select({ excludeRiskFromOffers: shopPolicies.excludeRiskFromOffers })
  .from(shopPolicies)
  .where(eq(shopPolicies.shopId, slotOpening.shopId))
  .limit(1);
```

### Existing: Offer Loop

V5 modifies eligible customer list returned to `/api/jobs/offer-loop`:

```typescript
// Offer loop endpoint (unchanged)
const eligible = await getEligibleCustomers(slotOpening);
const nextCustomer = eligible[0]; // Now tier-prioritized
```

---

## Future Enhancements (Out of Scope)

- **Tier-aware SMS messaging:** Different message text for top vs risk tier
- **Tier-based offer expiry:** Top tier gets 30 min, risk tier gets 10 min
- **Real-time tier updates:** Recompute score when offer expires (not just nightly)
- **Tier-based offer limits:** Max 3 offers for risk tier per slot
- **Dashboard UI:** Show tier distribution in slot recovery analytics
- **A/B testing:** Test different tier thresholds/priority orders
- **Manual override:** Force offer to specific customer regardless of tier

---

## Notes

### Why Deprioritize Instead of Exclude by Default?

**Inclusivity:** Everyone gets a chance, even if they're last
**Revenue:** Risk tier may still convert (better than no booking)
**Fairness:** Gives customers opportunity to rebuild reliability
**Flexibility:** Shop can enable exclusion if SMS budget is tight

### Why Deterministic (Not Random)?

**Predictability:** Business owners understand who gets offers first
**Debugging:** Easier to trace why customer X got offer before Y
**Fairness:** Same tier = same priority (no luck factor)
**Testing:** Reproducible behavior for E2E tests

### Why NULL Tier = Neutral (Score 50)?

**Safe default:** New customers not penalized
**Consistent:** Aligns with "neutral is default" principle
**Predictable:** Business knows what to expect for first-time customers
**Graceful:** System works even if recompute job hasn't run

---

## Next Steps

After V5 ships:

1. Monitor offer conversion rates by tier (does prioritization help?)
2. Verify SQL query performance in production (check logs)
3. Gather feedback on risk tier handling (exclude vs deprioritize)
4. Check for edge cases in offer sequences (real booking data)
5. Begin V6: Polish & Testing (end-to-end validation, dashboard UI)

---

## Design Principles

### Data-Driven Prioritization

- **Use existing scores:** Leverage V1 scoring logic (no duplication)
- **Policy-controlled:** Shop decides risk tier handling
- **Transparent:** Sorting logic is clear and explainable

### Backward Compatibility

- **LEFT JOIN:** Customers without scores still eligible
- **NULL handling:** Missing data treated as default (neutral)
- **Graceful degradation:** System works even if scoring fails

### Performance-First

- **Indexed joins:** No table scans
- **Pre-computed scores:** No runtime calculation
- **Small result sets:** LIMIT 50 keeps query fast

---

## Troubleshooting

**Issue:** Tier sorting not working (still random order)

**Fix:**
- Check if JOIN to `customer_scores` succeeded
- Verify ORDER BY clause replaces `random()`
- Check SQL query in logs

**Issue:** Risk tier customers excluded when they shouldn't be

**Fix:**
- Check `shop_policies.exclude_risk_from_offers` value
- Verify WHERE clause logic (should only filter when true)

**Issue:** Customers without scores not appearing in results

**Fix:**
- Ensure LEFT JOIN (not INNER JOIN) to `customer_scores`
- Check NULL handling in WHERE clause

**Issue:** Performance regression (slow queries)

**Fix:**
- Verify indexes on `customer_scores (customer_id, shop_id)`
- Check EXPLAIN ANALYZE output
- Consider reducing LIMIT if needed
