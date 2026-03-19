# V2: Scoring + Recompute Job

**Goal:** Implement no-show risk scoring algorithm and make badges show real data

**Appetite:** 1 day

**Demo:** Create new booking → see real no-show risk badge. Run recompute job → existing customers get accurate scores based on appointment history.

---

## Overview

V2 brings the scoring system to life. It implements the deterministic scoring algorithm that calculates no-show risk based on appointment history, adds booking-time score calculation so new appointments get real risk scores, and creates a nightly recompute job to populate stats for existing customers. After V2, dashboard badges will display actual risk levels instead of the default "medium" placeholder from V1.

### What's Built

- Scoring functions: `calculateNoShowScore()`, `assignNoShowRisk()` (pure, testable)
- Aggregation query: `scanAppointmentsByOutcome()` (last 180 days, recency-bucketed)
- Persistence: `upsertNoShowStats()` (idempotent upsert)
- Recompute job: `POST /api/jobs/recompute-no-show-stats` (nightly cron)
- Booking integration: Extend `createAppointment()` to calculate score at booking time
- Unit tests for scoring logic
- Vercel cron configuration (already in place at 2 AM UTC)

---

## Scope

### In Scope

- Scoring formula: base 75, +5 completed (cap +25), -15 no-show, -5 late cancel, -2 on-time cancel
- Recency multipliers: 1.5× (last 30d), 1.0× (31-90d), 0.5× (91-180d)
- Booking-time adjustments: -10 lead <24h, -5 time 6-9 AM, -5 no payment
- Risk tiers: low (≥70 + no no-shows in 90d), high (<40 or ≥2 no-shows in 90d), medium (default)
- Aggregation from appointment outcomes (completed, no-show, late cancel, on-time cancel)
- Nightly recompute job with PostgreSQL advisory lock
- Idempotent upsert (same data → same score)
- New customer handling (default score=50, risk=medium)
- Unit tests for scoring formulas

### Out of Scope

- Customer history card (V3)
- Automated reminders (V4)
- No-show detection in resolver (V5 - detection happens, this slice just scores)
- Slot recovery integration (V5)
- Score history/audit log (future enhancement)
- Real-time score updates (nightly is sufficient)

---

## Implementation Steps

### Step 1: Scoring Functions (Pure, Testable)

**File:** `src/lib/no-show-scoring.ts` (new file)

