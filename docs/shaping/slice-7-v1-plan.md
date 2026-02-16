# V1: Scoring Engine + Database

**Goal:** Build the foundation for tier-based risk management with deterministic customer scoring

**Appetite:** 1 day

**Demo:** Run recompute job, see customer scores in Drizzle Studio with tier assignments and concrete stats

---

## Overview

V1 creates the scoring engine that powers tier-based deposit adjustments. It aggregates appointment outcomes over a rolling 180-day window, calculates deterministic scores (0-100), assigns tiers (top/neutral/risk), and stores results in the database. This slice is the foundation for all downstream features (dashboard, booking pricing, offer loop prioritization).

### What's Built

- Database schema: `customer_scores` table with score, tier, and stats
- Extend `shop_policies` table with tier override columns
- Scoring functions: `calculateScore()`, `assignTier()` (pure, testable)
- Aggregation query: `aggregateAppointmentCounts()` (180-day rolling window)
- Persistence: `upsertCustomerScore()` (idempotent)
- Recompute job: `POST /api/jobs/recompute-scores` (cron-compatible)
- Cron configuration in `vercel.json`
- Unit tests for scoring logic

---

## Scope

### In Scope

- `customer_scores` table (score, tier, stats, window_days, computed_at)
- Extend `shop_policies` with tier pricing columns
- Score calculation: start at 50, adjust based on outcomes, apply recency multiplier
- Tier assignment: top (≥80 + no voids in 90d), risk (<40 or ≥2 voids in 90d), else neutral
- Aggregation: count settled, voided, refunded, late cancels from `resolutionReason` field
- Nightly recompute job with PostgreSQL advisory lock
- Idempotent upsert (same data → same score)
- Unit tests for scoring formulas

### Out of Scope

- Dashboard UI (V2)
- Policy settings UI (V3)
- Booking pricing integration (V4)
- Offer loop integration (V5)
- On-event recompute (optional enhancement, cut if time-constrained)
- Customer detail pages (future)

---

## Implementation Steps

### Step 1: Database Schema

**File:** `src/lib/schema.ts`

Add `customer_scores` table and extend `shop_policies`:

```typescript
import { pgEnum, pgTable, uuid, integer, jsonb, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// Tier enum
export const tierEnum = pgEnum("tier", ["top", "neutral", "risk"]);

// Customer scores table
export const customerScores = pgTable(
  "customer_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 0-100
    tier: tierEnum("tier").notNull(), // top | neutral | risk
    windowDays: integer("window_days").notNull().default(180),
    stats: jsonb("stats").notNull().$type<{
      settled: number;
      voided: number;
      refunded: number;
      lateCancels: number;
      lastActivityAt: string | null; // ISO timestamp
      voidedLast90Days: number; // For tier assignment
    }>(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCustomerShop: uniqueIndex("customer_scores_customer_shop_idx").on(
      table.customerId,
      table.shopId
    ),
  })
);

// Extend shop_policies table (add to existing table definition)
// Add these columns to the existing shopPolicies table:
export const shopPolicies = pgTable("shop_policies", {
  // ... existing columns ...

  // Tier-based deposit overrides
  riskPaymentMode: paymentModeEnum("risk_payment_mode"), // nullable, fallback to base
  riskDepositAmountCents: integer("risk_deposit_amount_cents"), // nullable
  topDepositWaived: boolean("top_deposit_waived").default(false),
  topDepositAmountCents: integer("top_deposit_amount_cents"), // nullable
  excludeRiskFromOffers: boolean("exclude_risk_from_offers").default(false),

  // ... rest of existing columns ...
});

// Relations
export const customerScoresRelations = relations(customerScores, ({ one }) => ({
  customer: one(customers, {
    fields: [customerScores.customerId],
    references: [customers.id],
  }),
  shop: one(shops, {
    fields: [customerScores.shopId],
    references: [shops.id],
  }),
}));

// Add to customers relations
export const customersRelations = relations(customers, ({ many, one }) => ({
  // ... existing relations ...
  scores: many(customerScores),
}));
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL in drizzle/
pnpm db:migrate
```

---

### Step 2: Scoring Functions (Pure, Testable)

**File:** `src/lib/scoring.ts` (new file)

