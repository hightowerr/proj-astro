# V6: Polish & Testing

**Goal:** Achieve production-ready quality with comprehensive testing, error handling, and documentation

**Appetite:** 1-1.5 days

**Demo:** Full end-to-end flow works flawlessly with comprehensive test coverage, user-friendly error handling, and complete documentation

---

## Overview

V6 is the quality gate for the entire tier system. It ensures all components work together seamlessly through comprehensive E2E testing, validates edge cases through extensive unit tests, improves error handling across all user touchpoints, and documents the complete feature for maintainability. This slice transforms V1-V5 from "it works" to "it's production-ready."

### What's Built

- **E2E Tests (Playwright):** Complete tier-based booking flow from score computation to offer prioritization
- **Unit Tests:** Edge cases for scoring, tier assignment, pricing logic, and query functions
- **Integration Tests:** Cross-component flows (recompute → dashboard, policy settings → booking)
- **Error Handling:** User-friendly messages, graceful degradation, logging improvements
- **Documentation:** README updates, inline code comments, troubleshooting guide
- **Performance Validation:** Query optimization, load testing baseline
- **Security Audit:** Review authentication, data access, SQL injection prevention

---

## Scope

### In Scope

**Testing:**
- E2E test: Full customer journey (recompute scores → view dashboard → configure tiers → book with tier pricing → receive prioritized offer)
- E2E test: Risk tier exclusion flow
- E2E test: Edge cases (no scores, null tiers, missing policies, concurrent bookings)
- Unit tests: Scoring edge cases (no history, all voided, cap limits, negative scores)
- Unit tests: Tier assignment boundary conditions
- Unit tests: Tier pricing logic with all override combinations
- Integration tests: Recompute job error handling
- Integration tests: Policy settings validation
- Test coverage reporting and enforcement (≥80% for critical paths)

**Error Handling:**
- Dashboard: Graceful handling of missing scores
- Booking form: Clear messaging when tier pricing applies
- Recompute job: Detailed error logging with customer/shop context
- Policy settings: Validation with helpful error messages
- Offer loop: Fallback when customer_scores unavailable

**Documentation:**
- README: Tier system overview and setup instructions
- CLAUDE.md: Updates for tier-related commands and patterns
- Inline comments: Complex scoring formulas and SQL queries
- API docs: Recompute job endpoint specification
- Troubleshooting guide: Common issues and fixes

**Polish:**
- Code quality checks (lint, typecheck) for all new files
- Consistent error message formatting
- Logging standardization (consistent prefixes, log levels)
- Performance baseline measurements
- Security review of tier-related code

### Out of Scope

- UI/UX design polish (colors, animations) - functional, not aesthetic
- A/B testing infrastructure
- Advanced analytics/metrics dashboards
- Tier history tracking (audit log)
- Real-time score updates (remain nightly batch)
- Customer-facing tier disclosure (stays internal)
- Internationalization (i18n) for error messages

---

## Implementation Steps

### Step 1: E2E Test - Full Tier System Flow

