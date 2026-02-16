# V4: Booking Tier Pricing

**Goal:** Apply tier-based deposit adjustments during booking to charge different amounts based on customer reliability

**Appetite:** 1 day

**Demo:** Book appointments as customers with different tiers (top/neutral/risk), see different deposit amounts, verify policy snapshots store tier-derived amounts

---

## Overview

V4 integrates tier-based pricing into the booking flow. When a customer books an appointment, the system loads their reliability score, determines their tier, applies any configured tier overrides from V3 settings, and creates a policy version snapshot with the final amount. This ensures customers are charged the appropriate deposit based on their payment history while maintaining full auditability through immutable policy snapshots.

### What's Built

- Query function: `loadCustomerScore()` in `/lib/queries/scoring.ts`
- Pricing handler: `applyTierPricingOverride()` in `/lib/booking.ts` (or new file)
- Modify: `createAppointment()` in `/lib/queries/appointments.ts` to inject tier logic
- Extend: `policyVersions` table to store tier information (optional, for auditability)
- Unit tests for tier pricing logic
- Integration tests for booking flow with different tiers

---

## Scope

### In Scope

- Load customer score when available (NULL = treat as neutral tier)
- Apply tier overrides to base policy deposit amount
- Risk tier: use `riskDepositAmountCents` if configured
- Top tier: waive deposit or use reduced amount if configured
- Neutral tier: always use base policy (no override)
- Store tier-derived amount in policy version snapshot
- Maintain immutability: tier changes after booking don't affect existing appointments
- Handle edge cases: new customers, missing scores, NULL overrides
- Unit tests for pricing logic
- Integration tests for full booking flow

### Out of Scope

- UI changes to booking form (A7.1 says no changes needed)
- Displaying tier to customer (keep invisible, just show amount)
- Real-time score computation (rely on nightly batch from V1)
- Manual tier override during booking (automatic only)
- Tier-based payment modes (only deposit amounts, mode stays same)
- Historical migration of existing appointments (future only)

---

## Implementation Steps

### Step 1: Add Query to Load Customer Score

**File:** `src/lib/queries/scoring.ts` (extend existing file from V1)

Add function to load customer score by customerId and shopId:

```typescript
import { customerScores } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { Tier } from "@/lib/scoring";

export interface CustomerScore {
  score: number;
  tier: Tier;
  stats: {
    settled: number;
    voided: number;
    refunded: number;
    lateCancels: number;
    lastActivityAt: string | null;
    voidedLast90Days: number;
  };
  computedAt: Date;
}

/**
 * Load customer score and tier for a specific shop.
 *
 * Returns null if customer has no score yet (new customer).
 * Caller should treat null as neutral tier (default behavior).
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID (scores are per-shop)
 * @returns Customer score record or null
 */
export async function loadCustomerScore(
  customerId: string,
  shopId: string
): Promise<CustomerScore | null> {
  const result = await db
    .select({
      score: customerScores.score,
      tier: customerScores.tier,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customerScores)
    .where(
      and(
        eq(customerScores.customerId, customerId),
        eq(customerScores.shopId, shopId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    score: result[0].score,
    tier: result[0].tier,
    stats: result[0].stats as CustomerScore["stats"],
    computedAt: result[0].computedAt,
  };
}

/**
 * Load customer score within a transaction.
 *
 * Same as loadCustomerScore but accepts a transaction object.
 * Used during createAppointment transaction.
 */
export async function loadCustomerScoreTx(
  tx: any, // Drizzle transaction type
  customerId: string,
  shopId: string
): Promise<CustomerScore | null> {
  const result = await tx
    .select({
      score: customerScores.score,
      tier: customerScores.tier,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customerScores)
    .where(
      and(
        eq(customerScores.customerId, customerId),
        eq(customerScores.shopId, shopId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    score: result[0].score,
    tier: result[0].tier,
    stats: result[0].stats as CustomerScore["stats"],
    computedAt: result[0].computedAt,
  };
}
```

---