```typescript
/**
 * Customer reliability scoring and tier assignment.
 *
 * Scoring is deterministic: same data always produces same score.
 * No randomness, no AI, no black boxes. Formula is transparent and adjustable.
 */

export type Tier = "top" | "neutral" | "risk";

export interface AppointmentCounts {
  settled: number;
  voided: number;
  refunded: number;
  lateCancels: number;
}

export interface RecencyData {
  last30Days: AppointmentCounts;
  days31To90: AppointmentCounts;
  over90Days: AppointmentCounts;
}

export interface ScoringStats {
  settled: number;
  voided: number;
  refunded: number;
  lateCancels: number;
  lastActivityAt: string | null;
  voidedLast90Days: number;
}

// Scoring constants (easy to tune)
const SCORING_CONSTANTS = {
  baseScore: 50,
  settledPoints: 10,
  settledCap: 50, // Max +50 from settled appointments
  voidedPenalty: -20,
  refundedPenalty: -5,
  lateCancelPenalty: -10,
  recencyMultipliers: {
    last30Days: 2.0,
    days31To90: 1.0,
    over90Days: 0.5,
  },
  minScore: 0,
  maxScore: 100,
};

// Tier thresholds
const TIER_THRESHOLDS = {
  topMinScore: 80,
  topMaxVoidsIn90Days: 0,
  riskMaxScore: 39,
  riskMinVoidsIn90Days: 2,
};

/**
 * Calculate customer reliability score (0-100).
 *
 * Formula:
 * - Start at 50
 * - Add +10 per settled appointment (capped at +50 total)
 * - Subtract -20 per voided appointment
 * - Subtract -5 per refunded appointment (cancelled before cutoff)
 * - Subtract -10 per late cancel (cancelled after cutoff)
 * - Apply recency multipliers:
 *   - Last 30 days: 2×
 *   - 31-90 days: 1×
 *   - 90+ days: 0.5×
 * - Clamp to 0-100 range
 *
 * @param recencyData - Appointment counts by recency bucket
 * @returns Score (0-100, integer)
 */
export function calculateScore(recencyData: RecencyData): number {
  const { baseScore, settledPoints, settledCap, voidedPenalty, refundedPenalty, lateCancelPenalty, recencyMultipliers, minScore, maxScore } = SCORING_CONSTANTS;

  let score = baseScore;

  // Apply recency-weighted points
  const buckets = [
    { data: recencyData.last30Days, multiplier: recencyMultipliers.last30Days },
    { data: recencyData.days31To90, multiplier: recencyMultipliers.days31To90 },
    { data: recencyData.over90Days, multiplier: recencyMultipliers.over90Days },
  ];

  let totalSettledPoints = 0;

  for (const { data, multiplier } of buckets) {
    // Settled appointments (capped)
    const settledContribution = Math.min(
      data.settled * settledPoints * multiplier,
      settledCap
    );
    totalSettledPoints += settledContribution;

    // Voided appointments
    score += data.voided * voidedPenalty * multiplier;

    // Refunded appointments (before cutoff)
    score += data.refunded * refundedPenalty * multiplier;

    // Late cancels (after cutoff)
    score += data.lateCancels * lateCancelPenalty * multiplier;
  }

  // Add settled points (capped at settledCap)
  score += Math.min(totalSettledPoints, settledCap);

  // Clamp to valid range
  return Math.max(minScore, Math.min(maxScore, Math.round(score)));
}

/**
 * Assign tier based on score and void count.
 *
 * Rules:
 * - Top tier: score ≥80 AND voided_count==0 in last 90 days
 * - Risk tier: score <40 OR voided_count ≥2 in last 90 days
 * - Neutral tier: everything else (default for new customers)
 *
 * @param score - Reliability score (0-100)
 * @param voidedLast90Days - Count of voided appointments in last 90 days
 * @returns Tier assignment
 */
export function assignTier(score: number, voidedLast90Days: number): Tier {
  const { topMinScore, topMaxVoidsIn90Days, riskMaxScore, riskMinVoidsIn90Days } = TIER_THRESHOLDS;

  // Top tier: high score + no voids in 90d
  if (score >= topMinScore && voidedLast90Days <= topMaxVoidsIn90Days) {
    return "top";
  }

  // Risk tier: low score OR multiple voids
  if (score <= riskMaxScore || voidedLast90Days >= riskMinVoidsIn90Days) {
    return "risk";
  }

  // Default: neutral
  return "neutral";
}

/**
 * Flatten recency data into totals for stats storage.
 */
export function flattenRecencyData(recencyData: RecencyData): AppointmentCounts {
  return {
    settled: recencyData.last30Days.settled + recencyData.days31To90.settled + recencyData.over90Days.settled,
    voided: recencyData.last30Days.voided + recencyData.days31To90.voided + recencyData.over90Days.voided,
    refunded: recencyData.last30Days.refunded + recencyData.days31To90.refunded + recencyData.over90Days.refunded,
    lateCancels: recencyData.last30Days.lateCancels + recencyData.days31To90.lateCancels + recencyData.over90Days.lateCancels,
  };
}
```

