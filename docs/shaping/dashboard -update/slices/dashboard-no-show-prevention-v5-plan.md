# V5: Polish & Optimization

Production hardening: performance optimizations, safety guards, and comprehensive testing.

---

## What Gets Built

After V1-V4 ship MVP functionality, V5 adds production-readiness:

1. **Performance Optimizations**
   - Consolidate overlapping queries (3 → 1 database query)
   - Fix N+1 query in getTierDistribution (2 → 1 query)
   - Add 3 missing database indexes
   - Implement Redis caching (85% cache hit rate)
   - Add pagination to cron jobs (prevent timeouts)

2. **Architecture & Safety**
   - Idempotency checks in cron jobs (prevent duplicate SMS)
   - Distributed locks for race condition prevention
   - Zod validation in all API routes
   - Shared TypeScript types (DRY principle)
   - Environment variable validation at startup

3. **Comprehensive Testing**
   - 15+ new unit test cases (edge cases, null handling, timezones)
   - 8+ E2E error scenario tests (network errors, permission denied)
   - 5+ integration tests for concurrency

4. **Monitoring & Operations**
   - Structured logging with correlation IDs
   - Error tracking integration
   - Performance benchmarking

---

## Demo

**Before V5:**
- Dashboard load time: ~800ms
- getTierDistribution query: 50ms (2 queries)
- Potential duplicate SMS from cron jobs
- Silent errors (generic 500 responses)
- Test coverage: 60%

**After V5:**
- Dashboard load time: ~300ms (63% faster) ✨
- getTierDistribution query: 5ms (1 query, 90% faster) ✨
- Zero duplicate SMS (idempotency + distributed locks) ✨
- Clear error messages with user guidance ✨
- Test coverage: 90% ✨

---

## Implementation Steps

### Phase 1: Critical Fixes (Week 1)

#### Step 1: Fix N+1 Query in getTierDistribution

**File:** `src/lib/queries/dashboard.ts`

**Current code (lines 185-215):**
```typescript
export async function getTierDistribution(shopId: string) {
  const shopCustomers = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.shopId, shopId))
    .groupBy(appointments.customerId);

  const customerIds = shopCustomers.map((c) => c.customerId);

  const results = await db
    .select({
      tier: customers.tier,
      count: sql<number>`count(*)`,
    })
    .from(customers)
    .where(sql`${customers.id} IN ${customerIds}`)
    .groupBy(customers.tier);

  // ... return distribution
}
```

**Replace with:**
```typescript
export async function getTierDistribution(shopId: string) {
  const results = await db
    .select({
      tier: customers.tier,
      count: sql<number>`count(DISTINCT ${customers.id})`,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(eq(appointments.shopId, shopId))
    .groupBy(customers.tier);

  const distribution = {
    top: results.find((r) => r.tier === "top")?.count || 0,
    neutral: results.find((r) => r.tier === "neutral" || r.tier === null)?.count || 0,
    risk: results.find((r) => r.tier === "risk")?.count || 0,
  };

  return distribution;
}
```

**Test:**
```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
```

**Benchmark:**
- Before: 50ms (2 queries)
- After: 5ms (1 query)
- **Improvement: 90% faster**

---

#### Step 2: Consolidate Overlapping Dashboard Queries

**File:** `src/app/app/dashboard/page.tsx`

**Current code (lines 335-355):**
```typescript
const [
  highRiskAppointments,
  totalUpcoming,
  highRiskCount,
  depositsAtRisk,
  monthlyStats,
  tierDistribution,
  allAppointments,
] = await Promise.all([
  getHighRiskAppointments(shop.id, periodHours),
  getTotalUpcomingCount(shop.id),
  getHighRiskCount(shop.id, periodHours),
  getDepositsAtRisk(shop.id, periodHours),
  getMonthlyFinancialStats(shop.id),
  getTierDistribution(shop.id),
  getAllUpcomingAppointments(shop.id, {}, { field: "time", direction: "asc" }),
]);
```

**Replace with consolidated query:**

