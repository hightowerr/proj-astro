# V5: RESOLVER SAFETY - Implementation & Testing Plan

**Status:** Ready for implementation
**Appetite:** 1 day
**Dependencies:** V1-V4 must be completed (schema, manage page, cancellation logic, dashboard)

---

## Overview

V5 ensures that the Slice 4 outcome resolver doesn't overwrite cancellation financial outcomes. When customers cancel appointments, those outcomes must remain immutable regardless of when the resolver job runs.

### Goal

The resolver job (`/api/jobs/resolve-outcomes`) should:
1. **Skip cancelled appointments** that already have a financial outcome
2. **Backfill cancelled appointments** that somehow lack a financial outcome (edge case recovery)
3. **Never overwrite** cancellation outcomes (refunded/settled from cancellation)

---

## Current State Analysis

### Existing Resolver Implementation

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

**Current behavior:**
- Queries appointments with `financialOutcome = "unresolved"`
- Evaluates payment status to determine outcome
- Updates with WHERE clause checking `financialOutcome = "unresolved"`
- Uses advisory lock to prevent concurrent processing

**Current query (lines 55-76):**
```typescript
const candidates = await db
  .select({...})
  .from(appointments)
  .where(
    and(
      eq(appointments.financialOutcome, "unresolved"),
      sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
    )
  )
```

**Problem:** This query will include cancelled appointments with `financialOutcome = "unresolved"`, which shouldn't exist in production but could occur due to:
- Race conditions during cancellation
- Failed cancellation transactions that set status but not outcome
- Data inconsistencies from manual interventions

### Existing Outcome Logic

**File:** `src/lib/outcomes.ts`

**Current resolution reasons:**
- `no_payment_required` → voided
- `payment_captured` → settled
- `payment_not_captured` → voided

**Missing cancellation reasons** (needed for backfill):
- `cancelled_refunded_before_cutoff` → refunded
- `cancelled_no_refund_after_cutoff` → settled

---

## Requirements

### R10: Resolver must not overwrite cancellation outcomes