```typescript
/**
 * No-show risk scoring and tier assignment.
 *
 * Deterministic formula: same data always produces same score.
 * No randomness, no AI, no black boxes. Fully transparent and tunable.
 */

export type NoShowRisk = "low" | "medium" | "high";

export interface AppointmentOutcomeCounts {
  completed: number;      // Settled, customer showed up
  noShows: number;        // Status='booked', ended, customer didn't show
  lateCancels: number;    // Cancelled after cutoff, deposit kept
  onTimeCancels: number;  // Cancelled before cutoff, refunded
}

export interface RecencyBuckets {
  last30Days: AppointmentOutcomeCounts;
  days31To90: AppointmentOutcomeCounts;
  days91To180: AppointmentOutcomeCounts;
}

export interface NoShowStats {
  totalAppointments: number;
  noShowCount: number;
  lateCancelCount: number;
  onTimeCancelCount: number;
  completedCount: number;
  lastNoShowAt: string | null; // ISO timestamp
  noShowsLast90Days: number;   // For tier assignment
}

export interface BookingContext {
  leadTimeHours: number;       // Hours between booking and appointment
  appointmentHour: number;     // Hour of day (0-23) in shop timezone
  paymentRequired: boolean;
}

// Scoring constants (tunable)
const SCORING_CONSTANTS = {
  baseScore: 75,
  completedPoints: 5,
  completedCap: 25,        // Max +25 from completed appointments
  noShowPenalty: -15,
  lateCancelPenalty: -5,
  onTimeCancelPenalty: -2,
  recencyMultipliers: {
    last30Days: 1.5,
    days31To90: 1.0,
    days91To180: 0.5,
  },
  bookingAdjustments: {
    shortLeadTimePenalty: -10,  // Lead time < 24h
    earlyMorningPenalty: -5,    // 6-9 AM appointments
    noPaymentPenalty: -5,       // No payment required
  },
  minScore: 0,
  maxScore: 100,
};

// Tier thresholds
const TIER_THRESHOLDS = {
  lowMinScore: 70,
  lowMaxNoShowsIn90Days: 0,
  highMaxScore: 39,
  highMinNoShowsIn90Days: 2,
};

/**
 * Calculate no-show risk score (0-100).
 *
 * Formula:
 * - Start at 75
 * - Add +5 per completed appointment (capped at +25 total)
 * - Subtract -15 per no-show
 * - Subtract -5 per late cancel
 * - Subtract -2 per on-time cancel
 * - Apply recency multipliers:
 *   - Last 30 days: 1.5×
 *   - 31-90 days: 1.0×
 *   - 91-180 days: 0.5×
 * - Apply booking-time adjustments:
 *   - Lead time < 24h: -10
 *   - Appointment time 6-9 AM: -5
 *   - No payment required: -5
 * - Clamp to 0-100 range
 *
 * @param recencyBuckets - Appointment counts by recency window
 * @param bookingContext - Current booking circumstances (optional, for booking-time)
 * @returns Score (0-100, integer)
 */
export function calculateNoShowScore(
  recencyBuckets: RecencyBuckets,
  bookingContext?: BookingContext
): number {
  const {
    baseScore,
    completedPoints,
    completedCap,
    noShowPenalty,
    lateCancelPenalty,
    onTimeCancelPenalty,
    recencyMultipliers,
    bookingAdjustments,
    minScore,
    maxScore,
  } = SCORING_CONSTANTS;

  let score = baseScore;

  // Apply recency-weighted points
  const buckets = [
    { data: recencyBuckets.last30Days, multiplier: recencyMultipliers.last30Days },
    { data: recencyBuckets.days31To90, multiplier: recencyMultipliers.days31To90 },
    { data: recencyBuckets.days91To180, multiplier: recencyMultipliers.days91To180 },
  ];

  let totalCompletedPoints = 0;

  for (const { data, multiplier } of buckets) {
    // Completed appointments (accumulated, capped globally)
    const completedContribution = data.completed * completedPoints * multiplier;
    totalCompletedPoints += completedContribution;

    // No-shows
    score += data.noShows * noShowPenalty * multiplier;

    // Late cancels
    score += data.lateCancels * lateCancelPenalty * multiplier;

    // On-time cancels
    score += data.onTimeCancels * onTimeCancelPenalty * multiplier;
  }

  // Add completed points (capped)
  score += Math.min(totalCompletedPoints, completedCap);

  // Booking-time adjustments (optional)
  if (bookingContext) {
    // Short lead time penalty
    if (bookingContext.leadTimeHours < 24) {
      score += bookingAdjustments.shortLeadTimePenalty;
    }

    // Early morning penalty (6-9 AM)
    if (bookingContext.appointmentHour >= 6 && bookingContext.appointmentHour < 9) {
      score += bookingAdjustments.earlyMorningPenalty;
    }

    // No payment required penalty
    if (!bookingContext.paymentRequired) {
      score += bookingAdjustments.noPaymentPenalty;
    }
  }

  // Clamp to valid range
  return Math.max(minScore, Math.min(maxScore, Math.round(score)));
}

/**
 * Assign risk tier based on score and no-show count.
 *
 * Rules:
 * - Low: score ≥70 AND no_show_count=0 in last 90 days
 * - High: score <40 OR no_show_count ≥2 in last 90 days
 * - Medium: everything else (default for new customers)
 *
 * @param score - No-show risk score (0-100)
 * @param noShowsLast90Days - Count of no-shows in last 90 days
 * @returns Risk tier
 */
export function assignNoShowRisk(score: number, noShowsLast90Days: number): NoShowRisk {
  const { lowMinScore, lowMaxNoShowsIn90Days, highMaxScore, highMinNoShowsIn90Days } =
    TIER_THRESHOLDS;

  // Low risk: high score + no no-shows in 90d
  if (score >= lowMinScore && noShowsLast90Days <= lowMaxNoShowsIn90Days) {
    return "low";
  }

  // High risk: low score OR multiple no-shows
  if (score <= highMaxScore || noShowsLast90Days >= highMinNoShowsIn90Days) {
    return "high";
  }

  // Default: medium
  return "medium";
}

/**
 * Flatten recency buckets into totals for stats storage.
 */
export function flattenRecencyBuckets(recencyBuckets: RecencyBuckets): AppointmentOutcomeCounts {
  return {
    completed:
      recencyBuckets.last30Days.completed +
      recencyBuckets.days31To90.completed +
      recencyBuckets.days91To180.completed,
    noShows:
      recencyBuckets.last30Days.noShows +
      recencyBuckets.days31To90.noShows +
      recencyBuckets.days91To180.noShows,
    lateCancels:
      recencyBuckets.last30Days.lateCancels +
      recencyBuckets.days31To90.lateCancels +
      recencyBuckets.days91To180.lateCancels,
    onTimeCancels:
      recencyBuckets.last30Days.onTimeCancels +
      recencyBuckets.days31To90.onTimeCancels +
      recencyBuckets.days91To180.onTimeCancels,
  };
}

/**
 * Calculate no-shows in last 90 days from recency buckets.
 */
export function countNoShowsLast90Days(recencyBuckets: RecencyBuckets): number {
  return recencyBuckets.last30Days.noShows + recencyBuckets.days31To90.noShows;
}
```

