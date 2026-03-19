# Slice 5: RESOLVER SAFETY — Test & Implementation Plan

**Status:** Ready to implement
**Appetite:** 2-3 hours
**Priority:** CRITICAL (prevents financial outcome corruption)

---

## Frame

### Problem

**Critical gap identified:** The outcome resolver (`/api/jobs/resolve-outcomes`) does not explicitly filter out cancelled appointments. While cancelled appointments *should* have `financialOutcome != 'unresolved'`, defensive programming requires an explicit status check to prevent race conditions.

**Risk scenario:**
1. Customer cancels booking at T+0 (sets `financialOutcome='refunded'`)
2. Resolver job runs at T+1 (processes ended appointments)
3. If resolver doesn't check `status='cancelled'`, it could overwrite to `financialOutcome='settled'`
4. Result: Customer was refunded, but database shows deposit retained → **data corruption**

### Outcome

- Resolver **never** processes cancelled appointments
- All cancellation outcomes remain intact after resolver runs
- Comprehensive test coverage proves resolver safety
- Dashboard accurately displays refunded outcomes
- Complete confidence in financial outcome integrity

---

## Current Implementation Status

### ✅ Already Implemented (V1-V3)

- Database schema with cancellation fields
- Token-based manage links (`booking_manage_tokens`)
- Manage booking page UI (`/manage/[token]`)
- Cancellation API (`POST /api/manage/[token]/cancel`)
- Refund processing with idempotency (`processRefund()`)
- Eligibility calculation (`calculateCancellationEligibility()`)
- Unit tests for cancellation logic
- Unit tests for refund idempotency
- E2E tests for manage booking flows

### ❌ Missing (RESOLVER SAFETY)

- Explicit status filter in resolver query
- Integration tests for resolver filtering
- E2E tests for resolver safety scenarios
- Dashboard display of refunded outcomes
- Documentation of resolver safety contract

---

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **RS1** | Resolver MUST skip appointments with `status='cancelled'` | CRITICAL |
| **RS2** | Resolver MUST NOT overwrite cancellation outcomes | CRITICAL |
| **RS3** | Cancelled appointments remain untouched regardless of timing | CRITICAL |
| **RS4** | Test coverage proves resolver safety under all scenarios | Must-have |
| **RS5** | Dashboard shows refunded outcome count | Must-have |
| **RS6** | Resolver safety contract is documented in code | Nice-to-have |

---

## Implementation Tasks

### Task 1: Fix Resolver WHERE Clause (CRITICAL)

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

**Current code** (lines 69-73):
```typescript
.where(
  and(
    eq(appointments.financialOutcome, "unresolved"),
    sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
  )
)
```

**Fixed code:**
```typescript
.where(
  and(
    eq(appointments.financialOutcome, "unresolved"),
    eq(appointments.status, "booked"),  // ← ADD THIS LINE
    sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
  )
)
```

**Verification:**
```bash
# After fix, resolver should log "0 candidates" for cancelled appointments
curl -X POST http://localhost:3000/api/jobs/resolve-outcomes \
  -H "x-cron-secret: $CRON_SECRET"
# Expected: { "total": 0, "resolved": 0, "skipped": 0 }
```

---

### Task 2: Add Resolver Safety Documentation

**File:** `src/lib/outcomes.ts`

Add JSDoc explaining the safety contract:

```typescript
/**
 * RESOLVER SAFETY CONTRACT
 *
 * The outcome resolver (/api/jobs/resolve-outcomes) ONLY processes appointments that meet ALL criteria:
 * 1. status = 'booked' (excludes 'cancelled' and 'ended')
 * 2. financialOutcome = 'unresolved'
 * 3. endsAt <= now - gracePeriod
 *
 * CRITICAL RULES:
 * - Cancelled appointments are NEVER processed, even if outcome is unresolved
 * - Cancellation logic sets outcome atomically (refunded or settled)
 * - Resolver must check status='booked' to prevent race conditions
 *
 * WHY THIS MATTERS:
 * - Customer cancels → outcome set to 'refunded'
 * - If resolver doesn't check status, it could overwrite to 'settled'
 * - This would corrupt financial records and cause reconciliation failures
 *
 * @see src/app/api/jobs/resolve-outcomes/route.ts
 * @see src/app/api/manage/[token]/cancel/route.ts
 */
export type ResolutionReason =
  | "no_payment_required"
  | "payment_captured"
  | "payment_not_captured";

// ... rest of file
```