**Current satisfaction:** ✅ Partially satisfied (won't process appointments with outcome ≠ "unresolved")

**Enhancement needed:**
- Add explicit status check to skip `status = "cancelled"` even if outcome is somehow "unresolved"
- Add audit logging when skipping cancelled appointments

### N26: Skip cancelled appointments check

**Implementation:**
```typescript
// Query modification: exclude cancelled appointments
where(
  and(
    eq(appointments.financialOutcome, "unresolved"),
    ne(appointments.status, "cancelled"), // NEW: explicit skip
    sql`...grace period check...`
  )
)
```

**Rationale:** Defense in depth. Even if a cancelled appointment has `financialOutcome = "unresolved"`, don't process it.

### N27: Backfill logic for edge cases

**Implementation:**
```typescript
// Separate query after main resolution loop
const orphanedCancellations = await db
  .select({...})
  .from(appointments)
  .where(
    and(
      eq(appointments.status, "cancelled"),
      eq(appointments.financialOutcome, "unresolved")
    )
  )
  .limit(50); // Process small batch

// For each orphaned cancellation:
if (refundedAmountCents > 0 || stripeRefundId !== null) {
  // Backfill as refunded
  financialOutcome = "refunded";
  resolutionReason = "cancelled_refunded_before_cutoff";
} else if (paymentStatus === "succeeded") {
  // Backfill as settled (no refund)
  financialOutcome = "settled";
  resolutionReason = "cancelled_no_refund_after_cutoff";
} else {
  // Backfill as voided (payment never captured)
  financialOutcome = "voided";
  resolutionReason = "cancelled_no_payment_captured";
}
```

**Rationale:** Recover from inconsistent state without overwriting correct outcomes.

---

## Implementation Plan

### Step 1: Extend outcome resolution types

**File:** `src/lib/outcomes.ts`

**Changes:**
1. Add new resolution reasons to `ResolutionReason` type:
   ```typescript
   export type ResolutionReason =
     | "no_payment_required"
     | "payment_captured"
     | "payment_not_captured"
     | "cancelled_refunded_before_cutoff"
     | "cancelled_no_refund_after_cutoff"
     | "cancelled_no_payment_captured"; // NEW
   ```

2. Add new `ResolvedOutcome` type value (if not already present):
   ```typescript
   export type ResolvedOutcome = "settled" | "voided" | "refunded";
   ```

3. Create backfill function:
   ```typescript
   export const backfillCancelledOutcome = (input: {
     refundedAmountCents: number;
     stripeRefundId: string | null;
     paymentStatus: string | null;
   }): { financialOutcome: ResolvedOutcome; resolutionReason: ResolutionReason } => {
     // Implementation as shown in N27 above
   }
   ```

### Step 2: Update resolver query to skip cancelled appointments

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

**Changes at line 69:**
```typescript
import { ne } from "drizzle-orm"; // Add import

const candidates = await db
  .select({
    id: appointments.id,
    shopId: appointments.shopId,
    paymentRequired: appointments.paymentRequired,
    policyVersionId: appointments.policyVersionId,
    endsAt: appointments.endsAt,
    status: appointments.status, // NEW: select status
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
      ne(appointments.status, "cancelled"), // NEW: skip cancelled
      sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
    )
  )
  .orderBy(asc(appointments.endsAt))
  .limit(limit);
```

### Step 3: Add backfill logic after main resolution loop

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

**Add after main loop (after line 150):**
```typescript
// Backfill orphaned cancellations (edge case recovery)
const orphaned = await db
  .select({
    id: appointments.id,
    shopId: appointments.shopId,
    status: appointments.status,
    refundedAmountCents: payments.refundedAmountCents,
    stripeRefundId: payments.stripeRefundId,
    paymentStatus: payments.status,
    policyVersionId: appointments.policyVersionId,
  })
  .from(appointments)
  .leftJoin(payments, eq(payments.appointmentId, appointments.id))
  .where(
    and(
      eq(appointments.status, "cancelled"),
      eq(appointments.financialOutcome, "unresolved")
    )
  )
  .limit(50);

let backfilled = 0;

for (const appt of orphaned) {
  try {
    const { financialOutcome, resolutionReason } = backfillCancelledOutcome({
      refundedAmountCents: appt.refundedAmountCents ?? 0,
      stripeRefundId: appt.stripeRefundId,
      paymentStatus: appt.paymentStatus ?? null,
    });

    const resolvedAt = new Date();

    const didBackfill = await db.transaction(async (tx) => {
      const updated = await tx
        .update(appointments)
        .set({
          financialOutcome,
          resolvedAt,
          resolutionReason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, appt.id),
            eq(appointments.status, "cancelled"),
            eq(appointments.financialOutcome, "unresolved")
          )
        )
        .returning({ id: appointments.id });

      if (updated.length === 0) {
        return false;
      }

      const [event] = await tx
        .insert(appointmentEvents)
        .values({
          shopId: appt.shopId,
          appointmentId: appt.id,
          type: "outcome_resolved",
          occurredAt: resolvedAt,
          meta: {
            policyVersionId: appt.policyVersionId ?? null,
            financialOutcome,
            resolutionReason,
            backfilled: true, // Mark as backfill
          },
        })
        .onConflictDoNothing()
        .returning({ id: appointmentEvents.id });

      if (event?.id) {
        await tx
          .update(appointments)
          .set({ lastEventId: event.id, updatedAt: new Date() })
          .where(eq(appointments.id, appt.id));
      }

      return true;
    });

    if (didBackfill) {
      backfilled += 1;
    }
  } catch (error) {
    errors.push(
      `Failed to backfill ${appt.id}: ${(error as Error).message ?? "Unknown error"}`
    );
  }
}
```

**Update return value (line 152):**
```typescript
return Response.json({
  total: candidates.length,
  resolved,
  skipped,
  backfilled, // NEW
  errors,
});
```

### Step 4: Update response type documentation

**Add JSDoc comment to POST handler:**
```typescript
/**
 * Resolve financial outcomes for ended appointments.
 *
 * Response:
 * - total: number of candidates found
 * - resolved: number successfully resolved
 * - skipped: number skipped (already resolved concurrently)
 * - backfilled: number of cancelled appointments with missing outcomes that were backfilled
 * - errors: array of error messages
 */
export async function POST(req: Request) {
  // ... existing code
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

**File:** `src/lib/outcomes.test.ts`

**New test cases:**

```typescript
describe("backfillCancelledOutcome", () => {
  it("returns refunded when stripe refund exists", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 2000,
      stripeRefundId: "re_123abc",
      paymentStatus: "succeeded",
    });
    expect(result).toEqual({
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    });
  });

  it("returns refunded when refunded amount > 0 even without refund ID", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 2000,
      stripeRefundId: null,
      paymentStatus: "succeeded",
    });
    expect(result).toEqual({
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    });
  });

  it("returns settled when payment succeeded but no refund", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: "succeeded",
    });
    expect(result).toEqual({
      financialOutcome: "settled",
      resolutionReason: "cancelled_no_refund_after_cutoff",
    });
  });

  it("returns voided when payment not succeeded", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: "failed",
    });
    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "cancelled_no_payment_captured",
    });
  });

  it("returns voided when no payment exists", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: null,
    });
    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "cancelled_no_payment_captured",
    });
  });
});
```

**Test execution:**
```bash
pnpm test src/lib/outcomes.test.ts
```

### Integration Tests (Resolver endpoint)

**File:** `src/app/api/jobs/resolve-outcomes/route.test.ts` (new)

**Test cases:**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { POST } from "./route";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    // ... mock other methods
  },
}));

describe("POST /api/jobs/resolve-outcomes", () => {
  const mockRequest = (cronSecret: string = "test-secret") =>
    new Request("http://localhost:3000/api/jobs/resolve-outcomes", {
      method: "POST",
      headers: {
        "x-cron-secret": cronSecret,
      },
    });

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 401 when cron secret is invalid", async () => {
    const response = await POST(mockRequest("wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("skips cancelled appointments in main query", async () => {
    // Mock advisory lock success
    vi.mocked(db.execute).mockResolvedValueOnce([{ locked: true, pid: 123 }] as any);

    // Mock select to return empty (cancelled appointments excluded)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as any);

    const response = await POST(mockRequest());
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.total).toBe(0);
  });

  it("backfills cancelled appointments with missing outcomes", async () => {
    // Setup test to verify backfill logic runs
    // (Full implementation requires mocking transaction logic)
  });
});
```