### Step 2: Create Tier Pricing Override Logic

**File:** `src/lib/tier-pricing.ts` (new file)

Create pure function to apply tier overrides to base policy:

```typescript
import type { Tier } from "@/lib/scoring";

export interface BasePolicy {
  currency: string;
  paymentMode: "deposit" | "full_prepay";
  depositAmountCents: number;
  cancelCutoffMinutes: number;
  refundBeforeCutoff: boolean;
  resolutionGraceMinutes: number;
}

export interface TierOverrides {
  riskPaymentMode: "deposit" | "full_prepay" | null;
  riskDepositAmountCents: number | null;
  topDepositWaived: boolean;
  topDepositAmountCents: number | null;
}

export interface TierPricingResult {
  paymentMode: "deposit" | "full_prepay";
  depositAmountCents: number;
  appliedTier: Tier | "neutral_default"; // Track which tier was applied
  tierOverrideApplied: boolean; // Did we use an override or base policy?
}

/**
 * Apply tier-based pricing overrides to base policy.
 *
 * Logic:
 * 1. Risk tier + riskDepositAmountCents != null → use risk amount
 * 2. Top tier + topDepositWaived = true → set amount to 0
 * 3. Top tier + topDepositAmountCents != null → use top amount
 * 4. Otherwise → use base depositAmountCents (neutral tier or no override)
 *
 * NULL tier (new customer without score) is treated as neutral tier.
 *
 * @param tier - Customer tier (or null for new customers)
 * @param basePolicy - Base policy settings
 * @param tierOverrides - Tier override settings from shop_policies
 * @returns Final payment mode and deposit amount with metadata
 */
export function applyTierPricingOverride(
  tier: Tier | null,
  basePolicy: BasePolicy,
  tierOverrides: TierOverrides
): TierPricingResult {
  // Default: use base policy
  let paymentMode = basePolicy.paymentMode;
  let depositAmountCents = basePolicy.depositAmountCents;
  let appliedTier: Tier | "neutral_default" = tier ?? "neutral_default";
  let tierOverrideApplied = false;

  // Risk tier override
  if (tier === "risk" && tierOverrides.riskDepositAmountCents !== null) {
    depositAmountCents = tierOverrides.riskDepositAmountCents;
    tierOverrideApplied = true;

    // If risk has custom payment mode, use it
    if (tierOverrides.riskPaymentMode !== null) {
      paymentMode = tierOverrides.riskPaymentMode;
    }
  }
  // Top tier - waived
  else if (tier === "top" && tierOverrides.topDepositWaived) {
    depositAmountCents = 0;
    tierOverrideApplied = true;
  }
  // Top tier - reduced amount
  else if (
    tier === "top" &&
    !tierOverrides.topDepositWaived &&
    tierOverrides.topDepositAmountCents !== null
  ) {
    depositAmountCents = tierOverrides.topDepositAmountCents;
    tierOverrideApplied = true;
  }
  // Neutral tier or null tier → use base policy (no override)
  // No action needed, already using base values

  return {
    paymentMode,
    depositAmountCents,
    appliedTier,
    tierOverrideApplied,
  };
}

/**
 * Derive whether payment is required based on amount.
 *
 * Same logic as existing derivePaymentAmount but uses tier-adjusted amount.
 */
export function derivePaymentRequirement(
  paymentMode: "deposit" | "full_prepay",
  depositAmountCents: number
): { paymentRequired: boolean; amountCents: number } {
  if (paymentMode !== "deposit" && paymentMode !== "full_prepay") {
    return { paymentRequired: false, amountCents: 0 };
  }

  const amountCents = depositAmountCents ?? 0;
  if (amountCents <= 0) {
    return { paymentRequired: false, amountCents: 0 };
  }

  return { paymentRequired: true, amountCents };
}
```

---

### Step 3: Extend Policy Versions Schema (Optional)

**File:** `src/lib/schema.ts`

Add tier metadata to policy versions for auditability:

```typescript
export const policyVersions = pgTable("policy_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 3 }).notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  depositAmountCents: integer("deposit_amount_cents").notNull(),
  cancelCutoffMinutes: integer("cancel_cutoff_minutes"),
  refundBeforeCutoff: boolean("refund_before_cutoff"),
  resolutionGraceMinutes: integer("resolution_grace_minutes"),

  // NEW: Tier pricing metadata (optional, for auditability)
  appliedTier: tierEnum("applied_tier"), // Which tier was used (top/neutral/risk or null)
  tierOverrideApplied: boolean("tier_override_applied").default(false), // Was override used?

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL
pnpm db:migrate
```

**Note:** This step is optional. Tier metadata helps with debugging and auditing but isn't strictly required for functionality.

---

### Step 4: Modify createAppointment to Inject Tier Logic

**File:** `src/lib/queries/appointments.ts`

Modify the payment logic section (around line 396-421):

```typescript
// BEFORE (existing code):
if (paymentsEnabled) {
  const policy = await ensureShopPolicy(tx, input.shopId);
  const derived = derivePaymentAmount({
    paymentMode: policy.paymentMode,
    depositAmountCents: policy.depositAmountCents,
  });
  paymentRequired = derived.paymentRequired;
  amountCents = derived.amountCents;
  currency = policy.currency;

  const [createdPolicyVersion] = await tx
    .insert(policyVersions)
    .values({
      shopId: input.shopId,
      currency: policy.currency,
      paymentMode: policy.paymentMode,
      depositAmountCents: policy.depositAmountCents,
    })
    .returning();
  // ...
}

// AFTER (with tier logic):
import { loadCustomerScoreTx } from "@/lib/queries/scoring";
import { applyTierPricingOverride, derivePaymentRequirement } from "@/lib/tier-pricing";

if (paymentsEnabled) {
  const policy = await ensureShopPolicy(tx, input.shopId);

  // NEW: Load customer score (null if new customer)
  const customerScore = await loadCustomerScoreTx(
    tx,
    customer.id,
    input.shopId
  );
  const tier = customerScore?.tier ?? null; // null = treat as neutral tier

  // NEW: Apply tier pricing overrides
  const tierOverrides = {
    riskPaymentMode: policy.riskPaymentMode,
    riskDepositAmountCents: policy.riskDepositAmountCents,
    topDepositWaived: policy.topDepositWaived,
    topDepositAmountCents: policy.topDepositAmountCents,
  };

  const tierPricing = applyTierPricingOverride(
    tier,
    {
      currency: policy.currency,
      paymentMode: policy.paymentMode,
      depositAmountCents: policy.depositAmountCents,
      cancelCutoffMinutes: policy.cancelCutoffMinutes,
      refundBeforeCutoff: policy.refundBeforeCutoff,
      resolutionGraceMinutes: policy.resolutionGraceMinutes,
    },
    tierOverrides
  );

  // Use tier-adjusted values
  const derived = derivePaymentRequirement(
    tierPricing.paymentMode,
    tierPricing.depositAmountCents
  );
  paymentRequired = derived.paymentRequired;
  amountCents = derived.amountCents;
  currency = policy.currency;

  // Create policy version with tier-derived amount
  const [createdPolicyVersion] = await tx
    .insert(policyVersions)
    .values({
      shopId: input.shopId,
      currency: policy.currency,
      paymentMode: tierPricing.paymentMode, // Use tier-adjusted mode
      depositAmountCents: tierPricing.depositAmountCents, // Use tier-adjusted amount
      cancelCutoffMinutes: policy.cancelCutoffMinutes,
      refundBeforeCutoff: policy.refundBeforeCutoff,
      resolutionGraceMinutes: policy.resolutionGraceMinutes,
      // Optional: Store tier metadata
      appliedTier: tierPricing.appliedTier === "neutral_default" ? null : tierPricing.appliedTier,
      tierOverrideApplied: tierPricing.tierOverrideApplied,
    })
    .returning();

  if (!createdPolicyVersion) {
    throw new Error("Failed to create policy version");
  }

  policyVersion = createdPolicyVersion;

  // Log tier pricing for debugging (optional)
  console.log(
    `[createAppointment] Customer ${customer.id} tier=${tier}, override_applied=${tierPricing.tierOverrideApplied}, amount=${tierPricing.depositAmountCents}`
  );
}
```