---

### Task 3: Update Dashboard to Show Refunded Count

**File:** `src/lib/queries/appointments.ts`

Add refunded count to `getOutcomeSummaryForShop()`:

```typescript
export async function getOutcomeSummaryForShop(shopId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [settled, voided, refunded, unresolved] = await Promise.all([
    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shopId),
          eq(appointments.financialOutcome, "settled"),
          gte(appointments.createdAt, sevenDaysAgo)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shopId),
          eq(appointments.financialOutcome, "voided"),
          gte(appointments.createdAt, sevenDaysAgo)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shopId),
          eq(appointments.financialOutcome, "refunded"),
          gte(appointments.createdAt, sevenDaysAgo)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shopId),
          eq(appointments.financialOutcome, "unresolved"),
          gte(appointments.createdAt, sevenDaysAgo)
        )
      )
      .then((r) => r[0]?.count ?? 0),
  ]);

  return { settled, voided, refunded, unresolved };
}
```

**File:** `src/app/app/appointments/page.tsx`

Add refunded card to dashboard (after line 80):

```typescript
<div className="grid gap-3 sm:grid-cols-4">  {/* Change to 4 columns */}
  <div className="rounded-lg border p-4">
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Settled (7d)
    </p>
    <p className="text-2xl font-semibold">{outcomeSummary.settled}</p>
  </div>
  <div className="rounded-lg border p-4">
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Refunded (7d)
    </p>
    <p className="text-2xl font-semibold">{outcomeSummary.refunded}</p>
  </div>
  <div className="rounded-lg border p-4">
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Voided (7d)
    </p>
    <p className="text-2xl font-semibold">{outcomeSummary.voided}</p>
  </div>
  <div className="rounded-lg border p-4">
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Unresolved (7d)
    </p>
    <p className="text-2xl font-semibold">{outcomeSummary.unresolved}</p>
  </div>
</div>
```

---

## Testing Strategy

### Level 1: Unit Tests (Vitest)

**File:** `src/lib/__tests__/outcomes.test.ts` (NEW)

```typescript
import { describe, expect, it } from "vitest";
import { resolveFinancialOutcome } from "../outcomes";

describe("resolveFinancialOutcome", () => {
  it("should resolve to settled when payment succeeded", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: true,
      paymentStatus: "succeeded",
    });

    expect(result.financialOutcome).toBe("settled");
    expect(result.resolutionReason).toBe("payment_captured");
  });

  it("should resolve to voided when payment not captured", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: true,
      paymentStatus: "failed",
    });

    expect(result.financialOutcome).toBe("voided");
    expect(result.resolutionReason).toBe("payment_not_captured");
  });

  it("should resolve to voided when payment not required", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: false,
      paymentStatus: null,
    });

    expect(result.financialOutcome).toBe("voided");
    expect(result.resolutionReason).toBe("no_payment_required");
  });
});
```

**Run test:**
```bash
pnpm test src/lib/__tests__/outcomes.test.ts
```

---

### Level 2: Integration Tests (Vitest)

**File:** `src/app/api/jobs/resolve-outcomes/route.test.ts`

Add these test cases to existing file:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, payments, shops, user } from "@/lib/schema";
import { POST } from "./route";