**Test execution:**
```bash
pnpm test src/app/api/jobs/resolve-outcomes/route.test.ts
```

### E2E Tests (Playwright)

**File:** `tests/e2e/outcome-resolution.spec.ts`

**New test cases to add:**

```typescript
test("resolver skips cancelled appointments", async ({ page }) => {
  // 1. Create shop and appointment
  const { shop, appointment, customer } = await setupTestData();

  // 2. Cancel the appointment (sets status=cancelled, financialOutcome=refunded)
  await cancelAppointmentViaAPI(appointment.id);

  // 3. Manually set financialOutcome back to "unresolved" (simulate edge case)
  await db
    .update(appointments)
    .set({ financialOutcome: "unresolved" })
    .where(eq(appointments.id, appointment.id));

  // 4. Run resolver
  const response = await page.request.post("/api/jobs/resolve-outcomes", {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  expect(response.ok()).toBeTruthy();

  // 5. Verify appointment still has status=cancelled and wasn't touched
  const result = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, appointment.id),
  });
  expect(result?.status).toBe("cancelled");
  expect(result?.financialOutcome).toBe("unresolved"); // Still unresolved, not overwritten

  // 6. Run resolver again - should backfill this time
  const response2 = await page.request.post("/api/jobs/resolve-outcomes", {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  const body = await response2.json();
  expect(body.backfilled).toBeGreaterThanOrEqual(1);

  // 7. Verify outcome is now correctly backfilled
  const result2 = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, appointment.id),
  });
  expect(result2?.financialOutcome).toMatch(/refunded|settled|voided/);
  expect(result2?.resolutionReason).toMatch(/^cancelled_/);

  // Cleanup
  await cleanupTestData({ shop, appointment, customer });
});

test("backfill sets correct outcome for refunded cancellation", async ({ page }) => {
  // 1. Create shop and appointment with payment
  const { shop, appointment, payment, customer } = await setupTestDataWithPayment();

  // 2. Manually create orphaned cancellation (status=cancelled, has refund, but outcome=unresolved)
  await db
    .update(appointments)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationSource: "customer",
      financialOutcome: "unresolved", // Edge case
    })
    .where(eq(appointments.id, appointment.id));

  await db
    .update(payments)
    .set({
      refundedAmountCents: 2000,
      stripeRefundId: "re_test123",
      refundedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  // 3. Run resolver - should backfill
  const response = await page.request.post("/api/jobs/resolve-outcomes", {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  const body = await response.json();
  expect(body.backfilled).toBeGreaterThanOrEqual(1);

  // 4. Verify correct backfill
  const result = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, appointment.id),
  });
  expect(result?.financialOutcome).toBe("refunded");
  expect(result?.resolutionReason).toBe("cancelled_refunded_before_cutoff");

  // Cleanup
  await cleanupTestData({ shop, appointment, payment, customer });
});

test("backfill sets settled for late cancellation with no refund", async ({ page }) => {
  // Similar to above but:
  // - status=cancelled
  // - paymentStatus=succeeded
  // - NO refund (refundedAmountCents=0, stripeRefundId=null)
  // - Expected: financialOutcome=settled, resolutionReason=cancelled_no_refund_after_cutoff
});

test("backfill sets voided for cancelled appointment with no payment", async ({ page }) => {
  // Similar to above but:
  // - status=cancelled
  // - NO payment or paymentStatus=failed
  // - Expected: financialOutcome=voided, resolutionReason=cancelled_no_payment_captured
});

test("resolver processes ended non-cancelled appointments normally", async ({ page }) => {
  // Verify existing behavior still works:
  // - Ended appointment with status=booked
  // - Should resolve to settled/voided per payment status
  // - Should NOT be affected by new cancelled logic
});
```