---

### Step 5: Unit Tests for Tier Pricing Logic

**File:** `src/lib/__tests__/tier-pricing.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import {
  applyTierPricingOverride,
  derivePaymentRequirement,
  type BasePolicy,
  type TierOverrides,
} from "@/lib/tier-pricing";

const basePolicy: BasePolicy = {
  currency: "USD",
  paymentMode: "deposit",
  depositAmountCents: 2000, // $20 base deposit
  cancelCutoffMinutes: 1440,
  refundBeforeCutoff: true,
  resolutionGraceMinutes: 30,
};

const noOverrides: TierOverrides = {
  riskPaymentMode: null,
  riskDepositAmountCents: null,
  topDepositWaived: false,
  topDepositAmountCents: null,
};

describe("applyTierPricingOverride", () => {
  it("uses base policy for neutral tier", () => {
    const result = applyTierPricingOverride("neutral", basePolicy, noOverrides);

    expect(result.depositAmountCents).toBe(2000);
    expect(result.paymentMode).toBe("deposit");
    expect(result.appliedTier).toBe("neutral");
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("uses base policy for null tier (new customer)", () => {
    const result = applyTierPricingOverride(null, basePolicy, noOverrides);

    expect(result.depositAmountCents).toBe(2000);
    expect(result.paymentMode).toBe("deposit");
    expect(result.appliedTier).toBe("neutral_default");
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("applies risk tier override when configured", () => {
    const overrides: TierOverrides = {
      ...noOverrides,
      riskDepositAmountCents: 5000, // $50 risk deposit
    };

    const result = applyTierPricingOverride("risk", basePolicy, overrides);

    expect(result.depositAmountCents).toBe(5000);
    expect(result.appliedTier).toBe("risk");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("uses base policy for risk tier when no override configured", () => {
    const result = applyTierPricingOverride("risk", basePolicy, noOverrides);

    expect(result.depositAmountCents).toBe(2000); // Base policy
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("waives deposit for top tier when configured", () => {
    const overrides: TierOverrides = {
      ...noOverrides,
      topDepositWaived: true,
      topDepositAmountCents: 1000, // Should be ignored when waived
    };

    const result = applyTierPricingOverride("top", basePolicy, overrides);

    expect(result.depositAmountCents).toBe(0); // Waived
    expect(result.appliedTier).toBe("top");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("applies reduced deposit for top tier when not waived", () => {
    const overrides: TierOverrides = {
      ...noOverrides,
      topDepositWaived: false,
      topDepositAmountCents: 1000, // $10 reduced deposit
    };

    const result = applyTierPricingOverride("top", basePolicy, overrides);

    expect(result.depositAmountCents).toBe(1000);
    expect(result.appliedTier).toBe("top");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("uses base policy for top tier when no override configured", () => {
    const result = applyTierPricingOverride("top", basePolicy, noOverrides);

    expect(result.depositAmountCents).toBe(2000); // Base policy
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("applies risk payment mode override if configured", () => {
    const overrides: TierOverrides = {
      ...noOverrides,
      riskPaymentMode: "full_prepay",
      riskDepositAmountCents: 5000,
    };

    const result = applyTierPricingOverride("risk", basePolicy, overrides);

    expect(result.paymentMode).toBe("full_prepay");
    expect(result.depositAmountCents).toBe(5000);
  });
});

describe("derivePaymentRequirement", () => {
  it("requires payment when amount > 0", () => {
    const result = derivePaymentRequirement("deposit", 2000);

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(2000);
  });

  it("does not require payment when amount is 0", () => {
    const result = derivePaymentRequirement("deposit", 0);

    expect(result.paymentRequired).toBe(false);
    expect(result.amountCents).toBe(0);
  });

  it("does not require payment when amount is negative", () => {
    const result = derivePaymentRequirement("deposit", -100);

    expect(result.paymentRequired).toBe(false);
    expect(result.amountCents).toBe(0);
  });
});
```