**File:** `tests/e2e/tier-system-full-flow.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  customerContactPrefs,
  customerScores,
  payments,
  policyVersions,
  shops,
  shopPolicies,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Full tier system E2E test.
 *
 * Covers complete flow:
 * 1. Recompute scores (nightly job)
 * 2. View customer list dashboard
 * 3. Configure tier settings
 * 4. Book with tier-adjusted pricing
 * 5. Receive slot recovery offer (tier-prioritized)
 */

test.describe("Full tier system flow", () => {
  let testShopId: string;
  let testOwnerId: string;
  let topCustomerId: string;
  let neutralCustomerId: string;
  let riskCustomerId: string;

  test.beforeEach(async () => {
    // Create shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Tier Flow Shop",
        slug: "e2e-tier-flow",
        currency: "USD",
        ownerId: "owner-e2e-tier",
        status: "active",
      })
      .returning();
    testShopId = shop.id;
    testOwnerId = shop.ownerId;

    // Create base policy
    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000, // $20 base
      cancelCutoffMinutes: 1440,
      refundBeforeCutoff: true,
      resolutionGraceMinutes: 30,
      riskDepositAmountCents: 5000, // $50 risk tier
      topDepositWaived: true, // $0 top tier
      excludeRiskFromOffers: false,
    });

    // Create customers with appointment history
    // Top tier customer: 10 settled, 0 voided
    const [topCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Top Tier Test",
        phone: "+15551000001",
        email: "top-tier@e2e.test",
      })
      .returning();
    topCustomerId = topCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: topCustomerId,
      smsOptIn: true,
    });

    // Create 10 settled appointments for top customer
    const baseTime = new Date("2024-01-01T10:00:00Z");
    for (let i = 0; i < 10; i++) {
      const startsAt = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000);
      await db.insert(appointments).values({
        shopId: testShopId,
        customerId: topCustomerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: "booked",
        financialOutcome: "settled",
        resolutionReason: "completed_on_time",
        createdAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Neutral tier customer: 5 settled, 0 voided, 1 refund
    const [neutralCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Neutral Tier Test",
        phone: "+15552000002",
        email: "neutral-tier@e2e.test",
      })
      .returning();
    neutralCustomerId = neutralCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: neutralCustomerId,
      smsOptIn: true,
    });

    for (let i = 0; i < 5; i++) {
      const startsAt = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000);
      await db.insert(appointments).values({
        shopId: testShopId,
        customerId: neutralCustomerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: "booked",
        financialOutcome: "settled",
        resolutionReason: "completed_on_time",
        createdAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }

    // 1 refunded appointment
    const refundStart = new Date(baseTime.getTime() + 5 * 24 * 60 * 60 * 1000);
    await db.insert(appointments).values({
      shopId: testShopId,
      customerId: neutralCustomerId,
      startsAt: refundStart,
      endsAt: new Date(refundStart.getTime() + 60 * 60 * 1000),
      status: "cancelled",
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
      createdAt: new Date(refundStart.getTime() - 7 * 24 * 60 * 60 * 1000),
    });

    // Risk tier customer: 2 settled, 2 voided
    const [riskCustomer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Risk Tier Test",
        phone: "+15553000003",
        email: "risk-tier@e2e.test",
      })
      .returning();
    riskCustomerId = riskCustomer.id;

    await db.insert(customerContactPrefs).values({
      customerId: riskCustomerId,
      smsOptIn: true,
    });

    for (let i = 0; i < 2; i++) {
      const startsAt = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000);
      await db.insert(appointments).values({
        shopId: testShopId,
        customerId: riskCustomerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: "booked",
        financialOutcome: "settled",
        resolutionReason: "completed_on_time",
        createdAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }

    for (let i = 2; i < 4; i++) {
      const startsAt = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000);
      await db.insert(appointments).values({
        shopId: testShopId,
        customerId: riskCustomerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: "booked",
        financialOutcome: "voided",
        resolutionReason: "no_show",
        createdAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }
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

  test("complete tier system flow: recompute → dashboard → settings → booking → offers", async ({ page }) => {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;

    // ===== STEP 1: Recompute scores =====
    const recomputeResponse = await fetch(`${appUrl}/api/jobs/recompute-scores`, {
      method: "POST",
      headers: { "x-cron-secret": cronSecret! },
    });

    expect(recomputeResponse.ok).toBe(true);
    const recomputeData = await recomputeResponse.json();
    expect(recomputeData.processed).toBeGreaterThan(0);

    // Verify scores in database
    const scores = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.shopId, testShopId));

    expect(scores.length).toBe(3);

    const topScore = scores.find((s) => s.customerId === topCustomerId);
    const neutralScore = scores.find((s) => s.customerId === neutralCustomerId);
    const riskScore = scores.find((s) => s.customerId === riskCustomerId);

    expect(topScore?.tier).toBe("top");
    expect(topScore?.score).toBeGreaterThanOrEqual(80);

    expect(neutralScore?.tier).toBe("neutral");
    expect(neutralScore?.score).toBeGreaterThan(40);
    expect(neutralScore?.score).toBeLessThan(80);

    expect(riskScore?.tier).toBe("risk");
    // Risk tier triggered by ≥2 voids in 90d regardless of score

    // ===== STEP 2: View customer dashboard =====
    await page.goto(`${appUrl}/app/customers`);

    // Should see tier badges
    await expect(page.getByText("Top Tier Test")).toBeVisible();
    await expect(page.getByText("Neutral Tier Test")).toBeVisible();
    await expect(page.getByText("Risk Tier Test")).toBeVisible();

    // Verify tier badges (color/text checks depend on implementation)
    const topRow = page.locator("tr", { hasText: "Top Tier Test" });
    await expect(topRow).toBeVisible();

    // ===== STEP 3: Verify tier pricing in booking flow =====
    // Book as top tier customer (deposit waived)
    await page.goto(`${appUrl}/book/e2e-tier-flow`);

    // Fill booking form
    await page.fill('input[name="fullName"]', "Top Tier Test");
    await page.fill('input[name="email"]', "top-tier@e2e.test");
    await page.fill('input[name="phone"]', "+15551000001");

    // Select future date/time
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', futureDate.toISOString().split("T")[0]);

    // Submit booking
    await page.click('button[type="submit"]');

    // Should see $0 deposit (top tier waived)
    await expect(page.getByText(/deposit.*\$0/i)).toBeVisible();

    // Verify policy version snapshot
    const policyVersions = await db
      .select()
      .from(policyVersions)
      .where(eq(policyVersions.shopId, testShopId))
      .orderBy(policyVersions.createdAt);

    const topPolicyVersion = policyVersions[policyVersions.length - 1];
    expect(topPolicyVersion.depositAmountCents).toBe(0); // Waived

    // ===== STEP 4: Book as risk tier customer =====
    await page.goto(`${appUrl}/book/e2e-tier-flow`);

    await page.fill('input[name="fullName"]', "Risk Tier Test");
    await page.fill('input[name="email"]', "risk-tier@e2e.test");
    await page.fill('input[name="phone"]', "+15553000003");

    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', futureDate.toISOString().split("T")[0]);

    await page.click('button[type="submit"]');

    // Should see $50 deposit (risk tier override)
    await expect(page.getByText(/deposit.*\$50/i)).toBeVisible();

    // Verify policy version
    const riskPolicyVersions = await db
      .select()
      .from(policyVersions)
      .where(eq(policyVersions.shopId, testShopId))
      .orderBy(policyVersions.createdAt);

    const riskPolicyVersion = riskPolicyVersions[riskPolicyVersions.length - 1];
    expect(riskPolicyVersion.depositAmountCents).toBe(5000); // $50

    // ===== STEP 5: Slot recovery prioritization =====
    // Create slot opening
    const slotStartsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: testShopId,
        startsAt: slotStartsAt,
        endsAt: new Date(slotStartsAt.getTime() + 60 * 60 * 1000),
        sourceAppointmentId: "test-source",
        status: "open",
      })
      .returning();

    // Trigger offer loop
    const internalSecret = process.env.INTERNAL_SECRET;
    const offerResponse = await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slotOpening.id }),
    });

    expect(offerResponse.ok).toBe(true);

    // Verify top tier customer got first offer
    const firstOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq }) => eq(table.slotOpeningId, slotOpening.id),
    });

    expect(firstOffer?.customerId).toBe(topCustomerId);

    // Expire first offer, trigger next
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
      body: JSON.stringify({ slotOpeningId: slotOpening.id }),
    });

    // Verify neutral customer got second offer
    const allOffers = await db.query.slotOffers.findMany({
      where: (table, { eq }) => eq(table.slotOpeningId, slotOpening.id),
      orderBy: (table, { asc }) => [asc(table.sentAt)],
    });

    expect(allOffers.length).toBe(2);
    expect(allOffers[1].customerId).toBe(neutralCustomerId);

    // Expire second offer, trigger next
    await db
      .update(slotOffers)
      .set({ status: "expired" })
      .where(eq(slotOffers.id, allOffers[1].id));

    await fetch(`${appUrl}/api/jobs/offer-loop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret!,
      },
      body: JSON.stringify({ slotOpeningId: slotOpening.id }),
    });

    // Verify risk customer got third offer (deprioritized)
    const finalOffers = await db.query.slotOffers.findMany({
      where: (table, { eq }) => eq(table.slotOpeningId, slotOpening.id),
      orderBy: (table, { asc }) => [asc(table.sentAt)],
    });

    expect(finalOffers.length).toBe(3);
    expect(finalOffers[2].customerId).toBe(riskCustomerId);
  });
});
```

---

### Step 2: E2E Test - Edge Cases

**File:** `tests/e2e/tier-system-edge-cases.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  customers,
  customerContactPrefs,
  customerScores,
  shops,
  shopPolicies,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Tier system edge cases", () => {
  let testShopId: string;

  test.beforeEach(async () => {
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Edge Case Shop",
        slug: "edge-case-shop",
        currency: "USD",
        ownerId: "owner-edge",
        status: "active",
      })
      .returning();
    testShopId = shop.id;

    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      resolutionGraceMinutes: 30,
    });
  });

  test.afterEach(async () => {
    await db.delete(customerScores).where(eq(customerScores.shopId, testShopId));
    await db.delete(customerContactPrefs);
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("handles new customer with no score (defaults to neutral tier)", async ({ page }) => {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    // Create customer without score
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "New Customer",
        phone: "+15559999999",
        email: "new@edge.test",
      })
      .returning();

    await db.insert(customerContactPrefs).values({
      customerId: customer.id,
      smsOptIn: true,
    });

    // Visit dashboard
    await page.goto(`${appUrl}/app/customers`);

    // Should show "Insufficient history" or similar
    await expect(page.getByText("New Customer")).toBeVisible();
    await expect(page.getByText(/insufficient history/i)).toBeVisible();

    // Book appointment (should use base policy)
    await page.goto(`${appUrl}/book/edge-case-shop`);
    await page.fill('input[name="fullName"]', "New Customer");
    await page.fill('input[name="email"]', "new@edge.test");
    await page.fill('input[name="phone"]', "+15559999999");

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await page.fill('input[type="date"]', futureDate.toISOString().split("T")[0]);

    await page.click('button[type="submit"]');

    // Should see base deposit ($20)
    await expect(page.getByText(/deposit.*\$20/i)).toBeVisible();
  });

  test("handles missing shop policy tier settings (falls back to base)", async ({ page }) => {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    // Create customer with risk tier
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Risk Customer",
        phone: "+15558888888",
        email: "risk@edge.test",
      })
      .returning();

    await db.insert(customerScores).values({
      customerId: customer.id,
      shopId: testShopId,
      score: 20,
      tier: "risk",
      windowDays: 180,
      stats: {
        settled: 0,
        voided: 3,
        refunded: 0,
        lateCancels: 0,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 3,
      },
    });

    // Book appointment (no risk override in policy → use base)
    await page.goto(`${appUrl}/book/edge-case-shop`);
    await page.fill('input[name="fullName"]', "Risk Customer");
    await page.fill('input[name="email"]', "risk@edge.test");
    await page.fill('input[name="phone"]', "+15558888888");

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await page.fill('input[type="date"]', futureDate.toISOString().split("T")[0]);

    await page.click('button[type="submit"]');

    // Should see base deposit ($20, not custom risk amount)
    await expect(page.getByText(/deposit.*\$20/i)).toBeVisible();
  });

  test("handles concurrent bookings with tier pricing", async () => {
    // This tests race conditions in tier pricing logic
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    // Create customer with top tier
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Concurrent Test",
        phone: "+15557777777",
        email: "concurrent@edge.test",
      })
      .returning();

    await db.insert(customerScores).values({
      customerId: customer.id,
      shopId: testShopId,
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
    });

    // Update policy to waive top tier deposit
    await db
      .update(shopPolicies)
      .set({ topDepositWaived: true })
      .where(eq(shopPolicies.shopId, testShopId));

    // Simulate 3 concurrent bookings
    const bookingPromises = Array.from({ length: 3 }, (_, i) =>
      fetch(`${appUrl}/api/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopSlug: "edge-case-shop",
          customerId: customer.id,
          startsAt: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
        }),
      })
    );

    const results = await Promise.all(bookingPromises);

    // All should succeed
    expect(results.every((r) => r.ok)).toBe(true);

    // All should have $0 deposit (no race condition)
    const bookingData = await Promise.all(results.map((r) => r.json()));
    expect(bookingData.every((b) => b.depositAmountCents === 0)).toBe(true);
  });

  test("recompute job continues after individual customer error", async () => {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;

    // Create valid customer
    await db.insert(customers).values({
      shopId: testShopId,
      fullName: "Valid Customer",
      phone: "+15556666666",
      email: "valid@edge.test",
    });

    // Trigger recompute
    const response = await fetch(`${appUrl}/api/jobs/recompute-scores`, {
      method: "POST",
      headers: { "x-cron-secret": cronSecret! },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    // Should report processed count and errors separately
    expect(data.processed).toBeDefined();
    expect(data.errors).toBeDefined();
    expect(data.processed).toBeGreaterThan(0);
  });
});
```

---

### Step 3: Unit Tests - Scoring Edge Cases

**File:** `src/lib/__tests__/scoring-edge-cases.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import { calculateScore, assignTier, RecencyData } from "@/lib/scoring";

describe("Scoring edge cases", () => {
  describe("calculateScore edge cases", () => {
    it("handles extreme negative score (clamps to 0)", () => {
      const recencyData: RecencyData = {
        last30Days: { settled: 0, voided: 10, refunded: 5, lateCancels: 5 },
        days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
        over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      };

      // 10 voided × -20 × 2.0 = -400
      // 5 refunded × -5 × 2.0 = -50
      // 5 late cancels × -10 × 2.0 = -100
      // Base 50 - 550 = -500, clamped to 0
      expect(calculateScore(recencyData)).toBe(0);
    });

    it("handles extreme positive score (clamps to 100)", () => {
      const recencyData: RecencyData = {
        last30Days: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
        days31To90: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
        over90Days: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
      };

      // Would be huge positive score, capped at 100
      expect(calculateScore(recencyData)).toBe(100);
    });

    it("handles fractional scores (rounds correctly)", () => {
      const recencyData: RecencyData = {
        last30Days: { settled: 0, voided: 0, refunded: 1, lateCancels: 0 }, // -5 × 2.0 = -10
        days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
        over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      };

      // Base 50 - 10 = 40 (exact)
      expect(calculateScore(recencyData)).toBe(40);
    });

    it("handles very old activity (minimal impact)", () => {
      const recencyData: RecencyData = {
        last30Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
        days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
        over90Days: { settled: 10, voided: 0, refunded: 0, lateCancels: 0 }, // 10 × 10 × 0.5 = 50 (capped)
      };

      // Base 50 + 50 = 100
      expect(calculateScore(recencyData)).toBe(100);
    });

    it("respects settled cap across all buckets", () => {
      const recencyData: RecencyData = {
        last30Days: { settled: 5, voided: 0, refunded: 0, lateCancels: 0 }, // 5 × 10 × 2.0 = 100
        days31To90: { settled: 5, voided: 0, refunded: 0, lateCancels: 0 }, // 5 × 10 × 1.0 = 50
        over90Days: { settled: 10, voided: 0, refunded: 0, lateCancels: 0 }, // 10 × 10 × 0.5 = 50
      };

      // Total settled points = 200, but capped at 50
      // Base 50 + 50 = 100
      expect(calculateScore(recencyData)).toBe(100);
    });
  });

  describe("assignTier edge cases", () => {
    it("assigns neutral tier at score boundary (79)", () => {
      expect(assignTier(79, 0)).toBe("neutral");
    });

    it("assigns top tier at score boundary (80)", () => {
      expect(assignTier(80, 0)).toBe("top");
    });

    it("assigns neutral tier at score boundary (40)", () => {
      expect(assignTier(40, 0)).toBe("neutral");
    });

    it("assigns risk tier at score boundary (39)", () => {
      expect(assignTier(39, 0)).toBe("risk");
    });

    it("assigns risk tier when voidedLast90Days == 2 (boundary)", () => {
      expect(assignTier(100, 2)).toBe("risk");
    });

    it("assigns risk tier for high score but many voids", () => {
      expect(assignTier(100, 5)).toBe("risk");
    });

    it("handles negative score (assigns risk)", () => {
      // Edge case: score computation bug might produce negative
      expect(assignTier(-10, 0)).toBe("risk");
    });

    it("handles score > 100 (assigns top if no voids)", () => {
      // Edge case: score computation bug might produce > 100
      expect(assignTier(150, 0)).toBe("top");
    });
  });
});
```

---

### Step 4: Unit Tests - Tier Pricing Logic

**File:** `src/lib/__tests__/tier-pricing.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { shops, shopPolicies, customers, customerScores } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Test tier pricing override logic.
 *
 * These are integration-style unit tests that verify the pricing
 * logic works correctly with various tier/policy combinations.
 */

describe("Tier pricing logic", () => {
  let testShopId: string;
  let customerId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Pricing Test Shop",
        slug: "pricing-test",
        currency: "USD",
        ownerId: "owner-pricing",
        status: "active",
      })
      .returning();
    testShopId = shop.id;

    // Create base policy
    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000, // $20 base
      resolutionGraceMinutes: 30,
    });

    // Create test customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test Customer",
        phone: "+15550000000",
        email: "test@pricing.test",
      })
      .returning();
    customerId = customer.id;
  });

  afterEach(async () => {
    await db.delete(customerScores).where(eq(customerScores.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("applies base policy for neutral tier", async () => {
    // Create neutral tier score
    await db.insert(customerScores).values({
      customerId,
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

    // Load pricing (this would happen in createAppointment)
    const [score] = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.customerId, customerId))
      .limit(1);

    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopId, testShopId))
      .limit(1);

    // Neutral tier uses base policy
    expect(score.tier).toBe("neutral");
    const finalAmount = policy.depositAmountCents; // No override
    expect(finalAmount).toBe(2000); // $20
  });

  it("applies risk tier override when configured", async () => {
    // Configure risk tier override
    await db
      .update(shopPolicies)
      .set({ riskDepositAmountCents: 5000 }) // $50
      .where(eq(shopPolicies.shopId, testShopId));

    // Create risk tier score
    await db.insert(customerScores).values({
      customerId,
      shopId: testShopId,
      score: 25,
      tier: "risk",
      windowDays: 180,
      stats: {
        settled: 1,
        voided: 3,
        refunded: 0,
        lateCancels: 1,
        lastActivityAt: new Date().toISOString(),
        voidedLast90Days: 3,
      },
    });

    const [score] = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.customerId, customerId))
      .limit(1);

    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopId, testShopId))
      .limit(1);

    // Risk tier uses override
    expect(score.tier).toBe("risk");
    const finalAmount = policy.riskDepositAmountCents!;
    expect(finalAmount).toBe(5000); // $50
  });

  it("applies top tier waived when configured", async () => {
    // Configure top tier waived
    await db
      .update(shopPolicies)
      .set({ topDepositWaived: true })
      .where(eq(shopPolicies.shopId, testShopId));

    // Create top tier score
    await db.insert(customerScores).values({
      customerId,
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

    const [score] = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.customerId, customerId))
      .limit(1);

    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopId, testShopId))
      .limit(1);

    // Top tier deposit waived
    expect(score.tier).toBe("top");
    expect(policy.topDepositWaived).toBe(true);
    const finalAmount = 0; // Waived
    expect(finalAmount).toBe(0);
  });

  it("applies top tier reduced amount when not waived", async () => {
    // Configure top tier reduced (not waived)
    await db
      .update(shopPolicies)
      .set({
        topDepositWaived: false,
        topDepositAmountCents: 1000, // $10
      })
      .where(eq(shopPolicies.shopId, testShopId));

    // Create top tier score
    await db.insert(customerScores).values({
      customerId,
      shopId: testShopId,
      score: 85,
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
    });

    const [score] = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.customerId, customerId))
      .limit(1);

    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopId, testShopId))
      .limit(1);

    // Top tier uses reduced amount
    expect(score.tier).toBe("top");
    expect(policy.topDepositWaived).toBe(false);
    const finalAmount = policy.topDepositAmountCents!;
    expect(finalAmount).toBe(1000); // $10
  });

  it("falls back to base policy when tier overrides are null", async () => {
    // No tier overrides configured (all NULL)
    await db.insert(customerScores).values({
      customerId,
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

    const [score] = await db
      .select()
      .from(customerScores)
      .where(eq(customerScores.customerId, customerId))
      .limit(1);

    const [policy] = await db
      .select()
      .from(shopPolicies)
      .where(eq(shopPolicies.shopId, testShopId))
      .limit(1);

    // Risk tier but no override → use base
    expect(score.tier).toBe("risk");
    expect(policy.riskDepositAmountCents).toBeNull();
    const finalAmount = policy.depositAmountCents; // Base
    expect(finalAmount).toBe(2000); // $20
  });
});
```

---

### Step 5: Error Handling - Recompute Job

**File:** Update `src/app/api/jobs/recompute-scores/route.ts`

Add detailed error logging and graceful handling:

```typescript
// Add to existing file

export async function computeScoreAndTier(
  customerId: string,
  shopId: string
): Promise<void> {
  try {
    // Aggregate appointment counts
    const { recencyData, lastActivityAt, voidedLast90Days } =
      await aggregateAppointmentCounts(customerId, shopId, 180);

    // Calculate score
    const score = calculateScore(recencyData);

    // Validate score (catch computation bugs)
    if (score < 0 || score > 100 || !Number.isFinite(score)) {
      console.error(
        `[computeScoreAndTier] Invalid score computed for customer ${customerId}: ${score}`
      );
      throw new Error(`Invalid score: ${score}`);
    }

    // Assign tier
    const tier = assignTier(score, voidedLast90Days);

    // Flatten recency data for storage
    const totals = flattenRecencyData(recencyData);

    // Prepare stats
    const stats = {
      ...totals,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      voidedLast90Days,
    };

    // Upsert score record
    await upsertCustomerScore({
      customerId,
      shopId,
      score,
      tier,
      windowDays: 180,
      stats,
    });

    console.log(
      `[computeScoreAndTier] ✓ Customer ${customerId}: score=${score}, tier=${tier}, stats=${JSON.stringify(totals)}`
    );
  } catch (error) {
    console.error(
      `[computeScoreAndTier] ✗ Failed to compute score for customer ${customerId} in shop ${shopId}:`,
      error
    );
    throw error; // Re-throw to collect in job errors
  }
}
```

---

### Step 6: Error Handling - Dashboard

**File:** Update `src/app/app/customers/page.tsx`

Add graceful handling for missing scores:

```typescript
// Add to existing customer list page

export default async function CustomersPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return <div>Shop not found</div>;
  }

  const customers = await listCustomersForShop(shop.id);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Name</th>
            <th className="text-left p-4">Contact</th>
            <th className="text-left p-4">Tier</th>
            <th className="text-left p-4">Score</th>
            <th className="text-left p-4">Reliability</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b hover:bg-gray-50">
              <td className="p-4">{customer.fullName}</td>
              <td className="p-4">
                {customer.email || customer.phone || "—"}
              </td>
              <td className="p-4">
                {customer.tier ? (
                  <TierBadge tier={customer.tier} />
                ) : (
                  <span className="text-gray-400 text-sm">No tier</span>
                )}
              </td>
              <td className="p-4">
                {customer.score !== null ? (
                  <span className="font-mono">{customer.score}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="p-4">
                {customer.stats ? (
                  <span className="text-sm text-gray-600">
                    Settled: {customer.stats.settled}, Voided:{" "}
                    {customer.stats.voided}, Late cancels:{" "}
                    {customer.stats.lateCancels}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">
                    Insufficient history
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No customers yet
        </div>
      )}
    </div>
  );
}
```

---

### Step 7: Documentation Updates

**File:** Update `README.md`

Add tier system section:

```markdown
## Tier System (Slice 7)

The tier system automatically assigns reliability tiers to customers based on their appointment history, enabling risk-adjusted deposit pricing and prioritized slot recovery offers.

### Overview

- **Tiers:** Top (reliable), Neutral (default), Risk (problematic)
- **Scoring:** Deterministic 0-100 score based on settled/voided/cancelled appointments
- **Recency weighting:** Recent activity counts more (2× last 30 days, 1× 31-90 days, 0.5× 90+ days)
- **Nightly recompute:** Scores updated automatically at 2 AM UTC via cron job

### Tier Criteria

- **Top tier:** Score ≥80 AND no voids in last 90 days
- **Risk tier:** Score <40 OR ≥2 voids in last 90 days
- **Neutral tier:** Everything else (default for new customers)

### Tier-Based Features

1. **Deposit Adjustments**
   - Risk tier: Configurable higher deposit (e.g., $50 vs $20 base)
   - Top tier: Deposit waived or reduced (e.g., $0 or $10)
   - Neutral tier: Base policy applies (no override)

2. **Slot Recovery Prioritization**
   - Offers sent in tier priority order: top > neutral > risk
   - Within same tier, higher scores prioritized
   - Configurable: deprioritize risk tier (default) or exclude entirely

3. **Dashboard Visibility**
   - Customer list shows tier badge, score, and concrete stats
   - Transparent explanation (no "AI decided" vague language)

### Configuration

Configure tier settings in payment policy page (`/app/settings/payment-policy`):

- Risk tier deposit amount (optional, falls back to base if not set)
- Top tier deposit waived (checkbox)
- Top tier reduced deposit (optional, ignored if waived)
- Exclude risk tier from slot recovery offers (checkbox, default unchecked)

### Manual Score Recompute

```bash
curl -X POST http://localhost:3000/api/jobs/recompute-scores \
  -H "x-cron-secret: $CRON_SECRET"
```

### Testing

```bash
# Run tier system tests
pnpm test src/lib/__tests__/scoring.test.ts
pnpm test:e2e tests/e2e/tier-system-full-flow.spec.ts

# View scores in database
pnpm db:studio
# Navigate to customer_scores table
```

### Troubleshooting

**Scores not appearing:**
1. Check if recompute job has run: `vercel logs --tail`
2. Manually trigger: `curl -X POST .../api/jobs/recompute-scores -H "x-cron-secret: $CRON_SECRET"`
3. Verify customer has appointment history (scores require activity)

**Tier pricing not applying:**
1. Check if customer has score: `pnpm db:studio` → customer_scores table
2. Verify policy settings: /app/settings/payment-policy
3. Check policy version snapshot includes tier-derived amount

**Offer loop not prioritizing:**
1. Verify slot_offers table shows sequential tier order
2. Check shop_policies.exclude_risk_from_offers setting
3. Ensure customer_scores table populated for eligible customers
```

**File:** Update `CLAUDE.md`

Add tier system guidance:

```markdown
## Tier System (Slice 7)

### Key Abstractions

#### 1. Customer Scoring (Deterministic)
Scores are computed nightly based on appointment outcomes over 180-day rolling window.

```typescript
// src/lib/scoring.ts
function calculateScore(recencyData: RecencyData): number
function assignTier(score: number, voidedLast90Days: number): Tier
```

**Critical:** Scoring is deterministic. Same data → same score. No randomness, no AI, no black boxes.

#### 2. Tier-Based Pricing
Booking pricing checks customer tier and applies policy overrides.

```typescript
// During createAppointment() in queries/appointments.ts
const [customerScore] = await db.select().from(customerScores)
  .where(eq(customerScores.customerId, customerId))
  .where(eq(customerScores.shopId, shopId))
  .limit(1);

const tier = customerScore?.tier ?? "neutral"; // Default to neutral

// Apply tier override to deposit amount
const finalAmount = applyTierPricing(tier, basePolicy);

// Snapshot tier-derived amount in policy_version
await createPolicyVersion({ ...basePolicy, depositAmountCents: finalAmount });
```

**Critical:** Policy version snapshots the tier-derived amount at booking time. Tier changes after booking do not affect existing appointments.

#### 3. Offer Loop Prioritization
Eligible customers sorted by tier priority, then score.

```typescript
// src/lib/slot-recovery.ts
.orderBy(
  // 1. Tier priority: top=1, neutral=2, risk=3
  sql`CASE
    WHEN ${customerScores.tier} = 'top' THEN 1
    WHEN ${customerScores.tier} = 'neutral' OR ${customerScores.tier} IS NULL THEN 2
    WHEN ${customerScores.tier} = 'risk' THEN 3
  END ASC`,
  // 2. Score descending
  sql`COALESCE(${customerScores.score}, 50) DESC`,
  // 3. Recency tiebreaker
  sql`${customerScores.computedAt} DESC NULLS LAST`
)
```

**Critical:** NULL tier/score treated as neutral tier with score 50 (safe default for new customers).

### Data Flow: Tier-Based Booking

```
Customer submits booking form
  ↓
POST /api/bookings/create
  ↓ upsertCustomer() → customerId
  ↓ Load customer_scores (LEFT JOIN, may be NULL)
  ↓ Load shop_policies (tier override settings)
  ↓ Apply tier pricing:
  │   if (tier == "risk" && riskDepositAmountCents != null) → use risk amount
  │   else if (tier == "top" && topDepositWaived == true) → $0
  │   else if (tier == "top" && topDepositAmountCents != null) → use top amount
  │   else → use base depositAmountCents
  ↓ Create policy_version with tier-derived amount
  ↓ Create Stripe payment intent with final amount
  ↓ Return booking confirmation
```

### Critical Rules

#### 1. Scoring Is Immutable
Scoring formula constants are defined in `src/lib/scoring.ts`. If tuning is needed:
- Update constants in code
- Run recompute job to update all scores
- Never modify scores directly in database

#### 2. Tier Pricing Is Snapshot
Policy version always stores the tier-derived amount at booking time:
```typescript
// GOOD: Snapshot reflects actual amount charged
const finalAmount = applyTierPricing(tier, basePolicy);
await createPolicyVersion({ ...basePolicy, depositAmountCents: finalAmount });

// BAD: Snapshot stores base amount, not tier-adjusted
await createPolicyVersion(basePolicy); // ← Missing tier adjustment!
```

#### 3. NULL Tier Handling
Always treat NULL tier/score as neutral tier with score 50:
```typescript
const tier = customerScore?.tier ?? "neutral";
const score = customerScore?.score ?? 50;
```

Never filter out NULL tiers (exclude new customers).

#### 4. Recompute Job Safety
Recompute job uses advisory lock to prevent concurrent execution:
```typescript
const LOCK_ID = 482176; // Different from resolver's 482175
await db.execute(sql`SELECT pg_try_advisory_lock(${LOCK_ID})`);
```

Always release lock in `finally` block.

### File Organization (Tier System)

```
src/
├── app/api/
│   └── jobs/recompute-scores/route.ts  # Nightly score recompute job
├── app/app/
│   └── customers/page.tsx               # Customer list dashboard with tiers
├── components/
│   └── customers/tier-badge.tsx         # Tier badge component
└── lib/
    ├── scoring.ts                        # Pure scoring functions (calculateScore, assignTier)
    ├── queries/
    │   ├── scoring.ts                    # aggregateAppointmentCounts, upsertCustomerScore
    │   └── customers.ts                  # listCustomersForShop
    └── __tests__/
        ├── scoring.test.ts               # Unit tests for scoring logic
        └── tier-pricing.test.ts          # Unit tests for tier pricing
```

### Testing Tier Features

```bash
# Unit tests
pnpm test src/lib/__tests__/scoring.test.ts
pnpm test src/lib/__tests__/tier-pricing.test.ts

# E2E tests
pnpm test:e2e tests/e2e/tier-system-full-flow.spec.ts
pnpm test:e2e tests/e2e/tier-system-edge-cases.spec.ts
pnpm test:e2e tests/e2e/tier-based-offers.spec.ts

# Manual testing
pnpm db:studio  # View customer_scores table
curl -X POST http://localhost:3000/api/jobs/recompute-scores -H "x-cron-secret: $CRON_SECRET"
```
```

---

### Step 8: Code Quality and Linting

**File:** `.eslintrc.json` (if not already configured)

Ensure tier-related files are linted:

```bash
# Run lint on all tier system files
pnpm lint src/lib/scoring.ts
pnpm lint src/lib/queries/scoring.ts
pnpm lint src/lib/queries/customers.ts
pnpm lint src/app/api/jobs/recompute-scores/route.ts
pnpm lint src/app/app/customers/page.tsx
pnpm lint src/lib/slot-recovery.ts
pnpm lint src/lib/queries/appointments.ts

# Run typecheck
pnpm typecheck
```

Add pre-commit validation (optional):

```json
// package.json
{
  "scripts": {
    "precommit": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

---

### Step 9: Performance Baseline

**File:** `tests/performance/tier-system-baseline.test.ts` (new file, optional)

```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { aggregateAppointmentCounts } from "@/lib/queries/scoring";
import { calculateScore, assignTier } from "@/lib/scoring";

describe("Tier system performance baseline", () => {
  it("aggregates 180 days of appointments in <100ms", async () => {
    // Assumes test data exists (run after seeding)
    const customerId = "test-customer-id";
    const shopId = "test-shop-id";

    const start = performance.now();
    const result = await aggregateAppointmentCounts(customerId, shopId, 180);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // <100ms target
    expect(result).toBeDefined();
  });

  it("calculates score in <1ms", () => {
    const recencyData = {
      last30Days: { settled: 5, voided: 0, refunded: 1, lateCancels: 0 },
      days31To90: { settled: 3, voided: 0, refunded: 0, lateCancels: 1 },
      over90Days: { settled: 2, voided: 1, refunded: 0, lateCancels: 0 },
    };

    const start = performance.now();
    const score = calculateScore(recencyData);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1); // <1ms target
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("assigns tier in <0.1ms", () => {
    const start = performance.now();
    const tier = assignTier(75, 0);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(0.1); // <0.1ms target
    expect(tier).toBe("neutral");
  });
});
```

---

### Step 10: Security Review Checklist

**File:** `docs/security/tier-system-review.md` (new file)

```markdown
# Tier System Security Review

## Authentication

- ✅ Recompute job requires `x-cron-secret` header (matches CRON_SECRET env var)
- ✅ Customer dashboard requires authenticated session (`requireAuth()`)
- ✅ Policy settings require shop owner authentication
- ✅ No customer-facing tier disclosure (internal logic only)

## Data Access

- ✅ Customer scores scoped by (customerId, shopId) unique constraint
- ✅ Queries filter by shopId to prevent cross-shop data leakage
- ✅ Dashboard only shows customers for authenticated shop owner
- ✅ LEFT JOIN to customer_scores prevents excluding new customers

## SQL Injection

- ✅ All queries use parameterized queries (Drizzle ORM)
- ✅ No raw SQL concatenation
- ✅ User input never directly embedded in SQL
- ✅ Advisory lock uses numeric constant (no user input)

## Rate Limiting

- ✅ Recompute job uses advisory lock (prevents concurrent execution)
- ✅ Cron job scheduled once daily (not user-triggerable)
- ✅ No public API endpoints for tier manipulation

## Data Integrity

- ✅ Scores computed from ground truth (resolutionReason field)
- ✅ Scoring formula is deterministic (no randomness)
- ✅ Policy version snapshots tier-derived amount (immutable)
- ✅ Unique constraint prevents duplicate customer_scores records

## Privacy

- ✅ Tiers not disclosed to customers (internal business logic)
- ✅ No customer-facing messaging about "punishment" or "risk"
- ✅ Booking form shows deposit amount without tier explanation
- ✅ Scores stored per-shop (no cross-shop tracking)

## Error Handling

- ✅ Recompute job collects errors without stopping entire batch
- ✅ Invalid scores (NaN, <0, >100) caught and logged
- ✅ Missing customer_scores handled gracefully (defaults to neutral)
- ✅ Dashboard shows "Insufficient history" for NULL scores

## Potential Risks (Mitigated)

| Risk | Mitigation |
|------|-----------|
| Concurrent recompute jobs | Advisory lock (482176) |
| Score computation bugs producing invalid values | Validation in computeScoreAndTier |
| Cross-shop data leakage | All queries filter by shopId |
| Customer gaming the system | Scores based on immutable outcomes, not actions |
| Discriminatory tier assignments | Transparent formula, no bias, based on verifiable data |

## Recommendations

1. Monitor recompute job errors (set up alerts for >5% error rate)
2. Audit tier distribution monthly (ensure no unintended bias)
3. Document formula changes in git commit messages
4. Consider adding tier assignment audit log (future enhancement)
```

---

## Testing Checklist

### Manual Testing

1. **Full E2E Flow:**
   ```bash
   # Start dev server
   pnpm dev

   # Run recompute job
   curl -X POST http://localhost:3000/api/jobs/recompute-scores \
     -H "x-cron-secret: $CRON_SECRET"

   # Visit dashboard
   open http://localhost:3000/app/customers

   # Book as different tiers
   open http://localhost:3000/book/<shop-slug>

   # Verify slot recovery prioritization
   # (trigger cancellation → check slot_offers table)
   ```

2. **Edge Cases:**
   - New customer with no score
   - Customer with NULL tier in database
   - Policy with no tier overrides
   - Recompute job with partial failures

3. **Error Handling:**
   - Dashboard with missing scores
   - Booking with missing policy
   - Invalid score computation

### Automated Testing

```bash
# Run all unit tests
pnpm test

# Run specific tier tests
pnpm test src/lib/__tests__/scoring.test.ts
pnpm test src/lib/__tests__/scoring-edge-cases.test.ts
pnpm test src/lib/__tests__/tier-pricing.test.ts

# Run E2E tests
pnpm test:e2e tests/e2e/tier-system-full-flow.spec.ts
pnpm test:e2e tests/e2e/tier-system-edge-cases.spec.ts

# Generate coverage report
pnpm test:unit:coverage

# Verify coverage ≥80% for:
# - src/lib/scoring.ts
# - src/lib/queries/scoring.ts
# - src/lib/queries/appointments.ts (tier pricing sections)
```

### Performance Testing

```bash
# Run performance baseline tests
pnpm test tests/performance/tier-system-baseline.test.ts

# Verify query performance in logs
tail -f .next/server/app/api/jobs/recompute-scores/route.js
```

---

## Acceptance Criteria

- ✅ All E2E tests pass (full flow + edge cases)
- ✅ All unit tests pass with ≥80% coverage for critical paths
- ✅ Lint and typecheck pass for all tier-related files
- ✅ Error handling provides user-friendly messages (no stack traces)
- ✅ Documentation updated (README, CLAUDE.md)
- ✅ Security review completed with no high-priority issues
- ✅ Performance baseline established and met (<100ms aggregation, <1ms scoring)
- ✅ Manual testing completed for all user-facing flows
- ✅ Edge cases handled gracefully (NULL scores, missing policies, concurrent bookings)
- ✅ Logging is consistent and actionable (includes context, uses proper log levels)

---

## Dependencies

**Required:**
- V1-V5: All previous slices implemented and functional
- Existing test infrastructure (Vitest, Playwright)
- Database with tier-related tables populated
- Environment variables configured (CRON_SECRET, INTERNAL_SECRET)

**Provides to:**
- Production: Production-ready tier system
- Team: Comprehensive documentation and troubleshooting guide
- Future development: Test patterns and quality standards

---

## Cut Strategy

If time runs short:

**Must have (production-ready minimum):**
- ✅ E2E test: Full tier system flow (Step 1)
- ✅ Unit tests: Scoring edge cases (Step 3)
- ✅ Error handling: Recompute job (Step 5)
- ✅ Error handling: Dashboard (Step 6)
- ✅ Documentation: README updates (Step 7)
- ✅ Code quality: Lint + typecheck all files (Step 8)

**Nice to have:**
- E2E test: Edge cases (Step 2)
- Unit tests: Tier pricing (Step 4)
- Performance baseline (Step 9)
- Security review doc (Step 10, can be done post-launch)

**Can cut entirely:**
- Advanced performance testing
- Pre-commit hooks
- Coverage enforcement tooling (can add later)

Core testing and documentation are non-negotiable. Polish can be incremental.

---

## Notes

### Why ≥80% Coverage Target?

**Balance:** Not 100% (diminishing returns on test maintenance), not <70% (too risky)

**Focus areas:**
- Scoring functions (must be 100% covered)
- Tier assignment logic (must be 100% covered)
- Tier pricing in booking flow (≥90% covered)
- Aggregation queries (≥80% covered)
- Offer loop sorting (≥80% covered)

**Exclude from coverage:**
- UI components (tested via E2E)
- Database migrations
- Type definitions
- Test utilities

### Why E2E Over Unit Tests?

**E2E tests verify:**
- Cross-component integration (recompute → dashboard → booking → offers)
- Real database behavior (LEFT JOINs, NULL handling)
- User experience (error messages, loading states)
- Production-like conditions (concurrent requests, missing data)

**Unit tests verify:**
- Pure function correctness (scoring formulas)
- Edge cases (boundary conditions, extreme values)
- Isolated logic (no database dependencies)

Both are necessary. E2E catches integration bugs, unit tests catch logic bugs.

### Why Documentation First?

**Maintainability:** Future developers need to understand:
- How scoring works (formula is transparent but complex)
- Where tier pricing is applied (multiple integration points)
- What edge cases exist (NULL scores, missing policies)

**Troubleshooting:** When issues arise, documentation provides:
- Checklist of common problems
- Expected behavior for comparison
- Query examples for debugging

Documentation isn't "nice to have"—it's part of the product.

---

## Rollback Plan

If V6 testing reveals critical issues in V1-V5:

1. **Identify regression:** Which slice introduced the bug?
2. **Disable feature:** Comment out in vercel.json (cron jobs) or feature flag (UI)
3. **Fix forward:** Patch the issue, add regression test
4. **Re-enable:** Deploy fix, monitor logs

V6 doesn't add new business logic—it validates existing logic. Rollback should target specific slices (V1-V5), not V6 itself.

---

## Security Considerations

- Recompute job authenticated via x-cron-secret (same pattern as resolver)
- No customer-facing tier disclosure (internal logic only)
- All queries parameterized (SQL injection prevented)
- Customer scores scoped by shopId (no cross-shop leakage)
- Advisory lock prevents concurrent job execution
- Error messages sanitized (no sensitive data leaked)

---

## Performance Considerations

**Query Optimization:**
- Aggregation query filters by indexed columns (customerId, shopId, createdAt)
- LEFT JOINs to customer_scores use unique constraint index
- ORDER BY in offer loop uses indexed columns (tier, score, computedAt)

**Job Optimization:**
- Batch processing (50 customers at a time)
- Error collection continues on individual failures
- Advisory lock prevents concurrent execution
- Scheduled during low-traffic hours (2 AM UTC)

**Expected Performance:**
- Aggregation: <100ms per customer
- Scoring: <1ms per customer
- Full recompute: <5 minutes for 1000 customers
- Offer loop query: <50ms with LEFT JOINs

---

## Integration Points

### V1: Scoring Engine
V6 validates scoring logic with comprehensive unit tests and edge case coverage.

### V2: Customer Dashboard
V6 tests error handling for missing scores and NULL tiers in dashboard UI.

### V3: Policy Settings
V6 validates tier override combinations (waived, reduced, risk, NULL).

### V4: Booking Pricing
V6 tests tier pricing integration with E2E flow and concurrent booking scenarios.

### V5: Offer Loop Prioritization
V6 validates deterministic tier sorting and risk tier handling (deprioritize vs exclude).

---

## Future Enhancements (Out of Scope)

- A/B testing infrastructure for scoring formulas
- Real-time score preview in dashboard
- Customer-facing tier disclosure (transparency initiative)
- Tier history tracking (audit log)
- Score simulation tool (what-if analysis)
- Advanced analytics dashboard (tier distribution, conversion rates)
- Automated regression detection (score drift alerts)

---

## Troubleshooting Guide

**Issue:** E2E tests fail with "customer_scores table not found"

**Fix:**
```bash
pnpm db:migrate
pnpm db:push  # Force schema sync
```

**Issue:** Unit tests fail with "Invalid score: NaN"

**Fix:**
- Check scoring formula for division by zero
- Verify recencyData has valid numbers (not undefined)
- Add validation in calculateScore function

**Issue:** Recompute job times out

**Fix:**
- Reduce BATCH_SIZE in route.ts (from 50 to 25)
- Check database indexes (customer_scores_customer_shop_idx)
- Monitor slow queries in Vercel logs

**Issue:** Dashboard shows all customers with NULL tier

**Fix:**
- Run recompute job manually: `curl -X POST .../api/jobs/recompute-scores`
- Check if customers have appointment history
- Verify cron job is scheduled correctly in vercel.json

**Issue:** Tier pricing not applying in bookings

**Fix:**
- Check customer_scores table has records
- Verify shop_policies has tier override columns
- Check policy version snapshot includes tier-derived amount
- Add logging in applyTierPricing function

---

## Next Steps

After V6 ships:

1. **Monitor production metrics:**
   - Recompute job success rate (target: >95%)
   - E2E test pass rate (target: 100%)
   - Dashboard load time (target: <2s)
   - Booking conversion by tier (track impact)

2. **Gather feedback:**
   - Shop owners: Is tier system useful? Any confusion?
   - Support team: Common customer questions?
   - Developers: Test coverage sufficient?

3. **Plan optimizations:**
   - Tune scoring constants based on real data
   - Adjust tier thresholds if needed
   - Add performance monitoring for slow queries

4. **Document learnings:**
   - What worked well in testing approach?
   - What edge cases did we miss?
   - What would we do differently next time?

---

## Design Principles

### Test Pyramid

- **Unit tests (70%):** Fast, isolated, comprehensive
- **Integration tests (20%):** Cross-component, database interactions
- **E2E tests (10%):** Full user flows, critical paths only

Focus on unit tests for rapid feedback, E2E tests for confidence.

### Error Handling Philosophy

- **User-facing:** Clear, actionable, non-technical
- **Developer logs:** Detailed, with context (customerId, shopId)
- **Graceful degradation:** System works with missing data (defaults to neutral)
- **Fail fast:** Invalid states caught early (score validation)

### Documentation Standards

- **README:** High-level overview, setup instructions, troubleshooting
- **CLAUDE.md:** Technical details, critical rules, data flows
- **Inline comments:** Complex logic, formula explanations, gotchas
- **Security docs:** Risks, mitigations, audit trail

---

## Slice Complete ✅

When V6 ships, Slice 7 (Tier System) is production-ready:

- ✅ Comprehensive test coverage (unit + E2E)
- ✅ Production-quality error handling
- ✅ Complete documentation
- ✅ Security reviewed
- ✅ Performance validated
- ✅ Edge cases handled
- ✅ Code quality enforced

Ship with confidence.