**Test execution:**
```bash
# Run all E2E tests
pnpm test:e2e tests/e2e/outcome-resolution.spec.ts

# Run specific test
pnpm test:e2e tests/e2e/outcome-resolution.spec.ts -g "resolver skips cancelled"
```

### Manual Testing Checklist

**Setup:**
1. ✅ Start dev server: `pnpm dev`
2. ✅ Ensure CRON_SECRET is set in `.env`
3. ✅ Create test shop and appointment

**Test Scenarios:**

**Scenario 1: Normal resolver operation (unchanged)**
- [ ] Create ended appointment with status=booked, payment succeeded
- [ ] Run resolver: `POST /api/jobs/resolve-outcomes` with cron secret
- [ ] Verify: financialOutcome=settled, resolutionReason=payment_captured

**Scenario 2: Resolver skips cancelled appointments**
- [ ] Create appointment, cancel it (sets status=cancelled, financialOutcome=refunded)
- [ ] Run resolver
- [ ] Verify: appointment outcome unchanged (still refunded)
- [ ] Verify: resolver response shows it was skipped (not in candidates list)

**Scenario 3: Backfill orphaned refunded cancellation**
- [ ] Manually create appointment with:
  - status=cancelled
  - financialOutcome=unresolved
  - payment with refundedAmountCents>0 and stripeRefundId
- [ ] Run resolver
- [ ] Verify: financialOutcome=refunded, resolutionReason=cancelled_refunded_before_cutoff
- [ ] Verify: resolver response shows backfilled=1

**Scenario 4: Backfill orphaned settled cancellation**
- [ ] Manually create appointment with:
  - status=cancelled
  - financialOutcome=unresolved
  - payment succeeded but no refund
- [ ] Run resolver
- [ ] Verify: financialOutcome=settled, resolutionReason=cancelled_no_refund_after_cutoff

**Scenario 5: Backfill orphaned voided cancellation**
- [ ] Manually create appointment with:
  - status=cancelled
  - financialOutcome=unresolved
  - no payment or payment failed
- [ ] Run resolver
- [ ] Verify: financialOutcome=voided, resolutionReason=cancelled_no_payment_captured

---

## Acceptance Criteria

### Functional Requirements

- [ ] **R10 Satisfied:** Resolver never overwrites cancellation outcomes
  - Cancelled appointments with settled/refunded/voided outcomes remain unchanged
  - Query explicitly excludes `status=cancelled` from candidates