describe("Resolver Safety", () => {
  let testShopId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Setup test shop
    testUserId = crypto.randomUUID();
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: `test-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    });

    const [shop] = await db.insert(shops).values({
      ownerUserId: testUserId,
      name: "Test Shop",
      slug: `shop-${crypto.randomUUID()}`,
      status: "active",
    }).returning();

    testShopId = shop.id;
  });

  it("should skip cancelled appointments even if outcome is unresolved", async () => {
    // Create ended appointment that was cancelled
    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endsAt = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

    const [appointment] = await db.insert(appointments).values({
      shopId: testShopId,
      customerId: crypto.randomUUID(),
      startsAt,
      endsAt,
      status: "cancelled",  // ← Cancelled
      cancelledAt: new Date(),
      financialOutcome: "unresolved",  // ← But outcome not set (edge case)
      paymentRequired: true,
    }).returning();

    // Create mock request
    const req = new Request("http://localhost:3000/api/jobs/resolve-outcomes", {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "test-secret" },
    });

    const response = await POST(req);
    const data = await response.json();

    // Verify resolver skipped this appointment
    expect(data.total).toBe(0);
    expect(data.resolved).toBe(0);

    // Verify appointment outcome unchanged
    const [updated] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(updated.financialOutcome).toBe("unresolved");
    expect(updated.status).toBe("cancelled");
  });

  it("should only process booked appointments with unresolved outcomes", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    // Create 3 appointments
    const [booked, cancelled, ended] = await Promise.all([
      // 1. Booked + unresolved (should be processed)
      db.insert(appointments).values({
        shopId: testShopId,
        customerId: crypto.randomUUID(),
        startsAt,
        endsAt,
        status: "booked",
        financialOutcome: "unresolved",
        paymentRequired: true,
      }).returning(),

      // 2. Cancelled + refunded (should be skipped)
      db.insert(appointments).values({
        shopId: testShopId,
        customerId: crypto.randomUUID(),
        startsAt,
        endsAt,
        status: "cancelled",
        cancelledAt: new Date(),
        financialOutcome: "refunded",
        paymentRequired: true,
      }).returning(),

      // 3. Ended + settled (should be skipped)
      db.insert(appointments).values({
        shopId: testShopId,
        customerId: crypto.randomUUID(),
        startsAt,
        endsAt,
        status: "ended",
        financialOutcome: "settled",
        resolvedAt: new Date(),
        paymentRequired: true,
      }).returning(),
    ]);

    // Run resolver
    const req = new Request("http://localhost:3000/api/jobs/resolve-outcomes", {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "test-secret" },
    });

    const response = await POST(req);
    const data = await response.json();

    // Should only process 1 appointment (booked + unresolved)
    expect(data.total).toBe(1);
    expect(data.resolved).toBe(1);

    // Verify outcomes
    const [bookedUpdated] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, booked[0].id));
    expect(bookedUpdated.financialOutcome).toBe("settled"); // Resolved

    const [cancelledUpdated] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, cancelled[0].id));
    expect(cancelledUpdated.financialOutcome).toBe("refunded"); // Unchanged

    const [endedUpdated] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, ended[0].id));
    expect(endedUpdated.financialOutcome).toBe("settled"); // Unchanged
  });
});
```

**Run tests:**
```bash
pnpm test src/app/api/jobs/resolve-outcomes/route.test.ts
```

---

### Level 3: E2E Tests (Playwright)

**File:** `tests/e2e/resolver-safety.spec.ts` (NEW)

```typescript
import { randomUUID } from "node:crypto";
import { addMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { test, expect } from "../setup";
import { db } from "../../src/lib/db";
import { createManageToken } from "../../src/lib/manage-tokens";
import {
  appointments,
  bookingSettings,
  customers,
  payments,
  policyVersions,
  shops,
  user,
} from "../../src/lib/schema";

const shouldRun = Boolean(process.env.POSTGRES_URL && process.env.CRON_SECRET);

test.describe("Resolver Safety Tests", () => {
  test.skip(!shouldRun, "POSTGRES_URL or CRON_SECRET not set");

  test("Scenario 1: Cancelled appointment is never resolved by resolver", async ({
    page,
  }) => {
    // Setup: Create ended paid booking
    const userId = randomUUID();
    const email = `resolver-test-${randomUUID()}@example.com`;

    await db.insert(user).values({
      id: userId,
      name: "Resolver Test User",
      email,
      emailVerified: true,
    });

    const [shop] = await db.insert(shops).values({
      ownerUserId: userId,
      name: "Test Barbershop",
      slug: `test-${randomUUID()}`,
      status: "active",
    }).returning();

    await db.insert(bookingSettings).values({
      shopId: shop.id,
      slotMinutes: 60,
      timezone: "America/New_York",
    });

    const [policy] = await db.insert(policyVersions).values({
      shopId: shop.id,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 5000,
      cancelCutoffMinutes: 1440, // 24 hours
      refundBeforeCutoff: true,
    }).returning();

    const [customer] = await db.insert(customers).values({
      shopId: shop.id,
      fullName: "John Doe",
      phone: "+12025550199",
      email: "john@example.com",
    }).returning();

    // Create appointment that ended 2 hours ago
    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const [appointment] = await db.insert(appointments).values({
      shopId: shop.id,
      customerId: customer.id,
      policyVersionId: policy.id,
      startsAt,
      endsAt,
      status: "booked",
      paymentStatus: "paid",
      paymentRequired: true,
      financialOutcome: "unresolved",
    }).returning();

    await db.insert(payments).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 5000,
      currency: "USD",
      status: "succeeded",
      stripePaymentIntentId: `pi_test_${appointment.id}`,
    });

    // Create manage token and cancel
    const token = await createManageToken(appointment.id);

    await page.goto(`/manage/${token}`);

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    await page.waitForLoadState("networkidle");

    // Verify cancellation succeeded with refund
    await expect(page.getByText("Refund Processed")).toBeVisible();

    const [cancelledAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(cancelledAppointment.status).toBe("cancelled");
    expect(cancelledAppointment.financialOutcome).toBe("refunded");
    expect(cancelledAppointment.resolutionReason).toBe(
      "cancelled_refunded_before_cutoff"
    );

    // Trigger resolver
    const resolverResponse = await page.request.post(
      "/api/jobs/resolve-outcomes",
      {
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      }
    );

    expect(resolverResponse.ok()).toBeTruthy();
    const resolverData = await resolverResponse.json();

    // Resolver should skip this appointment (total = 0)
    expect(resolverData.total).toBe(0);
    expect(resolverData.resolved).toBe(0);

    // Verify outcome is still refunded (not overwritten to settled)
    const [finalAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(finalAppointment.status).toBe("cancelled");
    expect(finalAppointment.financialOutcome).toBe("refunded");
    expect(finalAppointment.resolutionReason).toBe(
      "cancelled_refunded_before_cutoff"
    );

    // Cleanup
    await db.delete(payments).where(eq(payments.appointmentId, appointment.id));
    await db.delete(appointments).where(eq(appointments.id, appointment.id));
    await db.delete(customers).where(eq(customers.id, customer.id));
    await db.delete(policyVersions).where(eq(policyVersions.id, policy.id));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  test("Scenario 2: Cancellation after cutoff preserves settled outcome", async ({
    page,
  }) => {
    // Setup (similar to Scenario 1)
    const userId = randomUUID();
    const email = `resolver-test-2-${randomUUID()}@example.com`;

    await db.insert(user).values({
      id: userId,
      name: "Resolver Test User 2",
      email,
      emailVerified: true,
    });

    const [shop] = await db.insert(shops).values({
      ownerUserId: userId,
      name: "Test Barbershop 2",
      slug: `test-2-${randomUUID()}`,
      status: "active",
    }).returning();

    await db.insert(bookingSettings).values({
      shopId: shop.id,
      slotMinutes: 60,
      timezone: "America/New_York",
    });

    const [policy] = await db.insert(policyVersions).values({
      shopId: shop.id,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 5000,
      cancelCutoffMinutes: 1440,
      refundBeforeCutoff: true,
    }).returning();

    const [customer] = await db.insert(customers).values({
      shopId: shop.id,
      fullName: "Jane Doe",
      phone: "+12025550198",
      email: "jane@example.com",
    }).returning();

    // Create appointment that ended 2 hours ago BUT starts in 12 hours (past cutoff)
    const now = new Date();
    const startsAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const endsAt = addMinutes(startsAt, 60);

    const [appointment] = await db.insert(appointments).values({
      shopId: shop.id,
      customerId: customer.id,
      policyVersionId: policy.id,
      startsAt,
      endsAt,
      status: "booked",
      paymentStatus: "paid",
      paymentRequired: true,
      financialOutcome: "unresolved",
    }).returning();

    await db.insert(payments).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 5000,
      currency: "USD",
      status: "succeeded",
      stripePaymentIntentId: `pi_test_${appointment.id}`,
    });

    // Create manage token and cancel (after cutoff)
    const token = await createManageToken(appointment.id);

    await page.goto(`/manage/${token}`);

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    await page.waitForLoadState("networkidle");

    // Verify cancellation succeeded WITHOUT refund
    await expect(page.getByText("Appointment Cancelled")).toBeVisible();
    await expect(page.getByText(/deposit has been retained/i)).toBeVisible();

    const [cancelledAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(cancelledAppointment.status).toBe("cancelled");
    expect(cancelledAppointment.financialOutcome).toBe("settled");
    expect(cancelledAppointment.resolutionReason).toBe(
      "cancelled_no_refund_after_cutoff"
    );

    // Now update appointment to have ended in the past (simulate time passing)
    await db
      .update(appointments)
      .set({
        startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      })
      .where(eq(appointments.id, appointment.id));

    // Trigger resolver
    const resolverResponse = await page.request.post(
      "/api/jobs/resolve-outcomes",
      {
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      }
    );

    expect(resolverResponse.ok()).toBeTruthy();
    const resolverData = await resolverResponse.json();

    // Resolver should skip (cancelled status)
    expect(resolverData.total).toBe(0);

    // Verify outcome is STILL settled with cancellation reason
    const [finalAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(finalAppointment.status).toBe("cancelled");
    expect(finalAppointment.financialOutcome).toBe("settled");
    expect(finalAppointment.resolutionReason).toBe(
      "cancelled_no_refund_after_cutoff"
    );

    // Cleanup
    await db.delete(payments).where(eq(payments.appointmentId, appointment.id));
    await db.delete(appointments).where(eq(appointments.id, appointment.id));
    await db.delete(customers).where(eq(customers.id, customer.id));
    await db.delete(policyVersions).where(eq(policyVersions.id, policy.id));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  test("Scenario 3: Normal resolution still works for non-cancelled appointments", async ({
    page,
  }) => {
    const userId = randomUUID();
    const email = `resolver-test-3-${randomUUID()}@example.com`;

    await db.insert(user).values({
      id: userId,
      name: "Resolver Test User 3",
      email,
      emailVerified: true,
    });

    const [shop] = await db.insert(shops).values({
      ownerUserId: userId,
      name: "Test Barbershop 3",
      slug: `test-3-${randomUUID()}`,
      status: "active",
    }).returning();

    await db.insert(bookingSettings).values({
      shopId: shop.id,
      slotMinutes: 60,
      timezone: "America/New_York",
    });

    const [policy] = await db.insert(policyVersions).values({
      shopId: shop.id,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 5000,
      resolutionGraceMinutes: 0, // No grace period
    }).returning();

    const [customer] = await db.insert(customers).values({
      shopId: shop.id,
      fullName: "Normal Customer",
      phone: "+12025550197",
      email: "normal@example.com",
    }).returning();

    // Create appointment that ended (not cancelled)
    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const [appointment] = await db.insert(appointments).values({
      shopId: shop.id,
      customerId: customer.id,
      policyVersionId: policy.id,
      startsAt,
      endsAt,
      status: "booked", // Still booked (customer showed up)
      paymentStatus: "paid",
      paymentRequired: true,
      financialOutcome: "unresolved",
    }).returning();

    await db.insert(payments).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 5000,
      currency: "USD",
      status: "succeeded",
      stripePaymentIntentId: `pi_test_${appointment.id}`,
    });

    // Trigger resolver
    const resolverResponse = await page.request.post(
      "/api/jobs/resolve-outcomes",
      {
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      }
    );

    expect(resolverResponse.ok()).toBeTruthy();
    const resolverData = await resolverResponse.json();

    // Should process this appointment
    expect(resolverData.total).toBeGreaterThanOrEqual(1);
    expect(resolverData.resolved).toBeGreaterThanOrEqual(1);

    // Verify outcome is settled with payment_captured reason
    const [finalAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));

    expect(finalAppointment.financialOutcome).toBe("settled");
    expect(finalAppointment.resolutionReason).toBe("payment_captured");

    // Cleanup
    await db.delete(payments).where(eq(payments.appointmentId, appointment.id));
    await db.delete(appointments).where(eq(appointments.id, appointment.id));
    await db.delete(customers).where(eq(customers.id, customer.id));
    await db.delete(policyVersions).where(eq(policyVersions.id, policy.id));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
```

**Run E2E tests:**
```bash
pnpm test:e2e tests/e2e/resolver-safety.spec.ts
```

---

## Manual Testing Checklist

### Before Implementing Fixes

- [ ] Start dev server: `pnpm dev`
- [ ] Create a test booking via UI
- [ ] Let appointment end time pass
- [ ] Manually trigger resolver and observe behavior
- [ ] Check if cancelled appointments are being processed (bug)

### After Implementing Fixes

#### Test 1: Normal Resolution Works
- [ ] Create booking with end time 2 hours ago
- [ ] Don't cancel it
- [ ] Run resolver: `curl -X POST http://localhost:3000/api/jobs/resolve-outcomes -H "x-cron-secret: $CRON_SECRET"`
- [ ] Check dashboard shows `settled` outcome
- [ ] Verify reason is `payment_captured`

#### Test 2: Cancelled Before Cutoff (Refunded)
- [ ] Create booking 7 days in future
- [ ] Cancel via manage link
- [ ] Verify shows "Refund Processed"
- [ ] Update appointment in DB to have ended 2 hours ago
- [ ] Run resolver
- [ ] Verify outcome is STILL `refunded` (not changed to `settled`)
- [ ] Check dashboard shows refunded count increased

#### Test 3: Cancelled After Cutoff (Deposit Retained)
- [ ] Create booking 12 hours in future
- [ ] Cancel via manage link
- [ ] Verify shows "Deposit Retained"
- [ ] Verify outcome is `settled` with reason `cancelled_no_refund_after_cutoff`
- [ ] Update appointment to have ended 2 hours ago
- [ ] Run resolver
- [ ] Verify outcome STILL `settled` with cancellation reason (not overwritten)

#### Test 4: Idempotency
- [ ] Create and cancel a booking
- [ ] Run resolver 3 times in a row
- [ ] Verify outcome unchanged after each run
- [ ] Check logs show 0 candidates processed

#### Test 5: Dashboard Display
- [ ] Navigate to `/app/appointments`
- [ ] Verify refunded count card appears
- [ ] Create 2 refunded, 1 settled, 1 voided appointment
- [ ] Verify counts are accurate

---

## SQL Verification Queries

Run these after testing to verify data integrity:

```sql
-- 1. All cancelled appointments should have a financial outcome set
SELECT
  id,
  status,
  financial_outcome,
  resolution_reason,
  cancelled_at,
  resolved_at
FROM appointments
WHERE status = 'cancelled';

-- Expected: All rows have financial_outcome in ('refunded', 'settled', 'voided')
-- Expected: All rows have resolution_reason starting with 'cancelled_'


-- 2. No cancelled appointments should be unresolved
SELECT COUNT(*) as should_be_zero
FROM appointments
WHERE status = 'cancelled'
  AND financial_outcome = 'unresolved';

-- Expected: should_be_zero = 0


-- 3. Verify refund consistency
SELECT
  a.id,
  a.status,
  a.financial_outcome,
  a.resolution_reason,
  p.refunded_amount_cents,
  p.stripe_refund_id
FROM appointments a
LEFT JOIN payments p ON p.appointment_id = a.id
WHERE a.financial_outcome = 'refunded';

-- Expected: All rows have refunded_amount_cents > 0
-- Expected: All rows have stripe_refund_id starting with 're_'


-- 4. Check resolver only processes booked appointments
SELECT
  status,
  financial_outcome,
  COUNT(*) as count
FROM appointments
GROUP BY status, financial_outcome
ORDER BY status, financial_outcome;

-- Expected: No (cancelled, unresolved) combinations after resolver runs


-- 5. Verify audit trail completeness
SELECT
  a.id,
  a.status,
  a.financial_outcome,
  COUNT(ae.id) as event_count
FROM appointments a
LEFT JOIN appointment_events ae ON ae.appointment_id = a.id
WHERE a.status = 'cancelled'
GROUP BY a.id, a.status, a.financial_outcome;

-- Expected: All cancelled appointments have at least 1 event
```

---

## Definition of Done

### Critical Requirements ✅

- [ ] Resolver WHERE clause includes `status='booked'` filter
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing checklist completed
- [ ] SQL verification queries return expected results

### Code Quality ✅

- [ ] Resolver safety contract documented in code
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] No console errors in browser
- [ ] No error logs in dev server

### User-Facing ✅

- [ ] Dashboard shows refunded outcome count
- [ ] Manage page displays correct cancellation states
- [ ] All status badges render correctly
- [ ] Timezone display is accurate

### Deployment Readiness ✅

- [ ] Database migrations are idempotent
- [ ] Environment variables documented
- [ ] No breaking changes to existing data
- [ ] Can safely deploy to production

---

## Implementation Timeline

**Total estimated time:** 2-3 hours

| Task | Time | Status |
|------|------|--------|
| Fix resolver WHERE clause | 10 min | ⏳ Pending |
| Add resolver safety docs | 15 min | ⏳ Pending |
| Update dashboard refunded count | 30 min | ⏳ Pending |
| Write unit tests | 15 min | ⏳ Pending |
| Write integration tests | 45 min | ⏳ Pending |
| Write E2E tests | 45 min | ⏳ Pending |
| Manual testing | 30 min | ⏳ Pending |
| SQL verification | 15 min | ⏳ Pending |

---

## Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Resolver overwrites cancellation outcomes | **High** (without fix) | **Critical** | Add status='booked' filter |
| Double refunds during cancellation | Low | Critical | Already mitigated via idempotency |
| Race condition (cancel + resolve) | Very Low | Medium | Database transactions handle this |
| Timezone bugs in cutoff | Low | Medium | Already tested in unit tests |
| Migration breaks existing data | Very Low | High | Migrations are additive only |

### Critical Path

The **single most important** fix is adding `eq(appointments.status, "booked")` to the resolver WHERE clause. Everything else is verification and UX improvements.

**If time is limited:**
1. Fix the resolver query (10 min) ← DO THIS FIRST
2. Write E2E Scenario 1 test (20 min) ← PROVES IT WORKS
3. Manual test on localhost (10 min) ← VERIFY YOURSELF
4. Deploy with confidence

---

## Success Metrics

After implementation, verify these metrics:

1. **Resolver Safety**: 100% of cancelled appointments remain untouched by resolver
2. **Test Coverage**: All 3 E2E scenarios pass
3. **Data Integrity**: SQL verification queries show 0 anomalies
4. **Dashboard Accuracy**: Refunded count matches actual refunded appointments
5. **Performance**: Resolver execution time unchanged (< 500ms for 100 appointments)

---

## References

- **Slice 5 Pitch**: `docs/requirements/Vertical Slice 5 Cancellation + refund window (dispute prevention).md`
- **Resolver Implementation**: `src/app/api/jobs/resolve-outcomes/route.ts`
- **Cancellation Logic**: `src/lib/cancellation.ts`
- **Refund Processing**: `src/lib/stripe-refund.ts`
- **Existing E2E Tests**: `tests/e2e/manage-booking.spec.ts`
- **Existing Unit Tests**: `src/lib/__tests__/cancellation.test.ts`