---

### Step 6: Integration Tests

**File:** `src/lib/__tests__/booking-tier-pricing.test.ts` (new file)

Test full booking flow with different tiers:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { customers, customerScores, shops, shopPolicies } from "@/lib/schema";
import { createAppointment } from "@/lib/queries/appointments";
import { eq } from "drizzle-orm";

describe("Booking with tier pricing", () => {
  let testShopId: string;
  let topTierCustomerId: string;
  let neutralTierCustomerId: string;
  let riskTierCustomerId: string;
  let newCustomerEmail: string;

  beforeEach(async () => {
    // Setup: Create test shop with tier overrides
    const [shop] = await db.insert(shops).values({
      name: "Test Shop",
      slug: "test-tier-pricing",
      currency: "USD",
      ownerId: "test-owner-id",
    }).returning();
    testShopId = shop.id;

    // Configure tier overrides
    await db.insert(shopPolicies).values({
      shopId: testShopId,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000, // $20 base
      riskDepositAmountCents: 5000, // $50 risk
      topDepositWaived: true, // $0 top tier
      topDepositAmountCents: null,
      excludeRiskFromOffers: false,
    });

    // Create test customers with different tiers
    const [topCustomer] = await db.insert(customers).values({
      shopId: testShopId,
      name: "Top Tier Customer",
      email: "top@example.com",
      phone: "+1234567890",
    }).returning();
    topTierCustomerId = topCustomer.id;

    await db.insert(customerScores).values({
      customerId: topTierCustomerId,
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

    const [neutralCustomer] = await db.insert(customers).values({
      shopId: testShopId,
      name: "Neutral Tier Customer",
      email: "neutral@example.com",
      phone: "+1234567891",
    }).returning();
    neutralTierCustomerId = neutralCustomer.id;

    await db.insert(customerScores).values({
      customerId: neutralTierCustomerId,
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

    const [riskCustomer] = await db.insert(customers).values({
      shopId: testShopId,
      name: "Risk Tier Customer",
      email: "risk@example.com",
      phone: "+1234567892",
    }).returning();
    riskTierCustomerId = riskCustomer.id;

    await db.insert(customerScores).values({
      customerId: riskTierCustomerId,
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

    newCustomerEmail = "new@example.com";
  });

  it("applies waived deposit for top tier customer", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Top Tier Customer",
        email: "top@example.com",
        phone: "+1234567890",
      },
      paymentsEnabled: true,
    });

    expect(result.appointment.paymentRequired).toBe(false); // Waived = no payment
    expect(result.paymentIntent).toBeNull(); // No payment intent when waived

    // Check policy version snapshot
    const policyVersion = await db.query.policyVersions.findFirst({
      where: (table, { eq }) => eq(table.id, result.appointment.policyVersionId!),
    });

    expect(policyVersion?.depositAmountCents).toBe(0); // Waived amount
    expect(policyVersion?.appliedTier).toBe("top");
    expect(policyVersion?.tierOverrideApplied).toBe(true);
  });

  it("applies base deposit for neutral tier customer", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Neutral Tier Customer",
        email: "neutral@example.com",
        phone: "+1234567891",
      },
      paymentsEnabled: true,
    });

    expect(result.appointment.paymentRequired).toBe(true);
    expect(result.paymentIntent?.amount).toBe(2000); // $20 base deposit

    const policyVersion = await db.query.policyVersions.findFirst({
      where: (table, { eq }) => eq(table.id, result.appointment.policyVersionId!),
    });

    expect(policyVersion?.depositAmountCents).toBe(2000);
    expect(policyVersion?.appliedTier).toBe("neutral");
    expect(policyVersion?.tierOverrideApplied).toBe(false); // No override
  });

  it("applies higher deposit for risk tier customer", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "Risk Tier Customer",
        email: "risk@example.com",
        phone: "+1234567892",
      },
      paymentsEnabled: true,
    });

    expect(result.appointment.paymentRequired).toBe(true);
    expect(result.paymentIntent?.amount).toBe(5000); // $50 risk deposit

    const policyVersion = await db.query.policyVersions.findFirst({
      where: (table, { eq }) => eq(table.id, result.appointment.policyVersionId!),
    });

    expect(policyVersion?.depositAmountCents).toBe(5000);
    expect(policyVersion?.appliedTier).toBe("risk");
    expect(policyVersion?.tierOverrideApplied).toBe(true);
  });

  it("treats new customer without score as neutral tier", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await createAppointment({
      shopId: testShopId,
      startsAt,
      customer: {
        fullName: "New Customer",
        email: newCustomerEmail,
        phone: "+1999999999",
      },
      paymentsEnabled: true,
    });

    expect(result.appointment.paymentRequired).toBe(true);
    expect(result.paymentIntent?.amount).toBe(2000); // $20 base deposit (neutral default)

    const policyVersion = await db.query.policyVersions.findFirst({
      where: (table, { eq }) => eq(table.id, result.appointment.policyVersionId!),
    });

    expect(policyVersion?.depositAmountCents).toBe(2000);
    expect(policyVersion?.appliedTier).toBeNull(); // No tier yet
    expect(policyVersion?.tierOverrideApplied).toBe(false);
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Setup test environment:**
   ```bash
   # Ensure V1 migration applied (customer_scores table exists)
   pnpm db:migrate

   # Run recompute job to populate scores
   curl -X POST http://localhost:3000/api/jobs/recompute-scores \
     -H "x-cron-secret: $CRON_SECRET"

   # Open Drizzle Studio to verify scores
   pnpm db:studio
   ```

2. **Create test customers with different tiers:**
   - Use Drizzle Studio or seed script
   - Customer A: score 85, tier "top"
   - Customer B: score 55, tier "neutral"
   - Customer C: score 30, tier "risk"
   - Customer D: no score (new customer)

3. **Configure tier overrides in settings:**
   - Navigate to `/app/settings/payment-policy`
   - Set base deposit: 2000 cents ($20)
   - Set risk deposit: 5000 cents ($50)
   - Check "Waive deposit for top tier"
   - Save settings

4. **Test booking as top tier customer:**
   - Book appointment as Customer A (top@example.com)
   - Verify payment intent shows $0.00 (waived)
   - Or verify "No deposit required" message
   - Check appointments table: `payment_required = false`
   - Check policy_versions table: `deposit_amount_cents = 0`

5. **Test booking as neutral tier customer:**
   - Book appointment as Customer B (neutral@example.com)
   - Verify payment intent shows $20.00 (base policy)
   - Check appointments table: `payment_required = true`
   - Check policy_versions table: `deposit_amount_cents = 2000`

6. **Test booking as risk tier customer:**
   - Book appointment as Customer C (risk@example.com)
   - Verify payment intent shows $50.00 (risk override)
   - Check appointments table: `payment_required = true`
   - Check policy_versions table: `deposit_amount_cents = 5000`

7. **Test booking as new customer (no score):**
   - Book appointment as Customer D (new@example.com)
   - Verify payment intent shows $20.00 (neutral default)
   - Check policy_versions table: `deposit_amount_cents = 2000`
   - Check policy_versions table: `applied_tier = NULL`

8. **Test policy immutability:**
   - Customer A books appointment (top tier, $0)
   - Change tier settings in admin (disable waiving)
   - Verify Customer A's existing appointment still shows $0
   - Book new appointment as Customer A → shows new policy
   - Check policy_versions: two different snapshots

9. **Test NULL overrides (fallback to base):**
   - Clear all tier overrides (set to NULL)
   - Book as each tier → all show base deposit ($20)
   - Verify `tier_override_applied = false` in policy versions

10. **Test edge cases:**
    - Base deposit $0 → all tiers $0 (no payment required)
    - Risk deposit < base deposit (unusual but valid)
    - Top deposit > base deposit (unusual but valid)

### Database Verification

```sql
-- Check policy snapshots for different tiers
SELECT
  a.id,
  c.email,
  cs.tier,
  pv.deposit_amount_cents,
  pv.applied_tier,
  pv.tier_override_applied
FROM appointments a
JOIN customers c ON a.customer_id = c.id
LEFT JOIN customer_scores cs ON cs.customer_id = c.id AND cs.shop_id = a.shop_id
JOIN policy_versions pv ON pv.id = a.policy_version_id
ORDER BY a.created_at DESC
LIMIT 10;

-- Expected results:
-- top@example.com    | top    | 0    | top    | true
-- neutral@example.com| neutral| 2000 | neutral| false
-- risk@example.com   | risk   | 5000 | risk   | true
-- new@example.com    | NULL   | 2000 | NULL   | false
```

### Automated Testing

```bash
# Run unit tests
pnpm test src/lib/__tests__/tier-pricing.test.ts

# Run integration tests
pnpm test src/lib/__tests__/booking-tier-pricing.test.ts

# Run all tests
pnpm test
```

**Expected:**
- ✅ All tier pricing logic tests pass
- ✅ Integration tests for all tier scenarios pass
- ✅ Edge cases handled correctly

---

## Acceptance Criteria

- ✅ `loadCustomerScore()` query loads tier from customer_scores table
- ✅ `loadCustomerScoreTx()` works within transaction
- ✅ `applyTierPricingOverride()` correctly applies tier overrides
- ✅ Risk tier uses `riskDepositAmountCents` when configured
- ✅ Top tier waives deposit when `topDepositWaived = true`
- ✅ Top tier uses reduced amount when configured and not waived
- ✅ Neutral tier always uses base policy (no override)
- ✅ NULL tier (new customers) treated as neutral tier
- ✅ Policy version snapshot stores tier-derived amount
- ✅ Policy version stores tier metadata (optional columns)
- ✅ Tier changes after booking don't affect existing appointments
- ✅ NULL overrides fall back to base policy correctly
- ✅ Unit tests pass with >90% coverage
- ✅ Integration tests cover all tier scenarios
- ✅ No booking form UI changes (A7.1 requirement)
- ✅ Tier logic is invisible to customers (just see amount)

---

## Dependencies

**Required:**
- V1: customer_scores table with computed tiers
- V1: Recompute job has run (scores exist)
- V3: shop_policies tier override columns
- V3: Tier settings configured (or NULL for base policy)
- Existing: createAppointment() function
- Existing: ensureShopPolicy() function
- Existing: policyVersions table

**Provides to:**
- V5: Tier-based pricing in effect for all bookings
- V6: Complete tier system ready for end-to-end testing

---

## Cut Strategy

If time runs short:

**Must have:**
- ✅ loadCustomerScore query
- ✅ applyTierPricingOverride logic
- ✅ createAppointment modification
- ✅ Policy snapshot with tier-derived amount
- ✅ Basic unit tests

**Nice to have:**
- Tier metadata in policy_versions (appliedTier, tierOverrideApplied)
- Comprehensive integration tests
- Edge case handling (can simplify validation)
- Logging/debugging output

**Can cut entirely:**
- Risk payment mode override (only support deposit amount, not mode)
- Advanced validation (trust tier override settings from V3)

Core pricing logic is more important than metadata and logging. V5 depends on this working.

---

## Design Principles

### Policy Immutability

- **Snapshot at booking time:** Policy version captures tier-derived amount
- **No retroactive changes:** Tier changes don't affect existing bookings
- **Auditability:** Can trace exactly what customer was charged and why
- **Dispute prevention:** Customer sees amount at booking, that's what they pay

### Invisible to Customers

- **No tier disclosure:** Customers never see their tier assignment
- **No "punishment copy":** Avoid messaging like "because you're unreliable"
- **Neutral presentation:** Just show the deposit amount, no explanation needed
- **Privacy:** Tier is internal business logic, not customer-facing

### Fallback Safety

- **NULL tier = neutral:** New customers get default behavior
- **NULL overrides = base:** Missing overrides fall back to base policy
- **Zero amount = no payment:** Waived deposit works correctly
- **Validation in V3:** Tier settings validated before saving

---

## Security Notes

- No new authentication (uses existing createAppointment security)
- No customer-facing tier disclosure (privacy protected)
- Policy snapshots prevent dispute manipulation
- Tier calculation is server-side only (no client input)
- Scores read from database (no user-supplied tier parameter)

---

## Performance Considerations

- Single additional query per booking: `loadCustomerScoreTx()`
- Query is fast (indexed on customer_id + shop_id)
- Pure function for pricing logic (no external calls)
- Transaction-safe (runs within existing createAppointment transaction)
- No N+1 queries (single customer score lookup)

**Estimated impact:** <10ms additional latency per booking

---

## Rollback Plan

If V4 causes issues:

1. **Revert createAppointment changes:** Use git to revert to previous version
2. **Database:** Policy versions still work with base policy amounts
3. **Optional columns:** appliedTier and tierOverrideApplied can be NULL
4. **No data loss:** Tier overrides in shop_policies remain (can re-enable)

V4 only affects new bookings. Existing appointments unaffected.

---

## Integration Points

### V3: Tier Settings

V4 reads tier overrides from `shop_policies`:

```typescript
const tierOverrides = {
  riskPaymentMode: policy.riskPaymentMode,
  riskDepositAmountCents: policy.riskDepositAmountCents,
  topDepositWaived: policy.topDepositWaived,
  topDepositAmountCents: policy.topDepositAmountCents,
};
```

### V1: Customer Scores

V4 reads tier assignments from `customer_scores`:

```typescript
const customerScore = await loadCustomerScoreTx(tx, customerId, shopId);
const tier = customerScore?.tier ?? null; // null = neutral default
```

### Existing: Payment Intent Creation

V4 modifies the amount passed to Stripe payment intent:

```typescript
// Downstream (not changed in V4, but uses tier-derived amount)
if (paymentRequired) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents, // Now tier-adjusted
    currency: currency.toLowerCase(),
    // ...
  });
}
```

---

## Future Enhancements (Out of Scope)

- **Tier-based cancellation windows:** Top tier gets longer cutoff time
- **Tier-based service level:** Priority booking slots for top tier
- **Tier communication:** Email customer when tier changes (opt-in)
- **Tier preview in admin:** Show tier distribution before configuring overrides
- **A/B testing:** Test different tier thresholds/amounts
- **Historical migration:** Apply tier pricing to past appointments (risky)
- **Manual tier override:** Force specific customer to specific tier

---

## Notes

### Why Not Show Tier to Customer?

**Privacy:** Tier is sensitive information (payment reliability history)
**Simplicity:** Customer just needs to know the amount, not why
**Neutrality:** Avoid making customers feel "punished" or "rewarded"
**Compliance:** Some jurisdictions may have rules about credit-like scoring

### Why Snapshot Tier in Policy Version?

**Auditability:** Can prove what tier was used at booking time
**Debugging:** Trace unexpected deposit amounts back to tier logic
**Dispute resolution:** Show customer exactly what policy applied
**Data integrity:** Decouple from mutable tier scores

### Why Treat NULL Tier as Neutral?

**Safe default:** New customers get standard deposit (not penalized)
**Consistent:** Aligns with "neutral tier is default" principle
**Predictable:** Business owners know what new customers pay
**Graceful:** System works even if recompute job hasn't run yet

---

## Next Steps

After V4 ships:

1. Monitor booking success rates by tier (do risk customers convert?)
2. Verify policy snapshots store correct amounts in production
3. Gather feedback from business owners on tier pricing effectiveness
4. Check for edge cases in real bookings (logs, error reports)
5. Begin V5: Offer Loop Tier Prioritization (complete the tier system)
6. Begin V6: Polish & Testing (end-to-end validation)