```typescript
// Fetch all 30-day appointments in single query
const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const [allAppointmentsRaw, monthlyStats, tierDistribution] = await Promise.all([
  db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      serviceName: appointments.serviceName,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerTier: customers.tier,
      customerScore: customers.score,
      voidedLast90Days: customers.voidedLast90Days,
      confirmationStatus: appointments.confirmationStatus,
      depositAmount: payments.depositAmount,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(payments, eq(appointments.paymentId, payments.id))
    .where(
      and(
        eq(appointments.shopId, shop.id),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, thirtyDaysFromNow)
      )
    )
    .orderBy(asc(appointments.startsAt)),
  getMonthlyFinancialStats(shop.id),
  getTierDistribution(shop.id),
]);

// Partition in JavaScript (fast)
const sevenDaysFromNow = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

const highRiskAppointments = allAppointmentsRaw.filter(
  (apt) =>
    apt.startsAt <= sevenDaysFromNow &&
    (apt.customerTier === "risk" || apt.customerScore < 40 || apt.voidedLast90Days >= 2)
);

const totalUpcoming = allAppointmentsRaw.length;
const highRiskCount = highRiskAppointments.length;
const depositsAtRisk = highRiskAppointments.reduce((sum, apt) => sum + (apt.depositAmount || 0), 0);
const allAppointments = allAppointmentsRaw;
```

**Benchmark:**
- Before: 150ms (3 queries × 50ms)
- After: 50ms (1 query) + 2ms (JS partitioning)
- **Improvement: 100ms saved (66% faster)**

---

#### Step 3: Add Idempotency Checks to Cron Jobs

**File:** `src/app/api/jobs/send-confirmations/route.ts`

**Current query (line 75-96):**
```typescript
const appointmentsToConfirm = await db
  .select({...})
  .from(appointments)
  .where(
    and(
      eq(appointments.status, "booked"),
      eq(appointments.confirmationStatus, "none"),
      gte(appointments.startsAt, twentyFourHoursFromNow),
      lte(appointments.startsAt, fortyEightHoursFromNow),
      sql`(...)` // high-risk criteria
    )
  );
```

**Add idempotency check:**
```typescript
const appointmentsToConfirm = await db
  .select({...})
  .from(appointments)
  .where(
    and(
      eq(appointments.status, "booked"),
      eq(appointments.confirmationStatus, "none"),
      gte(appointments.startsAt, twentyFourHoursFromNow),
      lte(appointments.startsAt, fortyEightHoursFromNow),
      // Idempotency: only if not sent in last 5 minutes
      sql`(
        ${appointments.confirmationSentAt} IS NULL
        OR ${appointments.confirmationSentAt} < now() - interval '5 minutes'
      )`,
      sql`(
        ${customers.tier} = 'risk' OR
        ${customers.score} < 40 OR
        ${customers.voidedLast90Days} >= 2
      )`
    )
  );
```

**Add distributed lock wrapper:**

Create `src/lib/cron-lock.ts`:
```typescript
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const redis = new Redis(process.env.REDIS_URL!);

export async function withCronLock<T>(
  lockName: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const lock = await redis.set(`cron:${lockName}`, "locked", "NX", "EX", ttlSeconds);

  if (!lock) {
    logger.warn(`Cron job already running: ${lockName}`);
    return null;
  }

  try {
    return await fn();
  } finally {
    await redis.del(`cron:${lockName}`);
  }
}
```

**Update cron route:**
```typescript
import { withCronLock } from "@/lib/cron-lock";

export async function GET(request: NextRequest) {
  // Auth check...

  const result = await withCronLock("send-confirmations", 300, async () => {
    // ... existing cron logic
    return NextResponse.json({ success: true, sent, failed });
  });

  return result || NextResponse.json({ skipped: true, reason: "already running" });
}
```

**Repeat for `expire-confirmations` route.**

---

#### Step 4: Add Environment Variable Validation

**File:** `src/lib/env.ts`

**Update environment schema:**
```typescript
import { z } from "zod";

const envSchema = z.object({
  // Existing variables
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Add V5 validations
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters for security"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection string"),

  // Twilio (already exists, ensure validation)
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+\d{11,15}$/, "Must be E.164 format"),

  // Optional: LOG_LEVEL
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
```

**Update cron routes to use validated env:**
```typescript
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    logger.error("Unauthorized cron access attempt", { authHeader });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of logic
}
```

**Test startup validation:**
```bash
# Should crash if CRON_SECRET missing
CRON_SECRET= pnpm dev
# Error: CRON_SECRET must be at least 32 characters for security
```

---

#### Step 5: Add Zod Validation to API Routes

**Files:**
- `src/app/api/appointments/[id]/remind/route.ts`
- `src/app/api/appointments/[id]/confirm/route.ts`