- [ ] **N26 Implemented:** Skip cancelled appointments check
  - Main resolver query uses `ne(appointments.status, "cancelled")`
  - No cancelled appointments processed in main loop

- [ ] **N27 Implemented:** Backfill logic for edge cases
  - Separate query finds `status=cancelled AND financialOutcome=unresolved`
  - Backfill logic infers outcome from refund/payment state
  - Backfill events marked with `backfilled: true` in meta

### Code Quality

- [ ] All new code passes `pnpm lint`
- [ ] All new code passes `pnpm typecheck`
- [ ] Unit tests achieve 100% coverage for new functions
- [ ] E2E tests cover all backfill scenarios

### Integration

- [ ] Resolver continues to process normal appointments (regression check)
- [ ] Backfill runs without blocking normal resolution
- [ ] Advisory lock prevents concurrent resolver runs (unchanged)
- [ ] Response includes `backfilled` count

### Performance

- [ ] Backfill query limited to 50 records per run
- [ ] No N+1 queries introduced
- [ ] Resolver completes within 30 seconds for 200 appointments + 50 backfills

---

## Implementation Steps (Execution Order)

### Phase 1: Core Logic (30 min)

1. **Update `src/lib/outcomes.ts`:**
   - [ ] Add new resolution reason types
   - [ ] Implement `backfillCancelledOutcome` function
   - [ ] Write unit tests
   - [ ] Run: `pnpm test src/lib/outcomes.test.ts`

### Phase 2: Resolver Enhancement (45 min)

2. **Update `src/app/api/jobs/resolve-outcomes/route.ts`:**
   - [ ] Add `ne` import from drizzle-orm
   - [ ] Add `status` to select fields
   - [ ] Add `ne(appointments.status, "cancelled")` to where clause
   - [ ] Add backfill query and loop after main resolution
   - [ ] Update response to include `backfilled` count
   - [ ] Add JSDoc comment

### Phase 3: Testing (2 hours)

3. **Unit tests:**
   - [ ] Run existing tests: `pnpm test`
   - [ ] Verify all pass

4. **E2E tests:**
   - [ ] Add new test cases to `tests/e2e/outcome-resolution.spec.ts`
   - [ ] Run: `pnpm test:e2e tests/e2e/outcome-resolution.spec.ts`
   - [ ] Fix any failures

5. **Manual testing:**
   - [ ] Follow manual testing checklist above
   - [ ] Document any issues found

### Phase 4: Verification (15 min)

6. **Final checks:**
   - [ ] Run: `pnpm lint && pnpm typecheck`
   - [ ] Run: `pnpm test`
   - [ ] Run: `pnpm test:e2e`
   - [ ] Verify all acceptance criteria met

---

## Risk Assessment

### High Risk
- **Race condition between cancellation and resolver:** Mitigated by explicit status check in query
- **Incorrect backfill logic:** Mitigated by comprehensive unit tests

### Medium Risk
- **Performance impact of backfill query:** Mitigated by 50-record limit and separate query
- **Missing edge cases:** Mitigated by E2E tests covering multiple scenarios

### Low Risk
- **Breaking existing resolver behavior:** Mitigated by regression tests and defense-in-depth approach

---

## Rollback Plan

If issues arise in production:

1. **Immediate:** Revert resolver changes via git
2. **Temporary:** Disable backfill by commenting out backfill loop
3. **Investigation:** Check appointment_events for backfill markers
4. **Fix forward:** Address specific edge case and redeploy

---

## Success Metrics

After V5 deployment:

- [ ] Zero cancelled appointments processed by resolver (monitor logs)
- [ ] Zero cancellation outcomes overwritten (audit appointment_events)
- [ ] Backfill count < 5 per week (indicates clean cancellation implementation)
- [ ] Resolver job latency unchanged (<30s for 200 appointments)

---

## Notes

- **Idempotency:** Backfill logic is idempotent (checks `financialOutcome=unresolved` in WHERE)
- **Audit trail:** All backfills create `outcome_resolved` event with `backfilled: true`
- **Defense in depth:** Multiple layers of protection (query filter, update WHERE clause, status check)
- **Zero downtime:** Changes are backward compatible with existing appointments
