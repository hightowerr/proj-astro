# V5: No-Show Detection + Slot Recovery

**Goal:** Automatically detect no-shows and integrate attendance reliability into slot recovery prioritization

**Appetite:** 1 day

**Demo:** Run resolver on past appointment that wasn't cancelled → see no-show detected, stats updated, financialOutcome='voided'. Use slot recovery with high no-show risk filtering → see unreliable customers excluded from offers.

---

## Overview

V5 completes the no-show prediction loop by adding automatic detection and recovery integration. When the resolver job runs, it now detects no-shows (appointments that ended but weren't cancelled) and updates customer stats. This feeds back into the scoring system (V2) for future bookings. Additionally, slot recovery is enhanced to filter or deprioritize customers with poor attendance records, ensuring slots go to reliable customers first. This creates a closed feedback loop: predict → intervene → detect → learn → predict better.

### What's Built

- No-show detection: Extend resolver to identify ended appointments without cancellation
- Stats update: Increment `customer_no_show_stats.noShowCount` and set `lastNoShowAt`
- Appointment marking: Set `status='ended'` to distinguish from active bookings
- Slot recovery filtering: Add `excludeHighNoShowRisk` parameter to `getEligibleCustomers()`
- Slot recovery prioritization: Add `prioritizeByNoShowScore` parameter for sorting
- Shop policy integration: New `shop_policies.excludeHighNoShowFromOffers` flag
- Unit tests for detection logic and filtering
- E2E test for full no-show lifecycle

---

## Scope

### In Scope

- Detect no-shows: appointments with `status='booked'`, `endsAt < now - graceMinutes`, no cancellation
- Update stats: increment `noShowCount`, set `lastNoShowAt` in `customer_no_show_stats`
- Mark appointments: set `status='ended'` to prevent re-processing
- Slot recovery filter: exclude customers with `noShowCount ≥ 2` (configurable via policy)
- Slot recovery sort: prioritize by `completedCount` (proxy for attendance reliability)
- Shop policy: `excludeHighNoShowFromOffers` boolean flag (default false)
- Integration with existing resolver job (no new cron job)
- Idempotent detection (appointments only marked once)

### Out of Scope

- Configurable no-show thresholds per shop (use hardcoded ≥2 for now)
- Historical no-show backfilling (only detect going forward)
- No-show notifications to shop owners (future enhancement)
- Attendance rate analytics dashboard (future enhancement)
- Customer dispute/appeal process for no-shows (future enhancement)
- Grace period customization (use existing `resolutionGraceMinutes`)

---

## Implementation Steps

### Step 1: Extend Resolver to Detect No-Shows

**File:** `src/app/api/jobs/resolve-outcomes/route.ts` (extend existing)

Add no-show detection after financial outcome resolution:

```typescript
import { customerNoShowStats } from "@/lib/schema";

// ... existing imports and code ...

export async function POST(req: Request) {
  // ... existing authentication and lock acquisition ...

  try {
    // EXISTING: Resolve financial outcomes
    const candidates = await db
      .select({
        id: appointments.id,
        shopId: appointments.shopId,
        customerId: appointments.customerId, // ADD THIS LINE
        paymentRequired: appointments.paymentRequired,
        policyVersionId: appointments.policyVersionId,
        endsAt: appointments.endsAt,
        status: appointments.status,           // ADD THIS LINE
        paymentId: payments.id,
        paymentStatus: payments.status,
        graceMinutes: shopPolicies.resolutionGraceMinutes,
      })
      .from(appointments)
      .innerJoin(shopPolicies, eq(shopPolicies.shopId, appointments.shopId))
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.financialOutcome, "unresolved"),
          ne(appointments.status, "cancelled"),
          sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
        )
      )
      .orderBy(asc(appointments.endsAt))
      .limit(limit);

    let resolved = 0;
    let skipped = 0;
    let backfilled = 0;
    let noShowsDetected = 0;    // NEW: Track no-shows
    const errors: string[] = [];

    for (const appointment of candidates) {
      try {
        // EXISTING: Resolve financial outcome
        const { financialOutcome, resolutionReason } =
          resolveFinancialOutcome({
            paymentRequired: appointment.paymentRequired,
            paymentStatus: appointment.paymentStatus ?? null,
          });
        const resolvedAt = new Date();

        const didResolve = await db.transaction(async (tx) => {
          // EXISTING: Update appointment with financial outcome
          const updated = await tx
            .update(appointments)
            .set({
              financialOutcome,
              resolvedAt,
              resolutionReason,
              status: "ended",      // NEW: Mark as ended to prevent re-processing
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(appointments.id, appointment.id),
                eq(appointments.financialOutcome, "unresolved")
              )
            )
            .returning({ id: appointments.id });

          if (updated.length === 0) {
            return false;
          }

          // EXISTING: Create event
          const [event] = await tx
            .insert(appointmentEvents)
            .values({
              shopId: appointment.shopId,
              appointmentId: appointment.id,
              type: "outcome_resolved",
              occurredAt: resolvedAt,
              meta: {
                policyVersionId: appointment.policyVersionId ?? null,
                paymentId: appointment.paymentId ?? null,
                paymentStatus: appointment.paymentStatus ?? null,
                financialOutcome,
                resolutionReason,
              },
            })
            .onConflictDoNothing()
            .returning({ id: appointmentEvents.id });

          if (event?.id) {
            await tx
              .update(appointments)
              .set({ lastEventId: event.id, updatedAt: new Date() })
              .where(eq(appointments.id, appointment.id));
          }

          // NEW: Detect no-show and update stats
          if (
            appointment.status === "booked" &&
            financialOutcome === "voided"
          ) {
            // This is a no-show (appointment ended, customer didn't show, payment voided)
            await detectAndRecordNoShow(tx, {
              customerId: appointment.customerId,
              shopId: appointment.shopId,
              appointmentId: appointment.id,
              noShowAt: appointment.endsAt,
            });
            noShowsDetected++;
          }

          return true;
        });

        if (didResolve) {
          resolved += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        // ... existing error handling ...
      }
    }

    // ... existing backfill logic for cancelled appointments ...

    console.log(
      `[resolve-outcomes] Completed: ${resolved} resolved, ${skipped} skipped, ` +
      `${backfilled} backfilled, ${noShowsDetected} no-shows detected, ${errors.length} errors`
    );

    return Response.json({
      total: candidates.length,
      resolved,
      skipped,
      backfilled,
      noShowsDetected,    // NEW: Include in response
      errors: errors.length,
    });
  } finally {
    // ... existing lock release ...
  }
}

/**
 * Detect and record a no-show in customer stats.
 *
 * Increments noShowCount and sets lastNoShowAt.
 * Called within resolver transaction for atomicity.
 *
 * @param tx - Database transaction
 * @param params - Customer, shop, appointment IDs and no-show timestamp
 */
async function detectAndRecordNoShow(
  tx: any,
  params: {
    customerId: string;
    shopId: string;
    appointmentId: string;
    noShowAt: Date;
  }
): Promise<void> {
  const { customerId, shopId, appointmentId, noShowAt } = params;

  // Check if stats record exists
  const existing = await tx
    .select({
      id: customerNoShowStats.id,
      noShowCount: customerNoShowStats.noShowCount,
    })
    .from(customerNoShowStats)
    .where(
      and(
        eq(customerNoShowStats.customerId, customerId),
        eq(customerNoShowStats.shopId, shopId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await tx
      .update(customerNoShowStats)
      .set({
        noShowCount: existing[0].noShowCount + 1,
        lastNoShowAt: noShowAt,
        updatedAt: new Date(),
      })
      .where(eq(customerNoShowStats.id, existing[0].id));
  } else {
    // Create new record (customer's first no-show)
    await tx
      .insert(customerNoShowStats)
      .values({
        customerId,
        shopId,
        totalAppointments: 1,
        noShowCount: 1,
        lateCancelCount: 0,
        onTimeCancelCount: 0,
        completedCount: 0,
        lastNoShowAt: noShowAt,
        computedAt: new Date(),
      })
      .onConflictDoNothing(); // In case of race condition
  }

  console.log(
    `[detectNoShow] Recorded no-show for customer ${customerId} at appointment ${appointmentId}`
  );
}
```

---

### Step 2: Update Shop Policies Schema

**File:** `src/lib/schema.ts` (extend existing shopPolicies table)

Add new flag for no-show filtering in slot recovery:

```typescript
export const shopPolicies = pgTable("shop_policies", {
  // ... existing columns ...

  // Tier-based deposit overrides (from Slice 7)
  riskPaymentMode: paymentModeEnum("risk_payment_mode"),
  riskDepositAmountCents: integer("risk_deposit_amount_cents"),
  topDepositWaived: boolean("top_deposit_waived").default(false).notNull(),
  topDepositAmountCents: integer("top_deposit_amount_cents"),
  excludeRiskFromOffers: boolean("exclude_risk_from_offers").default(false).notNull(),

  // NEW: No-show filtering for slot recovery
  excludeHighNoShowFromOffers: boolean("exclude_high_no_show_from_offers")
    .default(false)
    .notNull(),

  // ... rest of existing columns ...
});
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL in drizzle/
pnpm db:migrate
```

---

### Step 3: Extend Slot Recovery Filtering

**File:** `src/lib/slot-recovery.ts` (extend existing `getEligibleCustomers`)

Add no-show filtering alongside existing financial tier filtering:

```typescript
import { customerNoShowStats } from "@/lib/schema";

/**
 * Get eligible customers for a slot opening.
 *
 * Filters:
 * - sms_opt_in = true
 * - phone present
 * - no overlapping booked/pending appointment
 * - no prior offer for this slot
 * - not in Redis cooldown
 * - optionally excludes risk-tier customers per shop policy (Slice 7)
 * - optionally excludes high no-show risk customers per shop policy (Slice 8)
 *
 * Ordering is deterministic:
 * - financial tier priority: top → neutral/null → risk
 * - within each tier: higher financial score first (null score defaults to 50)
 * - optionally prioritize by attendance: higher completed_count first
 * - final tie-breaker by customer id ascending
 *
 * @param slotOpening - Slot opening record
 * @returns Array of eligible customers
 */
export async function getEligibleCustomers(
  slotOpening: typeof slotOpenings.$inferSelect
): Promise<EligibleCustomer[]> {
  const [shopPolicy] = await db
    .select({
      excludeRiskFromOffers: shopPolicies.excludeRiskFromOffers,
      excludeHighNoShowFromOffers: shopPolicies.excludeHighNoShowFromOffers, // NEW
    })
    .from(shopPolicies)
    .where(eq(shopPolicies.shopId, slotOpening.shopId))
    .limit(1);

  const excludeRiskFromOffers = shopPolicy?.excludeRiskFromOffers ?? false;
  const excludeHighNoShowFromOffers = shopPolicy?.excludeHighNoShowFromOffers ?? false; // NEW

  const candidates = await db
    .select({
      id: customers.id,
      phone: customers.phone,
      fullName: customers.fullName,

      // Financial tier (Slice 7)
      tier: customerScores.tier,
      score: customerScores.score,
      computedAt: customerScores.computedAt,

      // No-show stats (Slice 8) - NEW
      noShowCount: customerNoShowStats.noShowCount,
      completedCount: customerNoShowStats.completedCount,
      noShowComputedAt: customerNoShowStats.computedAt,
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
      customerNoShowStats,  // NEW: Join no-show stats
      and(
        eq(customerNoShowStats.customerId, customers.id),
        eq(customerNoShowStats.shopId, slotOpening.shopId)
      )
    )
    .leftJoin(
      slotOffers,
      and(eq(slotOffers.customerId, customers.id), eq(slotOffers.slotOpeningId, slotOpening.id))
    )
    .where(
      and(
        eq(customers.shopId, slotOpening.shopId),
        eq(customerContactPrefs.smsOptIn, true),
        isNull(slotOffers.id),
        sql`${customers.phone} <> ''`,

        // Exclude financial risk tier (Slice 7)
        excludeRiskFromOffers
          ? sql`(${customerScores.tier} is null or ${customerScores.tier} <> 'risk')`
          : sql`true`,

        // Exclude high no-show risk (Slice 8) - NEW
        excludeHighNoShowFromOffers
          ? sql`(${customerNoShowStats.noShowCount} is null or ${customerNoShowStats.noShowCount} < 2)`
          : sql`true`
      )
    )
    .orderBy(
      // Financial tier priority (Slice 7)
      sql`case
        when ${customerScores.tier} = 'top' then 1
        when ${customerScores.tier} = 'neutral' or ${customerScores.tier} is null then 2
        when ${customerScores.tier} = 'risk' then 3
        else 2
      end`,

      // Financial score descending (Slice 7)
      sql`coalesce(${customerScores.score}, 50) desc`,

      // Attendance reliability (Slice 8) - NEW
      // Higher completed_count = more reliable, prioritize them
      sql`coalesce(${customerNoShowStats.completedCount}, 0) desc`,

      // Most recent computation (tiebreaker)
      sql`${customerScores.computedAt} desc nulls last`,

      // Stable tiebreaker
      asc(customers.id)
    )
    .limit(50);

  // ... existing overlap check and cooldown filtering ...

  return eligible;
}
```

---

### Step 4: Update Appointment Status Enum

**File:** `src/lib/schema.ts` (extend existing enum)

Add 'ended' status to distinguish processed appointments:

```typescript
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "cancelled",
  "ended",      // NEW: Appointment ended and processed by resolver
]);
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL in drizzle/
pnpm db:migrate
```

---

### Step 5: Policy Settings UI Extension (Optional)

**File:** `src/app/app/settings/payment-policy/page.tsx` (extend existing)

Add checkbox for no-show filtering in slot recovery settings:

```typescript
// In the policy form, add a new field:

<div className="space-y-2">
  <label htmlFor="excludeHighNoShowFromOffers" className="text-sm font-medium">
    <input
      type="checkbox"
      id="excludeHighNoShowFromOffers"
      name="excludeHighNoShowFromOffers"
      className="mr-2"
      defaultChecked={policy?.excludeHighNoShowFromOffers ?? false}
    />
    Exclude high no-show risk customers from slot recovery offers
  </label>
  <p className="text-xs text-muted-foreground">
    Customers with 2+ no-shows will not receive slot recovery offers.
    Helps ensure slots go to reliable customers.
  </p>
</div>
```

**File:** `src/app/app/settings/payment-policy/actions.ts` (extend existing)

Add field to policy update action:

```typescript
export async function updatePaymentPolicy(formData: FormData) {
  // ... existing code ...

  const excludeHighNoShowFromOffers = formData.get("excludeHighNoShowFromOffers") === "on";

  await db
    .update(shopPolicies)
    .set({
      // ... existing fields ...
      excludeHighNoShowFromOffers,
      updatedAt: new Date(),
    })
    .where(eq(shopPolicies.shopId, shop.id));

  // ... existing redirect ...
}
```

---

### Step 6: Unit Tests

**File:** `src/lib/__tests__/no-show-detection.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  customerNoShowStats,
  shops,
} from "@/lib/schema";

describe("No-show detection", () => {
  it("increments noShowCount when appointment ends without cancellation", async () => {
    // Setup: Create appointment that ended 1 hour ago
    const pastTime = new Date(Date.now() - 60 * 60 * 1000);

    // Create shop, customer, appointment with status='booked', endsAt=pastTime
    // ... (test setup code) ...

    // Run resolver
    // ... (trigger resolver job) ...

    // Verify: customer_no_show_stats updated
    const stats = await db
      .select()
      .from(customerNoShowStats)
      .where(eq(customerNoShowStats.customerId, customerId))
      .limit(1);

    expect(stats.length).toBe(1);
    expect(stats[0].noShowCount).toBe(1);
    expect(stats[0].lastNoShowAt).toBeDefined();
  });

  it("sets appointment status to 'ended' after detection", async () => {
    // Setup: Create ended appointment
    // ... (test setup code) ...

    // Run resolver
    // ... (trigger resolver job) ...

    // Verify: appointment status changed
    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    expect(appointment?.status).toBe("ended");
  });

  it("does not re-detect already ended appointments", async () => {
    // Setup: Create appointment with status='ended'
    // ... (test setup code) ...

    // Run resolver twice
    // ... (trigger resolver job twice) ...

    // Verify: noShowCount only incremented once
    const stats = await db
      .select()
      .from(customerNoShowStats)
      .where(eq(customerNoShowStats.customerId, customerId))
      .limit(1);

    expect(stats[0].noShowCount).toBe(1); // Not 2
  });

  it("does not detect cancelled appointments as no-shows", async () => {
    // Setup: Create appointment with status='cancelled'
    // ... (test setup code) ...

    // Run resolver
    // ... (trigger resolver job) ...

    // Verify: noShowCount unchanged
    const stats = await db
      .select()
      .from(customerNoShowStats)
      .where(eq(customerNoShowStats.customerId, customerId))
      .limit(1);

    expect(stats.length).toBe(0); // No stats record created
  });
});

describe("Slot recovery no-show filtering", () => {
  it("excludes customers with 2+ no-shows when policy enabled", async () => {
    // Setup: Enable excludeHighNoShowFromOffers policy
    // Create customer with noShowCount=2
    // Create slot opening
    // ... (test setup code) ...

    const eligible = await getEligibleCustomers(slotOpening);

    expect(eligible.length).toBe(0); // Customer excluded
  });

  it("includes customers with 1 no-show when policy enabled", async () => {
    // Setup: Enable policy, customer has noShowCount=1
    // ... (test setup code) ...

    const eligible = await getEligibleCustomers(slotOpening);

    expect(eligible.length).toBe(1); // Customer included
  });

  it("includes high no-show customers when policy disabled", async () => {
    // Setup: Disable policy, customer has noShowCount=3
    // ... (test setup code) ...

    const eligible = await getEligibleCustomers(slotOpening);

    expect(eligible.length).toBe(1); // Customer included
  });

  it("prioritizes customers with higher completed_count", async () => {
    // Setup: Two customers, one with completedCount=10, one with completedCount=2
    // ... (test setup code) ...

    const eligible = await getEligibleCustomers(slotOpening);

    expect(eligible[0].id).toBe(reliableCustomerId); // Higher completed_count first
  });
});
```

---

### Step 7: E2E Test for Full Lifecycle

**File:** `tests/e2e/no-show-lifecycle.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";

test.describe("No-show lifecycle", () => {
  test("detects no-show, updates stats, affects future slot recovery", async ({
    page,
  }) => {
    // 1. Create appointment for customer
    // 2. Simulate time passing (appointment ends)
    // 3. Run resolver job
    // 4. Verify customer_no_show_stats updated (noShowCount=1)
    // 5. Verify appointment status='ended', financialOutcome='voided'
    // 6. Create another appointment for same customer
    // 7. Simulate time passing again
    // 8. Run resolver job
    // 9. Verify noShowCount=2
    // 10. Enable excludeHighNoShowFromOffers policy
    // 11. Create slot opening
    // 12. Run offer loop
    // 13. Verify customer with 2 no-shows excluded from offers

    // ... (detailed test implementation) ...
  });

  test("no-show increments affect future risk scoring", async ({ page }) => {
    // 1. Customer has no history (score=50, risk=medium)
    // 2. Customer no-shows appointment
    // 3. Run resolver (noShowCount=1)
    // 4. Run recompute-no-show-stats job
    // 5. Create new booking
    // 6. Verify score decreased, risk increased to high
    // 7. Dashboard shows updated risk badge

    // ... (detailed test implementation) ...
  });
});
```

---

## Testing Checklist

### Manual Testing

1. **Create test appointment:**
   ```bash
   # In Drizzle Studio:
   # 1. Create appointment with endsAt = 2 hours ago
   # 2. Set status = 'booked' (not cancelled)
   # 3. Set financialOutcome = 'unresolved'
   # 4. Set paymentStatus = 'succeeded' (so it voids)
   ```

2. **Run resolver job:**
   ```bash
   curl -X POST http://localhost:3000/api/jobs/resolve-outcomes \
     -H "x-cron-secret: $CRON_SECRET"
   ```

   **Verify:**
   - ✅ Job returns success with noShowsDetected count
   - ✅ Response: `{ ..., noShowsDetected: 1 }`

3. **Check appointment updated:**
   - Open Drizzle Studio
   - View appointments table

   **Verify:**
   - ✅ status = 'ended'
   - ✅ financialOutcome = 'voided'
   - ✅ resolvedAt timestamp set

4. **Check stats updated:**
   - View customer_no_show_stats table

   **Verify:**
   - ✅ New row for customer + shop
   - ✅ noShowCount = 1
   - ✅ lastNoShowAt = appointment endsAt
   - ✅ updatedAt timestamp set

5. **Test idempotency:**
   - Run resolver again

   **Verify:**
   - ✅ Job completes successfully
   - ✅ noShowCount still = 1 (not incremented again)
   - ✅ Appointment still status='ended'

6. **Test second no-show:**
   - Create another ended appointment for same customer
   - Run resolver

   **Verify:**
   - ✅ noShowCount = 2
   - ✅ lastNoShowAt updated to newer timestamp

7. **Test slot recovery filtering:**
   - Enable excludeHighNoShowFromOffers policy
   - Create slot opening
   - Run offer loop

   **Verify:**
   - ✅ Customer with 2 no-shows excluded from offers
   - ✅ Customers with 0-1 no-shows get offers

8. **Test prioritization:**
   - Create two customers:
     - Customer A: 10 completed, 0 no-shows
     - Customer B: 2 completed, 0 no-shows
   - Create slot opening
   - Run offer loop

   **Verify:**
   - ✅ Customer A (higher completed_count) gets offer first
   - ✅ Deterministic ordering

9. **Code quality:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

   **Expected:**
   - ✅ No linting errors
   - ✅ No TypeScript errors

### Automated Testing

```bash
pnpm test src/lib/__tests__/no-show-detection.test.ts
pnpm test:e2e tests/e2e/no-show-lifecycle.spec.ts
```

**Expected:**
- ✅ All detection logic tests pass
- ✅ Stats update correctly
- ✅ Idempotency works
- ✅ Filtering excludes high no-show customers
- ✅ Prioritization sorts by completed_count

---

## Acceptance Criteria

- ✅ Resolver detects no-shows (status='booked', ended, not cancelled)
- ✅ `customer_no_show_stats.noShowCount` incremented on detection
- ✅ `customer_no_show_stats.lastNoShowAt` set to appointment end time
- ✅ Appointment status changed to 'ended' after processing
- ✅ Detection is idempotent (appointments only processed once)
- ✅ `excludeHighNoShowFromOffers` flag added to shop_policies
- ✅ Slot recovery filters customers with noShowCount ≥ 2 when policy enabled
- ✅ Slot recovery prioritizes by completedCount (DESC)
- ✅ Financial tier filtering (Slice 7) still works alongside no-show filtering
- ✅ Policy settings UI updated with new checkbox
- ✅ Resolver response includes noShowsDetected count
- ✅ Unit tests pass with ≥80% coverage
- ✅ E2E test covers full lifecycle
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Dependencies

**Required:**
- V1: Database schema (customer_no_show_stats table)
- V2: Scoring system (will use updated stats for future calculations)
- Existing resolver job (`POST /api/jobs/resolve-outcomes`)
- Existing slot recovery (`src/lib/slot-recovery.ts`)
- Slice 7: Financial tier filtering (works alongside no-show filtering)

**Completes:**
- Full no-show prediction feedback loop
- Predict (V2) → Intervene (V4) → Detect (V5) → Learn → Predict better
- Closed system: detection feeds back into scoring for continuous improvement

---

## Cut Strategy

If time runs short:

**Must have (core detection):**
- ✅ No-show detection in resolver (N6, N14)
- ✅ Stats update (increment noShowCount)
- ✅ Slot recovery filtering (N7)

**Nice to have:**
- Slot recovery prioritization by completedCount
- Policy settings UI
- Comprehensive unit tests

**Can cut entirely:**
- E2E test (manual testing sufficient)
- Historical backfilling (only detect going forward)

Core detection and filtering are more important than polish.

---

## Notes

### Design Principles

1. **Automatic:** No manual intervention needed, resolver handles detection
2. **Idempotent:** Appointments only counted once (status='ended' prevents re-processing)
3. **Fair:** Uses grace period before marking no-show (not instant)
4. **Feedback loop:** Detection feeds back into scoring for better predictions
5. **Configurable:** Shop owners control no-show filtering via policy flag

### Detection Logic

**What counts as a no-show:**
- Appointment status = 'booked' (not cancelled)
- Appointment endsAt < now - graceMinutes (past end time + grace)
- Financial outcome gets resolved to 'voided' (payment refunded/charged)

**What doesn't count:**
- Cancelled appointments (customer proactively cancelled)
- Appointments within grace period (resolver hasn't run yet)
- Already ended appointments (status='ended' from previous run)

### Slot Recovery Integration

**Two-level filtering:**

1. **Financial tier** (Slice 7):
   - If `excludeRiskFromOffers=true`: exclude customers with tier='risk'
   - Based on payment reliability (voided appointments, late cancels)

2. **No-show risk** (Slice 8):
   - If `excludeHighNoShowFromOffers=true`: exclude customers with noShowCount ≥ 2
   - Based on attendance reliability (showing up vs no-showing)

**Prioritization hierarchy:**
1. Financial tier (top → neutral → risk)
2. Financial score (higher = better)
3. Attendance reliability (more completed = better) ← NEW
4. Most recent computation
5. Customer ID (stable tiebreaker)

### Grace Period Rationale

- Uses existing `resolutionGraceMinutes` (default 30 min)
- Gives customers time to show up late without penalty
- Prevents false positives from traffic delays, emergencies
- Aligns with financial outcome resolution timing

### Performance Considerations

- No additional database queries (extends existing resolver)
- Single upsert per no-show (efficient)
- Status='ended' prevents re-processing (avoids N+1 lookups)
- Slot recovery adds one LEFT JOIN (minimal overhead)
- Estimated overhead: <1 second per 100 no-shows

### Future Enhancements (Out of Scope)

- Configurable no-show threshold per shop (currently hardcoded ≥2)
- Historical backfilling (detect no-shows from before V5)
- No-show notifications to shop owners (email/SMS alert)
- Analytics dashboard (no-show trends, patterns by time/day)
- Customer dispute process (appeal no-show if incorrect)
- Automated slot creation for no-shows (like cancellations)

---

## Rollback Plan

If V5 causes issues:

1. **Disable detection:** Resolver still works, just won't detect no-shows
   - Comment out `detectAndRecordNoShow` call in resolver
   - Redeploy

2. **Disable filtering:** Slot recovery reverts to Slice 7 behavior
   - Set `excludeHighNoShowFromOffers=false` in shop_policies
   - Or comment out filtering logic in `getEligibleCustomers`

3. **No data loss:** All data in database, can re-process if needed
   - customer_no_show_stats persists
   - Appointments marked 'ended' are historical records

4. **Revert migration:** If status='ended' causes issues
   - Can revert enum change (though not recommended)
   - Filter by status IN ('booked', 'cancelled') instead

V5 extends existing systems. No breaking changes to core booking flow. Safe to deploy and rollback.

---

## Next Steps

After V5 ships:

1. Monitor resolver job for no-show detection (check logs)
2. Verify stats in customer_no_show_stats table (Drizzle Studio)
3. Watch slot recovery behavior (are high no-show customers excluded?)
4. Measure impact (do offers to reliable customers increase show-up rate?)
5. Gather feedback from businesses (is filtering too strict? too lenient?)
6. Consider tuning threshold (currently ≥2, could make configurable)
7. Explore analytics dashboard (show no-show trends over time)

### The Complete Loop (V1-V5)

**V1:** Infrastructure + badges (show risk on dashboard)
**V2:** Scoring (calculate risk from history)
**V3:** History card (explain why customer is risky)
**V4:** Reminders (intervene to prevent no-shows)
**V5:** Detection (detect actual no-shows, update stats, improve future predictions)

**Result:** Self-improving system that learns from outcomes and gets better over time.

🎉 **Slice 8 Complete!** No-show prediction is now fully operational.