**Add validation schema:**
```typescript
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate params
    const { id } = paramsSchema.parse({ id: params.id });

    // Auth check...
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ... rest of logic with validated `id`

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    logger.error("API error", { error, path: request.url });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

### Phase 2: High Priority (Week 2)

#### Step 6: Add Missing Database Indexes

**File:** `drizzle/00XX_confirmation_system.sql` (created in V3)

**Add to migration:**
```sql
-- Existing index (from V3)
CREATE INDEX idx_appointments_confirmation_pending
  ON appointments(confirmation_status, confirmation_deadline)
  WHERE confirmation_status = 'pending';

-- NEW: Index for auto-confirmation job (24-48h window)
CREATE INDEX idx_appointments_auto_confirmation
  ON appointments(shop_id, starts_at, confirmation_status)
  WHERE confirmation_status = 'none' AND status = 'booked';

-- NEW: Composite index for high-risk criteria
CREATE INDEX idx_customers_tier_score
  ON customers(tier, score, voided_last_90_days)
  WHERE tier = 'risk' OR score < 40 OR voided_last_90_days >= 2;
```

**Run migration:**
```bash
pnpm db:migrate
```

**Verify indexes:**
```sql
EXPLAIN ANALYZE
SELECT * FROM appointments
WHERE shop_id = '...'
  AND confirmation_status = 'none'
  AND starts_at BETWEEN now() + interval '24 hours' AND now() + interval '48 hours';

-- Should show "Index Scan using idx_appointments_auto_confirmation"
```

---

#### Step 7: Implement Redis Caching

**Create:** `src/lib/cache.ts`

```typescript
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const redis = new Redis(process.env.REDIS_URL!);

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);

    if (cached) {
      logger.debug("Cache hit", { key });
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    logger.warn("Redis cache read failed, falling back to DB", { key, error });
  }

  const fresh = await fetchFn();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
    logger.debug("Cache set", { key, ttl: ttlSeconds });
  } catch (error) {
    logger.warn("Redis cache write failed", { key, error });
  }

  return fresh;
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("Cache invalidated", { pattern, count: keys.length });
    }
  } catch (error) {
    logger.warn("Cache invalidation failed", { pattern, error });
  }
}
```

**Update:** `src/lib/queries/dashboard.ts`

```typescript
import { getCached } from "@/lib/cache";

export async function getTierDistribution(shopId: string) {
  return getCached(
    `tier-dist-${shopId}`,
    300, // 5 minutes
    async () => {
      // ... existing query logic
    }
  );
}
```

**Invalidate cache on tier changes:**

Update `src/app/api/jobs/recompute-scores/route.ts`:
```typescript
import { invalidateCache } from "@/lib/cache";

// After updating customer tiers
await invalidateCache("tier-dist-*");
```

---

#### Step 8: Create Shared TypeScript Types

**Create:** `src/types/dashboard.ts`

```typescript
export type DashboardAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: "top" | "neutral" | "risk" | null;
  customerScore: number;
  voidedLast90Days: number;
  confirmationStatus: "none" | "pending" | "confirmed" | "expired";
};

export type DashboardFilters = {
  tier?: "top" | "neutral" | "risk" | "all";
  timeRange?: number; // hours
};

export type DashboardSort = {
  field: "time" | "score" | "tier";
  direction: "asc" | "desc";
};

export enum ConfirmationStatus {
  NONE = "none",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  EXPIRED = "expired",
}
```

**Update components:**

```typescript
// src/components/dashboard/attention-required-table.tsx
import { DashboardAppointment } from "@/types/dashboard";