---

### Step 2: Aggregation Query

**File:** `src/lib/queries/no-show-scoring.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { appointments } from "@/lib/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { RecencyBuckets, AppointmentOutcomeCounts } from "@/lib/no-show-scoring";

/**
 * Scan appointment outcomes for a customer over a rolling 180-day window.
 *
 * Groups appointments into recency buckets and categorizes by outcome:
 * - Completed: status='booked', financialOutcome='settled' (customer showed up)
 * - No-show: status='booked', endsAt < now, no cancellation (detected by V5 resolver)
 * - Late cancel: status='cancelled', resolutionReason='cancelled_no_refund_after_cutoff'
 * - On-time cancel: status='cancelled', resolutionReason='cancelled_refunded_before_cutoff'
 *
 * Note: This query assumes no-shows are marked by the resolver (V5).
 * For V2, we'll count by looking at status and checking if appointment ended without cancellation.
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID (stats are per-shop)
 * @param windowDays - Rolling window size (default 180)
 * @returns Recency-bucketed counts + last no-show timestamp
 */
export async function scanAppointmentsByOutcome(
  customerId: string,
  shopId: string,
  windowDays: number = 180
): Promise<{
  recencyBuckets: RecencyBuckets;
  lastNoShowAt: Date | null;
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
      endsAt: appointments.endsAt,
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
  const last30Days: AppointmentOutcomeCounts = {
    completed: 0,
    noShows: 0,
    lateCancels: 0,
    onTimeCancels: 0,
  };
  const days31To90: AppointmentOutcomeCounts = {
    completed: 0,
    noShows: 0,
    lateCancels: 0,
    onTimeCancels: 0,
  };
  const days91To180: AppointmentOutcomeCounts = {
    completed: 0,
    noShows: 0,
    lateCancels: 0,
    onTimeCancels: 0,
  };

  let lastNoShowAt: Date | null = null;

  // Categorize each appointment
  for (const row of rows) {
    const createdAt = new Date(row.createdAt);
    const endsAt = new Date(row.endsAt);
    const now = new Date();

    // Determine recency bucket
    let bucket: AppointmentOutcomeCounts;
    if (createdAt >= last30DaysStart) {
      bucket = last30Days;
    } else if (createdAt >= last90DaysStart) {
      bucket = days31To90;
    } else {
      bucket = days91To180;
    }

    // Categorize by outcome
    if (row.status === "booked" && row.financialOutcome === "settled") {
      // Completed: customer showed up, payment settled
      bucket.completed++;
    } else if (
      row.status === "booked" &&
      endsAt < now &&
      row.financialOutcome === "unresolved"
    ) {
      // No-show: appointment ended but still marked as booked (resolver hasn't run yet)
      // In V5, resolver will detect these and mark them properly
      bucket.noShows++;
      if (!lastNoShowAt || endsAt > lastNoShowAt) {
        lastNoShowAt = endsAt;
      }
    } else if (
      row.status === "cancelled" &&
      row.resolutionReason === "cancelled_no_refund_after_cutoff"
    ) {
      // Late cancel: cancelled after cutoff, deposit retained
      bucket.lateCancels++;
    } else if (
      row.status === "cancelled" &&
      row.resolutionReason === "cancelled_refunded_before_cutoff"
    ) {
      // On-time cancel: cancelled before cutoff, refunded
      bucket.onTimeCancels++;
    }
  }

  return {
    recencyBuckets: {
      last30Days,
      days31To90,
      days91To180,
    },
    lastNoShowAt,
  };
}

/**
 * Upsert customer no-show stats record (idempotent).
 *
 * Updates existing record or inserts new one.
 * Handles conflicts on (customer_id, shop_id) unique constraint.
 *
 * @param data - Stats to store
 */
export async function upsertNoShowStats(data: {
  customerId: string;
  shopId: string;
  stats: {
    totalAppointments: number;
    noShowCount: number;
    lateCancelCount: number;
    onTimeCancelCount: number;
    completedCount: number;
    lastNoShowAt: string | null;
  };
}): Promise<void> {
  const { customerNoShowStats } = await import("@/lib/schema");

  await db
    .insert(customerNoShowStats)
    .values({
      customerId: data.customerId,
      shopId: data.shopId,
      totalAppointments: data.stats.totalAppointments,
      noShowCount: data.stats.noShowCount,
      lateCancelCount: data.stats.lateCancelCount,
      onTimeCancelCount: data.stats.onTimeCancelCount,
      completedCount: data.stats.completedCount,
      lastNoShowAt: data.stats.lastNoShowAt ? new Date(data.stats.lastNoShowAt) : null,
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [customerNoShowStats.customerId, customerNoShowStats.shopId],
      set: {
        totalAppointments: data.stats.totalAppointments,
        noShowCount: data.stats.noShowCount,
        lateCancelCount: data.stats.lateCancelCount,
        onTimeCancelCount: data.stats.onTimeCancelCount,
        completedCount: data.stats.completedCount,
        lastNoShowAt: data.stats.lastNoShowAt ? new Date(data.stats.lastNoShowAt) : null,
        computedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

/**
 * Load customer no-show stats (for booking-time scoring).
 *
 * Returns null if customer has no history.
 */
export async function getNoShowStats(
  customerId: string,
  shopId: string
): Promise<{
  totalAppointments: number;
  noShowCount: number;
  lateCancelCount: number;
  onTimeCancelCount: number;
  completedCount: number;
  lastNoShowAt: string | null;
} | null> {
  const { customerNoShowStats } = await import("@/lib/schema");

  const rows = await db
    .select()
    .from(customerNoShowStats)
    .where(
      and(
        eq(customerNoShowStats.customerId, customerId),
        eq(customerNoShowStats.shopId, shopId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    totalAppointments: row.totalAppointments,
    noShowCount: row.noShowCount,
    lateCancelCount: row.lateCancelCount,
    onTimeCancelCount: row.onTimeCancelCount,
    completedCount: row.completedCount,
    lastNoShowAt: row.lastNoShowAt ? row.lastNoShowAt.toISOString() : null,
  };
}
```