---

### Step 3: Aggregation Query

**File:** `src/lib/queries/scoring.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { appointments, customers } from "@/lib/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { RecencyData, AppointmentCounts } from "@/lib/scoring";

/**
 * Aggregate appointment counts for a customer over a rolling window.
 *
 * Groups appointments into recency buckets:
 * - Last 30 days
 * - 31-90 days
 * - 90+ days (within window)
 *
 * Counts are derived from `resolutionReason` field (ground truth):
 * - settled: status='booked' AND financialOutcome='settled'
 * - voided: financialOutcome='voided'
 * - refunded: resolutionReason='cancelled_refunded_before_cutoff'
 * - lateCancels: resolutionReason='cancelled_no_refund_after_cutoff'
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID (customer scores are per-shop)
 * @param windowDays - Rolling window size (default 180)
 * @returns Recency-bucketed counts + last activity timestamp
 */
export async function aggregateAppointmentCounts(
  customerId: string,
  shopId: string,
  windowDays: number = 180
): Promise<{
  recencyData: RecencyData;
  lastActivityAt: Date | null;
  voidedLast90Days: number;
}> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const last30DaysStart = new Date();
  last30DaysStart.setDate(last30DaysStart.getDate() - 30);

  const last90DaysStart = new Date();
  last90DaysStart.setDate(last90DaysStart.getDate() - 90);

  // Query all appointments in window
  const rows = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      financialOutcome: appointments.financialOutcome,
      resolutionReason: appointments.resolutionReason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, customerId),
        eq(appointments.shopId, shopId),
        gte(appointments.createdAt, windowStart)
      )
    );

  // Initialize buckets
  const last30Days: AppointmentCounts = { settled: 0, voided: 0, refunded: 0, lateCancels: 0 };
  const days31To90: AppointmentCounts = { settled: 0, voided: 0, refunded: 0, lateCancels: 0 };
  const over90Days: AppointmentCounts = { settled: 0, voided: 0, refunded: 0, lateCancels: 0 };

  let lastActivityAt: Date | null = null;
  let voidedLast90Days = 0;

  // Categorize each appointment
  for (const row of rows) {
    const createdAt = new Date(row.createdAt);

    // Determine recency bucket
    let bucket: AppointmentCounts;
    if (createdAt >= last30DaysStart) {
      bucket = last30Days;
    } else if (createdAt >= last90DaysStart) {
      bucket = days31To90;
    } else {
      bucket = over90Days;
    }

    // Count by outcome type
    if (row.status === "booked" && row.financialOutcome === "settled") {
      bucket.settled++;
    } else if (row.financialOutcome === "voided") {
      bucket.voided++;
      if (createdAt >= last90DaysStart) {
        voidedLast90Days++;
      }
    } else if (row.resolutionReason === "cancelled_refunded_before_cutoff") {
      bucket.refunded++;
    } else if (row.resolutionReason === "cancelled_no_refund_after_cutoff") {
      bucket.lateCancels++;
    }

    // Track last activity
    if (!lastActivityAt || createdAt > lastActivityAt) {
      lastActivityAt = createdAt;
    }
  }

  return {
    recencyData: {
      last30Days,
      days31To90,
      over90Days,
    },
    lastActivityAt,
    voidedLast90Days,
  };
}
```

---

### Step 4: Persistence Function

**File:** `src/lib/queries/scoring.ts` (add to existing file)

```typescript
import { customerScores } from "@/lib/schema";
import { Tier, ScoringStats } from "@/lib/scoring";

/**
 * Upsert customer score record (idempotent).
 *
 * Updates existing record or inserts new one.
 * Handles conflicts on (customer_id, shop_id) unique constraint.
 *
 * @param data - Score, tier, stats, and identifiers
 */
export async function upsertCustomerScore(data: {
  customerId: string;
  shopId: string;
  score: number;
  tier: Tier;
  windowDays: number;
  stats: ScoringStats;
}): Promise<void> {
  await db
    .insert(customerScores)
    .values({
      customerId: data.customerId,
      shopId: data.shopId,
      score: data.score,
      tier: data.tier,
      windowDays: data.windowDays,
      stats: data.stats,
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [customerScores.customerId, customerScores.shopId],
      set: {
        score: data.score,
        tier: data.tier,
        windowDays: data.windowDays,
        stats: data.stats,
        computedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}
```