export function AttentionRequiredTable({
  appointments,
  currentPeriod,
}: {
  appointments: DashboardAppointment[];
  currentPeriod: number;
}) {
  // ... component logic
}
```

---

#### Step 9: Add Comprehensive Edge Case Tests

**File:** `src/lib/queries/__tests__/dashboard.test.ts`

**Add test cases:**
```typescript
describe("Dashboard Queries - Edge Cases", () => {
  it("should return empty array for non-existent shop", async () => {
    const results = await getHighRiskAppointments("non-existent-id", 168);
    expect(results).toEqual([]);
  });

  it("should handle zero period gracefully", async () => {
    const results = await getHighRiskAppointments(testShopId, 0);
    expect(results).toEqual([]);
  });

  it("should handle negative period gracefully", async () => {
    const results = await getHighRiskAppointments(testShopId, -24);
    expect(results).toEqual([]);
  });

  it("should match null tier if score < 40", async () => {
    const customer = await createCustomer({ tier: null, score: 30 });
    const appointment = await createAppointment({ customerId: customer.id });

    const results = await getHighRiskAppointments(testShopId, 168);
    expect(results.find((a) => a.id === appointment.id)).toBeDefined();
  });

  it("should exclude cancelled appointments", async () => {
    const customer = await createCustomer({ tier: "risk" });
    await createAppointment({ customerId: customer.id, status: "cancelled" });

    const results = await getHighRiskAppointments(testShopId, 168);
    expect(results).toEqual([]);
  });

  it("should handle timezone differences correctly", async () => {
    const pacificAppointment = new Date("2024-03-13T18:00:00Z"); // 10 AM PST
    await createAppointment({ startsAt: pacificAppointment });

    const queryTime = new Date("2024-03-13T17:00:00Z"); // 9 AM PST
    vi.setSystemTime(queryTime);

    const results = await getHighRiskAppointments(testShopId, 24);
    expect(results.length).toBeGreaterThan(0);
  });
});
```

---

#### Step 10: Add Idempotency Tests for Cron Jobs

**File:** `src/app/api/jobs/__tests__/send-confirmations.test.ts`

**Add tests:**
```typescript
describe("Cron Job Idempotency", () => {
  it("should not send duplicate confirmations on retry", async () => {
    const appointment = await createAppointment({ startsAt: thirtyHoursFromNow });

    // First run
    const response1 = await GET(createRequest());
    const data1 = await response1.json();
    expect(data1.sent).toBe(1);

    // Second run (immediate retry)
    const response2 = await GET(createRequest());
    const data2 = await response2.json();

    expect(data2.sent).toBe(0); // No duplicates!

    const twilioMock = vi.mocked(sendSMS);
    expect(twilioMock).toHaveBeenCalledTimes(1);
  });
});
```

---

### Phase 3: Medium Priority (Week 3)

#### Step 11: Implement Structured Logging

**Create:** `src/lib/logger.ts`

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
  },
});
```

**Replace all `console.log` with `logger`:**

```typescript
// Before:
console.log(`Found ${appointmentsToConfirm.length} appointments`);

// After:
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

const correlationId = randomUUID();
logger.info("Auto-confirmation cron started", {
  correlationId,
  timestamp: new Date().toISOString(),
});

logger.info("Found appointments to confirm", {
  correlationId,
  count: appointmentsToConfirm.length,
});
```

---

#### Step 12: Add E2E Error Scenario Tests

**File:** `tests/e2e/dashboard-errors.spec.ts`

```typescript
test.describe("Error Scenarios", () => {
  test("should show error when clipboard permission denied", async ({ page, context }) => {
    await context.grantPermissions([]);
    await page.click("button:has-text('Contact'):first");
    await page.locator('button[title="Copy phone"]').click();
    await expect(page.getByText("Failed to copy phone")).toBeVisible();
  });

  test("should show error when network times out", async ({ page }) => {
    await page.route("/api/appointments/**/remind", (route) => route.abort("timedout"));
    await page.click("button:has-text('Remind'):first");
    await expect(page.getByText("Network error")).toBeVisible();
  });

  test("should show 404 page for invalid appointment", async ({ page }) => {
    await page.goto("/app/appointments/invalid-uuid-123");
    await expect(page.getByText("Appointment not found")).toBeVisible();
  });
});
```

---

#### Step 13: Performance Benchmarking

Create `scripts/benchmark-dashboard.ts`:

```typescript
import { performance } from "perf_hooks";
import { db } from "@/lib/db";
import { getHighRiskAppointments, getTierDistribution } from "@/lib/queries/dashboard";

async function benchmarkQueries() {
  const shopId = "test-shop-id";

  // Benchmark getTierDistribution
  const start1 = performance.now();
  await getTierDistribution(shopId);
  const end1 = performance.now();

  console.log(`getTierDistribution: ${(end1 - start1).toFixed(2)}ms`);

  // Benchmark getHighRiskAppointments
  const start2 = performance.now();
  await getHighRiskAppointments(shopId, 168);
  const end2 = performance.now();

  console.log(`getHighRiskAppointments: ${(end2 - start2).toFixed(2)}ms`);
}

benchmarkQueries();
```

**Run benchmarks:**
```bash
tsx scripts/benchmark-dashboard.ts
```