---

### Step 3: Recompute Job

**File:** `src/app/api/jobs/recompute-no-show-stats/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, shops } from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import {
  scanAppointmentsByOutcome,
  upsertNoShowStats,
} from "@/lib/queries/no-show-scoring";
import {
  calculateNoShowScore,
  assignNoShowRisk,
  flattenRecencyBuckets,
  countNoShowsLast90Days,
} from "@/lib/no-show-scoring";

/**
 * Recompute no-show stats for all customers across all shops.
 *
 * Scheduled to run nightly at 2 AM UTC via Vercel Cron.
 *
 * Uses PostgreSQL advisory lock (482177) to prevent concurrent execution.
 * Processes customers in batches, collects errors, returns summary.
 *
 * Authentication: x-cron-secret header (same pattern as resolve-outcomes job)
 */

export const runtime = "nodejs";

const LOCK_ID = 482177; // Advisory lock ID (unique from other jobs)
const BATCH_SIZE = 50; // Process customers in batches

export async function POST(request: NextRequest) {
  // Authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-cron-secret");
  if (!provided || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[recompute-no-show-stats] Starting job");

  // Acquire advisory lock
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${LOCK_ID}) as locked`
  );
  const locked = lockResult.rows[0]?.locked === true;

  if (!locked) {
    console.log("[recompute-no-show-stats] Another job is running, skipping");
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
      console.log(`[recompute-no-show-stats] Processing shop ${shop.id}`);

      // Get all customers who have appointments at this shop
      // (Customers are global, but stats are per-shop)
      const shopCustomers = await db
        .selectDistinct({ id: customers.id })
        .from(customers)
        .innerJoin(
          sql`appointments`,
          sql`appointments.customer_id = ${customers.id} AND appointments.shop_id = ${shop.id}`
        );

      console.log(
        `[recompute-no-show-stats] Found ${shopCustomers.length} customers for shop ${shop.id}`
      );

      // Process in batches
      for (let i = 0; i < shopCustomers.length; i += BATCH_SIZE) {
        const batch = shopCustomers.slice(i, i + BATCH_SIZE);

        for (const customer of batch) {
          try {
            await computeNoShowStatsForCustomer(customer.id, shop.id);
            totalProcessed++;
          } catch (error) {
            console.error(
              `[recompute-no-show-stats] Error processing customer ${customer.id} in shop ${shop.id}:`,
              error
            );
            errors.push({
              customerId: customer.id,
              shopId: shop.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        console.log(
          `[recompute-no-show-stats] Processed batch ${i / BATCH_SIZE + 1} for shop ${shop.id}`
        );
      }
    }

    console.log(
      `[recompute-no-show-stats] Completed: ${totalProcessed} customers processed, ${errors.length} errors`
    );

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
 * Compute no-show stats for a single customer.
 *
 * Called by recompute job for each customer.
 * Can also be called on-demand (future enhancement).
 */
export async function computeNoShowStatsForCustomer(
  customerId: string,
  shopId: string
): Promise<void> {
  // Scan appointment outcomes
  const { recencyBuckets, lastNoShowAt } = await scanAppointmentsByOutcome(
    customerId,
    shopId,
    180
  );

  // Flatten for storage
  const totals = flattenRecencyBuckets(recencyBuckets);
  const totalAppointments =
    totals.completed + totals.noShows + totals.lateCancels + totals.onTimeCancels;

  // Upsert stats (no scoring yet, just counts)
  await upsertNoShowStats({
    customerId,
    shopId,
    stats: {
      totalAppointments,
      noShowCount: totals.noShows,
      lateCancelCount: totals.lateCancels,
      onTimeCancelCount: totals.onTimeCancels,
      completedCount: totals.completed,
      lastNoShowAt: lastNoShowAt ? lastNoShowAt.toISOString() : null,
    },
  });

  console.log(
    `[computeNoShowStatsForCustomer] Customer ${customerId}: ` +
      `total=${totalAppointments}, completed=${totals.completed}, noShows=${totals.noShows}`
  );
}
```

---

### Step 4: Booking-Time Score Calculation

**File:** `src/lib/queries/appointments.ts` (extend existing)

Add a new function to calculate and update no-show score at booking time:

```typescript
import { appointments } from "@/lib/schema";
import {
  calculateNoShowScore,
  assignNoShowRisk,
  countNoShowsLast90Days,
  RecencyBuckets,
  AppointmentOutcomeCounts,
} from "@/lib/no-show-scoring";
import { getNoShowStats, scanAppointmentsByOutcome } from "@/lib/queries/no-show-scoring";

/**
 * Calculate and update no-show score for an appointment at booking time.
 *
 * Called by createAppointment after appointment is created.
 *
 * @param appointmentId - Appointment UUID
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID
 * @param startsAt - Appointment start time
 * @param paymentRequired - Whether payment is required
 */
export async function updateNoShowScoreAtBooking(params: {
  appointmentId: string;
  customerId: string;
  shopId: string;
  startsAt: Date;
  shopTimezone: string;
  paymentRequired: boolean;
}): Promise<void> {
  const { appointmentId, customerId, shopId, startsAt, shopTimezone, paymentRequired } = params;

  // Load customer's no-show stats (if exists)
  const stats = await getNoShowStats(customerId, shopId);

  // If customer has no history, use defaults
  if (!stats || stats.totalAppointments === 0) {
    // New customer: score=50, risk=medium (non-punitive default)
    await db
      .update(appointments)
      .set({
        noShowScore: 50,
        noShowRisk: "medium",
        noShowComputedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    console.log(
      `[updateNoShowScoreAtBooking] New customer ${customerId}: defaulting to score=50, risk=medium`
    );
    return;
  }

  // Scan recent appointment outcomes to get recency buckets
  const { recencyBuckets } = await scanAppointmentsByOutcome(customerId, shopId, 180);

  // Calculate booking context
  const now = new Date();
  const leadTimeMs = startsAt.getTime() - now.getTime();
  const leadTimeHours = leadTimeMs / (1000 * 60 * 60);

  // Get appointment hour in shop timezone
  const appointmentHour = new Date(
    startsAt.toLocaleString("en-US", { timeZone: shopTimezone })
  ).getHours();

  // Calculate score with booking-time adjustments
  const score = calculateNoShowScore(recencyBuckets, {
    leadTimeHours,
    appointmentHour,
    paymentRequired,
  });

  // Count no-shows in last 90 days for tier assignment
  const noShowsLast90Days = countNoShowsLast90Days(recencyBuckets);

  // Assign risk tier
  const risk = assignNoShowRisk(score, noShowsLast90Days);

  // Update appointment
  await db
    .update(appointments)
    .set({
      noShowScore: score,
      noShowRisk: risk,
      noShowComputedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  console.log(
    `[updateNoShowScoreAtBooking] Appointment ${appointmentId}: score=${score}, risk=${risk}`
  );
}
```

---

### Step 5: Integrate with Booking Creation

**File:** `src/lib/queries/appointments.ts` (extend `createAppointment`)

Add no-show score calculation after appointment is created:

```typescript
// In the createAppointment function, after creating the appointment:

export async function createAppointment(params: {
  shopId: string;
  startsAt: Date;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    smsOptIn?: boolean;
  };
  bookingBaseUrl: string;
}): Promise<{
  appointment: /* ... */;
  customer: /* ... */;
  payment: /* ... */ | null;
  manageUrl: string;
}> {
  // ... existing code to create appointment, customer, payment ...

  // NEW: Calculate no-show score at booking time
  try {
    await updateNoShowScoreAtBooking({
      appointmentId: appointment.id,
      customerId: customer.id,
      shopId: params.shopId,
      startsAt: params.startsAt,
      shopTimezone: shop.timezone, // Assuming shop is loaded earlier
      paymentRequired: /* from policy */,
    });
  } catch (error) {
    // Don't fail booking if scoring fails
    console.error(
      `[createAppointment] Failed to calculate no-show score for appointment ${appointment.id}:`,
      error
    );
  }

  // ... rest of existing code ...
}
```

**Note:** The exact integration point depends on the current `createAppointment` implementation. The score calculation should happen after the appointment is created but is non-blocking (wrapped in try/catch).

---

### Step 6: Update Tooltip Content

**File:** `src/components/appointments/no-show-risk-badge.tsx` (extend V1 component)

Update tooltip to show stats when available:

```typescript
export function NoShowRiskBadge({
  risk,
  score,
  stats,
  className,
}: {
  risk: NoShowRisk;
  score?: number | null;
  stats?: {
    completed: number;
    noShows: number;
    totalAppointments: number;
  } | null;
  className?: string;
}) {
  const displayRisk = risk ?? "medium";

  const config = {
    low: {
      label: "Low Risk",
      color: "bg-green-100 text-green-800",
      icon: "🟢",
    },
    medium: {
      label: "Medium Risk",
      color: "bg-yellow-100 text-yellow-800",
      icon: "🟡",
    },
    high: {
      label: "High Risk",
      color: "bg-red-100 text-red-800",
      icon: "🔴",
    },
  };

  const { label, color, icon } = config[displayRisk];

  // Enhanced tooltip content
  const tooltipContent =
    score !== null && score !== undefined && stats
      ? `Score: ${score}/100 — ${stats.completed} completed, ${stats.noShows} no-show${
          stats.noShows !== 1 ? "s" : ""
        } in last 180 days`
      : score !== null && score !== undefined
      ? `Score: ${score}/100`
      : "Score: — / No history yet";

  return (
    <div className={className} title={tooltipContent}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${color}`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    </div>
  );
}
```

---

### Step 7: Unit Tests

**File:** `src/lib/__tests__/no-show-scoring.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateNoShowScore,
  assignNoShowRisk,
  flattenRecencyBuckets,
  countNoShowsLast90Days,
  RecencyBuckets,
} from "@/lib/no-show-scoring";

describe("calculateNoShowScore", () => {
  it("returns base score (75) for customer with no history", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(75);
  });

  it("increases score for completed appointments", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 3, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // 3 completed × 5 points × 1.5× recency = 22.5 → 23 points
    // Base 75 + 23 = 98
    expect(calculateNoShowScore(recencyBuckets)).toBe(98);
  });

  it("caps completed bonus at 25 points", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 10, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // 10 × 5 × 1.5 = 75 points, capped at 25
    // Base 75 + cap 25 = 100
    expect(calculateNoShowScore(recencyBuckets)).toBe(100);
  });

  it("decreases score for no-shows", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 2, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // 2 no-shows × -15 points × 1.5× recency = -45 points
    // Base 75 - 45 = 30
    expect(calculateNoShowScore(recencyBuckets)).toBe(30);
  });

  it("applies recency multipliers correctly", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 }, // 1 × 5 × 1.5 = 7.5
      days31To90: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 }, // 1 × 5 × 1.0 = 5
      days91To180: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 }, // 1 × 5 × 0.5 = 2.5
    };

    // Base 75 + 7.5 + 5 + 2.5 = 90
    expect(calculateNoShowScore(recencyBuckets)).toBe(90);
  });

  it("applies booking-time adjustment for short lead time", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // Base 75 - 10 (short lead time) = 65
    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 12,
        appointmentHour: 14,
        paymentRequired: true,
      })
    ).toBe(65);
  });

  it("applies booking-time adjustment for early morning", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // Base 75 - 5 (early morning) = 70
    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 48,
        appointmentHour: 7,
        paymentRequired: true,
      })
    ).toBe(70);
  });

  it("applies booking-time adjustment for no payment", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // Base 75 - 5 (no payment) = 70
    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 48,
        appointmentHour: 14,
        paymentRequired: false,
      })
    ).toBe(70);
  });

  it("applies multiple booking-time adjustments", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // Base 75 - 10 (short lead) - 5 (early morning) - 5 (no payment) = 55
    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 12,
        appointmentHour: 7,
        paymentRequired: false,
      })
    ).toBe(55);
  });

  it("clamps score to 0-100 range", () => {
    const lowScore: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 10, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    // 10 × -15 × 1.5 = -225, base 75 - 225 = -150, clamped to 0
    expect(calculateNoShowScore(lowScore)).toBe(0);
  });
});

describe("assignNoShowRisk", () => {
  it("assigns low risk for high score with no no-shows", () => {
    expect(assignNoShowRisk(75, 0)).toBe("low");
    expect(assignNoShowRisk(70, 0)).toBe("low");
  });

  it("does not assign low risk if no-shows in last 90 days", () => {
    expect(assignNoShowRisk(75, 1)).toBe("medium");
  });

  it("assigns high risk for low score", () => {
    expect(assignNoShowRisk(39, 0)).toBe("high");
    expect(assignNoShowRisk(20, 0)).toBe("high");
  });

  it("assigns high risk for multiple no-shows regardless of score", () => {
    expect(assignNoShowRisk(75, 2)).toBe("high");
    expect(assignNoShowRisk(50, 3)).toBe("high");
  });

  it("assigns medium risk for mid-range score", () => {
    expect(assignNoShowRisk(50, 0)).toBe("medium");
    expect(assignNoShowRisk(60, 1)).toBe("medium");
    expect(assignNoShowRisk(69, 0)).toBe("medium");
  });
});

describe("flattenRecencyBuckets", () => {
  it("sums counts across all recency buckets", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 2, noShows: 1, lateCancels: 1, onTimeCancels: 0 },
      days31To90: { completed: 3, noShows: 0, lateCancels: 0, onTimeCancels: 1 },
      days91To180: { completed: 1, noShows: 1, lateCancels: 0, onTimeCancels: 0 },
    };

    const totals = flattenRecencyBuckets(recencyBuckets);

    expect(totals).toEqual({
      completed: 6,
      noShows: 2,
      lateCancels: 1,
      onTimeCancels: 1,
    });
  });
});

describe("countNoShowsLast90Days", () => {
  it("counts no-shows from last 30 days and 31-90 days buckets only", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 2, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 1, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 5, lateCancels: 0, onTimeCancels: 0 }, // Not counted
    };

    expect(countNoShowsLast90Days(recencyBuckets)).toBe(3);
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Run recompute job:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/recompute-no-show-stats \
     -H "x-cron-secret: $CRON_SECRET"
   ```

   **Verify:**
   - ✅ Job returns 200 with processed count
   - ✅ Check `customer_no_show_stats` table in Drizzle Studio
   - ✅ Stats populated with correct counts (completed, no-shows, cancels)
   - ✅ `computedAt` timestamp set

2. **Create new booking:**
   - Book an appointment for a customer with history
   - Check appointment record in Drizzle Studio

   **Verify:**
   - ✅ `noShowScore` is set (not null)
   - ✅ `noShowRisk` is low/medium/high (not null)
   - ✅ `noShowComputedAt` is set
   - ✅ Score matches expected calculation

3. **Create booking for new customer:**
   - Book appointment for customer with no history

   **Verify:**
   - ✅ `noShowScore` = 50
   - ✅ `noShowRisk` = "medium"
   - ✅ Non-punitive default applied

4. **Test booking-time adjustments:**
   - Book appointment with <24h lead time
   - Book appointment for 7 AM
   - Book appointment with no payment required

   **Verify:**
   - ✅ Score reduced by appropriate penalties
   - ✅ Adjustments reflected in final score

5. **Dashboard display:**
   - Navigate to /app/appointments

   **Verify:**
   - ✅ Badges show real risk levels (not all "medium")
   - ✅ Tooltip shows score + explanation
   - ✅ Low risk = green, medium = yellow, high = red

6. **Idempotency:**
   - Run recompute job twice
   - Check same customer's stats

   **Verify:**
   - ✅ Same score produced both times
   - ✅ `updatedAt` changes but values stay same

7. **Code quality:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

   **Expected:**
   - ✅ No linting errors
   - ✅ No TypeScript errors

### Automated Testing

```bash
pnpm test src/lib/__tests__/no-show-scoring.test.ts
```

**Expected:**
- ✅ All scoring formula tests pass
- ✅ Risk assignment logic correct
- ✅ Recency multipliers applied correctly
- ✅ Booking-time adjustments work
- ✅ Edge cases handled (no history, all no-shows, cap limits)

---

## Acceptance Criteria

- ✅ `calculateNoShowScore()` function implemented with correct formula
- ✅ `assignNoShowRisk()` function implemented with tier rules
- ✅ `scanAppointmentsByOutcome()` query aggregates appointments correctly
- ✅ `upsertNoShowStats()` is idempotent (no duplicates on re-run)
- ✅ `POST /api/jobs/recompute-no-show-stats` endpoint created
- ✅ Recompute job uses advisory lock (482177)
- ✅ Recompute job processes all customers across all shops
- ✅ Booking creation calculates score at booking time
- ✅ New customers default to score=50, risk=medium
- ✅ Booking-time adjustments applied (lead time, time of day, payment)
- ✅ Dashboard badges show real risk levels
- ✅ Tooltip shows score + explanation
- ✅ Scoring is deterministic (same inputs → same output)
- ✅ Unit tests pass with ≥90% coverage
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Dependencies

**Required:**
- V1: Database schema (customer_no_show_stats, appointments columns)
- Existing appointment outcomes (financialOutcome, resolutionReason, status)
- Existing cron infrastructure (x-cron-secret auth)
- PostgreSQL advisory locks

**Enables:**
- V3: Customer History Card (reads customer_no_show_stats)
- V4: Automated Reminders (queries appointments by noShowRisk='high')
- V5: No-Show Detection (increments customer_no_show_stats.noShowCount)
- V5: Slot Recovery (filters/prioritizes by noShowRisk)

---

## Cut Strategy

If time runs short:

**Must have (core scoring):**
- ✅ Scoring functions (N3)
- ✅ Aggregation query (N11)
- ✅ Recompute job (N4)
- ✅ Booking-time calculation (N15)

**Nice to have:**
- Enhanced tooltip with stats (can show just score)
- Comprehensive unit tests (can add incrementally)

**Can cut entirely:**
- Booking-time adjustments (lead time, time of day, payment) - can add in refinement

Core scoring algorithm is more important than booking-time refinements.

---

## Notes

### Design Principles

1. **Deterministic:** Same data always produces same score (no randomness, no ML)
2. **Transparent:** Formula is explicit, constants are tunable
3. **Non-punitive:** New customers default to medium (score=50), not penalized
4. **Explainable:** Stats show concrete counts, not black-box predictions
5. **Per-shop scoped:** Customer stats can differ across shops

### Tuning Points

If scoring needs adjustment, modify constants in `src/lib/no-show-scoring.ts`:

```typescript
const SCORING_CONSTANTS = {
  baseScore: 75,              // Starting score
  completedPoints: 5,         // Points per completed appointment
  completedCap: 25,           // Max bonus from completed
  noShowPenalty: -15,         // Penalty per no-show
  lateCancelPenalty: -5,      // Penalty per late cancel
  onTimeCancelPenalty: -2,    // Penalty per on-time cancel
  // ... recency multipliers ...
  // ... booking-time adjustments ...
};

const TIER_THRESHOLDS = {
  lowMinScore: 70,            // Minimum score for low risk
  lowMaxNoShowsIn90Days: 0,   // Max no-shows allowed in low risk
  highMaxScore: 39,           // Maximum score for high risk
  highMinNoShowsIn90Days: 2,  // No-show count that triggers high risk
};
```

### Security Notes

- Cron endpoint requires `x-cron-secret` authentication
- Advisory lock ID (482177) prevents concurrent execution
- No customer-facing API (internal job only)
- Scores computed from ground truth (appointment outcomes), not mutable policy

### Performance Considerations

- Batch processing (50 customers at a time)
- Single aggregation query per customer (efficient)
- Advisory lock prevents concurrent jobs
- Nightly schedule (2 AM UTC, low traffic)
- Estimated runtime: <5 minutes for 1000 customers
- Booking-time scoring is non-blocking (wrapped in try/catch)

### Future Enhancements (Out of Scope)

- On-event recompute (trigger when appointment resolves)
- Score history tracking (audit log of tier changes)
- A/B testing different scoring formulas
- Shop-specific scoring constants (custom formulas per business)
- Real-time score updates on dashboard

---

## Rollback Plan

If V2 causes issues:

1. **Database:** No schema changes, safe to rollback code
2. **Cron job:** Already configured in vercel.json, can disable endpoint
3. **Booking flow:** Score calculation is non-blocking, won't break bookings
4. **Dashboard:** Falls back to "medium" if score is null

V2 is additive and has minimal impact on existing flows. Scoring failures don't break bookings.

---

## Next Steps

After V2 ships:

1. Monitor recompute job execution (Vercel cron logs)
2. Verify scores in production (Drizzle Studio)
3. Check dashboard displays real risk levels
4. Tune scoring constants if needed based on real data
5. Begin V3: Customer History Card (show why a customer has a certain risk)