---

### Step 5: Recompute Job

**File:** `src/app/api/jobs/recompute-scores/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, shops } from "@/lib/schema";
import { sql } from "drizzle-orm";
import {
  aggregateAppointmentCounts,
  upsertCustomerScore,
} from "@/lib/queries/scoring";
import {
  calculateScore,
  assignTier,
  flattenRecencyData,
} from "@/lib/scoring";

/**
 * Recompute customer scores for all shops.
 *
 * Scheduled to run nightly at 2 AM UTC via Vercel Cron.
 *
 * Uses PostgreSQL advisory lock (482176) to prevent concurrent execution.
 * Processes customers in batches, collects errors, returns summary.
 *
 * Authentication: x-cron-secret header (same pattern as resolve-outcomes job)
 */

const LOCK_ID = 482176; // Advisory lock ID (different from resolver's 482175)
const BATCH_SIZE = 50; // Process customers in batches

export async function POST(request: NextRequest) {
  // Authentication
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("[recompute-scores] Starting score recomputation job");

  // Acquire advisory lock
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${LOCK_ID}) as acquired`
  );
  const acquired = lockResult.rows[0]?.acquired;

  if (!acquired) {
    console.log("[recompute-scores] Another job is running, skipping");
    return NextResponse.json(
      { message: "Another recompute job is running, skipped" },
      { status: 200 }
    );
  }

  try {
    let totalProcessed = 0;
    const errors: Array<{ customerId: string; shopId: string; error: string }> = [];

    // Get all shops
    const allShops = await db.select({ id: shops.id }).from(shops);

    for (const shop of allShops) {
      console.log(`[recompute-scores] Processing shop ${shop.id}`);

      // Get all customers for this shop
      const shopCustomers = await db
        .select({
          id: customers.id,
        })
        .from(customers)
        .where(sql`${customers.shopId} = ${shop.id}`);

      console.log(`[recompute-scores] Found ${shopCustomers.length} customers for shop ${shop.id}`);

      // Process in batches
      for (let i = 0; i < shopCustomers.length; i += BATCH_SIZE) {
        const batch = shopCustomers.slice(i, i + BATCH_SIZE);

        for (const customer of batch) {
          try {
            await computeScoreAndTier(customer.id, shop.id);
            totalProcessed++;
          } catch (error) {
            console.error(
              `[recompute-scores] Error processing customer ${customer.id} in shop ${shop.id}:`,
              error
            );
            errors.push({
              customerId: customer.id,
              shopId: shop.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        console.log(`[recompute-scores] Processed batch ${i / BATCH_SIZE + 1} for shop ${shop.id}`);
      }
    }

    console.log(`[recompute-scores] Completed: ${totalProcessed} customers processed, ${errors.length} errors`);

    return NextResponse.json({
      processed: totalProcessed,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Return first 10 errors
    });
  } finally {
    // Release advisory lock
    await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_ID})`);
  }
}

/**
 * Compute score and tier for a single customer.
 *
 * Called by recompute job for each customer.
 * Can also be called on-demand (future enhancement).
 */
export async function computeScoreAndTier(
  customerId: string,
  shopId: string
): Promise<void> {
  // Aggregate appointment counts
  const { recencyData, lastActivityAt, voidedLast90Days } =
    await aggregateAppointmentCounts(customerId, shopId, 180);

  // Calculate score
  const score = calculateScore(recencyData);

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

  console.log(`[computeScoreAndTier] Customer ${customerId}: score=${score}, tier=${tier}`);
}
```

---

### Step 6: Cron Configuration

**File:** `vercel.json`

Add cron job configuration:

```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/recompute-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** Daily at 2 AM UTC (after resolve-outcomes runs at midnight)

---

### Step 7: Unit Tests

**File:** `src/lib/__tests__/scoring.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateScore,
  assignTier,
  flattenRecencyData,
  RecencyData,
} from "@/lib/scoring";

describe("calculateScore", () => {
  it("returns base score (50) for customer with no history", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(50);
  });

  it("increases score for settled appointments", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 3, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    // 3 settled × 10 points × 2× recency = 60 points
    // Base 50 + 60 = 110, capped at 100
    expect(calculateScore(recencyData)).toBe(100);
  });

  it("decreases score for voided appointments", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 0, voided: 2, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    // 2 voided × -20 points × 2× recency = -80 points
    // Base 50 - 80 = -30, clamped to 0
    expect(calculateScore(recencyData)).toBe(0);
  });

  it("applies recency multipliers correctly", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 }, // 1 × 10 × 2.0 = 20
      days31To90: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 }, // 1 × 10 × 1.0 = 10
      over90Days: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 }, // 1 × 10 × 0.5 = 5
    };

    // Base 50 + 20 + 10 + 5 = 85
    expect(calculateScore(recencyData)).toBe(85);
  });

  it("caps settled bonus at 50 points", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 10, voided: 0, refunded: 0, lateCancels: 0 }, // Would be 10 × 10 × 2.0 = 200, capped at 50
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    // Base 50 + cap 50 = 100
    expect(calculateScore(recencyData)).toBe(100);
  });

  it("handles mixed outcomes correctly", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 2, voided: 1, refunded: 1, lateCancels: 1 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    // Settled: 2 × 10 × 2.0 = 40
    // Voided: 1 × -20 × 2.0 = -40
    // Refunded: 1 × -5 × 2.0 = -10
    // Late cancel: 1 × -10 × 2.0 = -20
    // Base 50 + 40 - 40 - 10 - 20 = 20
    expect(calculateScore(recencyData)).toBe(20);
  });
});