**Expected results:**
- getTierDistribution: 5ms (vs 50ms before)
- getHighRiskAppointments: 50ms (same, but part of consolidated query)

---

## Testing

### Unit Tests (15+ new cases)

**Run all unit tests:**
```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
pnpm test src/lib/__tests__/cache.test.ts
pnpm test src/lib/__tests__/cron-lock.test.ts
```

**Coverage target:** 90%

### E2E Tests (8+ new scenarios)

**Run E2E tests:**
```bash
pnpm test:e2e tests/e2e/dashboard-errors.spec.ts
pnpm test:e2e tests/e2e/dashboard-performance.spec.ts
```

### Integration Tests (5+ concurrency tests)

**Run integration tests:**
```bash
pnpm test tests/integration/cron-concurrency.spec.ts
```

---

## Acceptance Criteria

### Performance
- [ ] Dashboard page load time: 800ms → 300ms (63% reduction)
- [ ] getTierDistribution query: 50ms → 5ms (90% reduction)
- [ ] Cache hit rate: 85% for tier distribution
- [ ] Cron job execution: 15s → 3s (batch processing)
- [ ] Database queries consolidated: 3 → 1 per page load

### Safety
- [ ] Zero duplicate SMS (idempotency checks pass)
- [ ] Zero race condition failures (distributed locks work)
- [ ] Environment variables validated at startup
- [ ] All API routes use Zod validation
- [ ] Stripe refund idempotency verified

### Testing
- [ ] Unit test coverage: 60% → 90%
- [ ] E2E test scenarios: 12 → 25+
- [ ] Integration test scenarios: 5 → 10+
- [ ] All edge cases covered (null values, timezones, etc.)
- [ ] All error paths tested

### Code Quality
- [ ] Shared TypeScript types created
- [ ] All `console.log` replaced with structured logger
- [ ] Correlation IDs in all cron jobs
- [ ] Error messages provide user guidance
- [ ] All Best Practices violations fixed

---

## Performance Benchmarks

### Before V5
```
Dashboard Page Load: 800ms
├─ getHighRiskAppointments: 50ms
├─ getTotalUpcomingCount: 50ms
├─ getDepositsAtRisk: 50ms
├─ getTierDistribution: 50ms (2 queries)
├─ getAllUpcomingAppointments: 50ms
└─ Rendering: 550ms

Cron Job Execution: 15s
└─ Process 500 appointments sequentially
```

### After V5
```
Dashboard Page Load: 300ms
├─ Consolidated query: 50ms (1 query)
├─ getTierDistribution (cached): 0.5ms
├─ JavaScript partitioning: 2ms
└─ Rendering: 247.5ms

Cron Job Execution: 3s
└─ Process 500 appointments in batches of 100
```

---

## Deployment Checklist

### Environment Variables
- [ ] `REDIS_URL` added to Vercel
- [ ] `CRON_SECRET` regenerated (32+ chars)
- [ ] `LOG_LEVEL` set to "info" in production

### Database
- [ ] New indexes created (run migration)
- [ ] Index performance verified (EXPLAIN ANALYZE)

### Redis
- [ ] Redis instance provisioned (Upstash, ElastiCache, etc.)
- [ ] Cache invalidation tested

### Monitoring
- [ ] Structured logs visible in dashboard
- [ ] Error tracking connected (Sentry, Datadog)
- [ ] Performance metrics baseline captured

---

## Rollback Plan

If issues arise after deployment:

1. **Performance degradation:**
   - Disable Redis caching (graceful fallback to DB)
   - Revert query consolidation (use original separate queries)

2. **Cron job failures:**
   - Disable distributed locks temporarily
   - Rely on idempotency timestamp checks only

3. **Database issues:**
   - Drop new indexes if causing contention
   - Rollback migration if schema errors

---

## Next Steps After V5

**Optional Enhancements:**
1. Add analytics dashboard (confirmation rates, cancellation rates)
2. Make caching configurable (allow shops to customize TTL)
3. Implement advanced monitoring (APM, distributed tracing)
4. Add A/B testing for SMS message wording

---

## Related Documentation

- Optimization Guide: `docs/shaping/dashboard -update/dashboard-no-show-prevention-optimizations.md`
- Slices Overview: `docs/shaping/dashboard -update/dashboard-no-show-prevention-slices.md`
- V1-V4 Plans: `docs/shaping/dashboard -update/slices/dashboard-no-show-prevention-v[1-4]-plan.md`