describe("assignTier", () => {
  it("assigns top tier for high score with no voids", () => {
    expect(assignTier(85, 0)).toBe("top");
    expect(assignTier(80, 0)).toBe("top");
  });

  it("does not assign top tier if voided in last 90 days", () => {
    expect(assignTier(85, 1)).toBe("neutral");
  });

  it("assigns risk tier for low score", () => {
    expect(assignTier(39, 0)).toBe("risk");
    expect(assignTier(20, 0)).toBe("risk");
  });

  it("assigns risk tier for multiple voids regardless of score", () => {
    expect(assignTier(80, 2)).toBe("risk");
    expect(assignTier(50, 3)).toBe("risk");
  });

  it("assigns neutral tier for mid-range score", () => {
    expect(assignTier(50, 0)).toBe("neutral");
    expect(assignTier(60, 1)).toBe("neutral");
    expect(assignTier(79, 0)).toBe("neutral");
  });
});

describe("flattenRecencyData", () => {
  it("sums counts across all recency buckets", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 2, voided: 1, refunded: 1, lateCancels: 0 },
      days31To90: { settled: 3, voided: 0, refunded: 0, lateCancels: 1 },
      over90Days: { settled: 1, voided: 1, refunded: 0, lateCancels: 0 },
    };

    const totals = flattenRecencyData(recencyData);

    expect(totals).toEqual({
      settled: 6,
      voided: 2,
      refunded: 1,
      lateCancels: 1,
    });
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Database setup:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:studio  # Verify tables created
   ```

2. **Create test data:**
   - Use Drizzle Studio or seed script to create appointments with different outcomes
   - Mix of settled, voided, refunded, late cancels
   - Vary `createdAt` timestamps for recency testing

3. **Run recompute job manually:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/recompute-scores \
     -H "x-cron-secret: $CRON_SECRET"
   ```

4. **Verify results in Drizzle Studio:**
   - Open `customer_scores` table
   - Check score values (0-100)
   - Check tier assignments (top/neutral/risk)
   - Check stats JSON (settled, voided, refunded, lateCancels counts)
   - Verify `computedAt` timestamp

5. **Test idempotency:**
   - Run job twice
   - Verify same scores produced
   - Verify `updatedAt` changes but values stay same

### Automated Testing

```bash
pnpm test src/lib/__tests__/scoring.test.ts
```

**Expected:**
- ✅ All scoring formula tests pass
- ✅ Tier assignment logic correct
- ✅ Recency multipliers applied correctly
- ✅ Edge cases handled (no history, all voided, cap limits)

---

## Acceptance Criteria

- ✅ `customer_scores` table exists with all required columns
- ✅ `shop_policies` table extended with tier override columns
- ✅ Migration runs without errors
- ✅ Scoring functions are pure and testable
- ✅ `calculateScore()` produces deterministic results (same input → same output)
- ✅ `assignTier()` correctly maps scores to tiers
- ✅ Aggregation query counts outcomes from `resolutionReason` field
- ✅ Recency multipliers applied correctly (2×, 1×, 0.5×)
- ✅ `upsertCustomerScore()` is idempotent (no duplicates on re-run)
- ✅ Recompute job runs successfully via cron endpoint
- ✅ Advisory lock prevents concurrent job execution
- ✅ Job returns summary with processed count and errors
- ✅ Unit tests pass with ≥90% coverage for scoring logic
- ✅ Cron configured in `vercel.json` to run nightly at 2 AM UTC

---

## Dependencies

**Required:**
- Existing schema (customers, appointments, shops, shop_policies)
- Existing `resolutionReason` field (from Slice 5)
- PostgreSQL database
- Drizzle ORM

**Enables:**
- V2: Customer List Dashboard (reads from customer_scores)
- V3: Tier Policy Settings (writes to shop_policies tier columns)
- V4: Booking Tier Pricing (reads customer_scores + shop_policies)
- V5: Offer Loop Prioritization (reads customer_scores)

---

## Cut Strategy

If time runs short:

**Must have (core engine):**
- ✅ Database schema (D2, D4 columns)
- ✅ Scoring functions (N5, N6)
- ✅ Aggregation query (N4)
- ✅ Recompute job (N13, N2)
- ✅ Basic unit tests

**Nice to have:**
- Comprehensive unit tests (can add incrementally)
- Error handling refinement
- Detailed logging

**Can cut entirely:**
- On-event recompute (already marked as optional in A3.2)

Backend scoring engine is more important than polish. V2-V5 depend on this foundation.

---

## Notes

### Design Principles

1. **Deterministic:** Same data always produces same score (no randomness)
2. **Transparent:** Formula is explicit, constants are tunable
3. **Explainable:** Stats show concrete counts, not black-box AI
4. **Idempotent:** Re-running doesn't change correct results
5. **Per-shop scoped:** Customer tiers can differ across shops

### Tuning Points

If scoring needs adjustment, modify constants in `src/lib/scoring.ts`:

```typescript
const SCORING_CONSTANTS = {
  baseScore: 50,           // Starting score for new customers
  settledPoints: 10,       // Points per settled appointment
  settledCap: 50,          // Max bonus from settled
  voidedPenalty: -20,      // Penalty per voided
  refundedPenalty: -5,     // Penalty per refund
  lateCancelPenalty: -10,  // Penalty per late cancel
  // ... recency multipliers
};

const TIER_THRESHOLDS = {
  topMinScore: 80,         // Minimum score for top tier
  topMaxVoidsIn90Days: 0,  // Max voids allowed in top tier
  riskMaxScore: 39,        // Maximum score for risk tier
  riskMinVoidsIn90Days: 2, // Void count that triggers risk tier
};
```

### Security Notes

- Cron endpoint requires `x-cron-secret` authentication
- Advisory lock ID (482176) prevents concurrent execution
- No customer-facing API (internal job only)
- Scores are computed from ground truth (`resolutionReason`), not mutable policy

### Performance Considerations

- Batch processing (50 customers at a time)
- Single query per customer (efficient)
- Advisory lock prevents stampeding herd
- Nightly schedule (2 AM UTC, low traffic)
- Estimated runtime: <5 minutes for 1000 customers

### Future Enhancements (Out of Scope)

- On-event recompute (trigger when appointment resolves)
- Score history tracking (audit log of tier changes)
- A/B testing different scoring formulas
- Shop-specific scoring constants (custom formulas per business)
- Real-time score preview in dashboard

---

## Rollback Plan

If V1 causes issues:

1. **Database:** Migrations are additive, no data loss
2. **Cron job:** Comment out in `vercel.json`, redeploy
3. **Tables:** Can drop `customer_scores` cleanly (no foreign keys from other tables)
4. **Shop policies:** Tier columns are nullable, won't break existing code

V1 has zero impact on existing booking/cancellation flows. Fully isolated.

---

## Next Steps

After V1 ships:

1. Verify scores in production (Drizzle Studio)
2. Monitor job execution (Vercel cron logs)
3. Tune constants if needed based on real data
4. Begin V2: Customer List Dashboard (visualize scores)
5. Begin V3: Tier Policy Settings (configure overrides)
