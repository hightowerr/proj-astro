# V1 Implementation Plan — Currency-Aware Deposits

**Slice:** V1: Currency-Aware Deposits  
**Appetite:** ~half day  
**Files changed:** 3 (`types/dashboard.ts`, `queries/dashboard.ts`, `summary-cards.tsx`)  
**Tests:** `src/lib/queries/__tests__/dashboard.test.ts` (extend existing)

---

## Change Order

Types first. This creates compiler errors at the query and component callsites immediately, making the remaining changes self-directing — TypeScript flags exactly what needs updating.

```
1. src/types/dashboard.ts          ← types first; compiler errors guide the rest
2. src/lib/queries/dashboard.ts    ← query fixes; TypeScript surfaces DashboardData mismatch
3. src/components/dashboard/summary-cards.tsx  ← component fix; TypeScript surfaces prop mismatch
4. src/lib/queries/__tests__/dashboard.test.ts  ← tests last, once behaviour is settled
```

---

## Step 1 — `src/types/dashboard.ts`

One change only.

**Do NOT add `depositAmount` or `depositCurrency` to `DashboardAppointment`.** Those fields are internal to `getDashboardData()`'s accumulator — accessible there via Drizzle's inferred type from `dashboardAppointmentSelect`, but not part of the public interface. Adding them here would immediately break `getHighRiskAppointments()` and `getAllUpcomingAppointments()`, which return `Promise<DashboardAppointment[]>` via `baseAppointmentSelect` that has neither field. With `strict: true` this is a compile error.

**`DashboardData`** — change `depositsAtRisk` from scalar to map:

```typescript
export interface DashboardData {
  highRiskAppointments: DashboardAppointment[];
  totalUpcoming: number;
  depositsAtRisk: Record<string, number>;  // WAS: number
  monthlyStats: DashboardMonthlyStats;
  tierDistribution: DashboardTierDistribution;
  allAppointments: DashboardAppointment[];
}
```

After saving, `pnpm typecheck` should immediately show errors in `dashboard.ts` (accumulator assigned to wrong type) and `summary-cards.tsx` (prop type mismatch). Those are the two remaining files.

---

## Step 2 — `src/lib/queries/dashboard.ts`

Three changes in this file.

### 2a. `dashboardAppointmentSelect` — add `depositCurrency`

```typescript
const dashboardAppointmentSelect = {
  ...baseAppointmentSelect,
  depositAmount: sql<number>`COALESCE(${payments.amountCents}, 0)`,
  depositCurrency: payments.currency,  // ADD
};
```

`payments.currency` is `text().notNull()` in schema, but the join is `leftJoin` — if no payment row exists the field is `null` at runtime. The type will be `string | null`. This matches the interface field added in Step 1.

### 2b. `getDepositsAtRisk` — group by currency, return map

Replace the entire function body. Return type changes from `Promise<number>` to `Promise<Record<string, number>>`.

```typescript
export async function getDepositsAtRisk(
  shopId: string,
  periodHours: number
): Promise<Record<string, number>> {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodHours * 60 * 60 * 1000);

  const rows = await db
    .select({
      currency: payments.currency,
      total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)::int`,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, customers.id),
        eq(customerScores.shopId, appointments.shopId)
      )
    )
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(appointments.shopId, shopId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, endDate),
        highRiskCondition
      )
    )
    .groupBy(payments.currency);

  return Object.fromEntries(
    rows
      .filter((r) => r.currency !== null)
      .map((r) => [r.currency, r.total])
  );
}
```

The `.filter(r => r.currency !== null)` removes the null-currency group that appears when an appointment has no payment record (leftJoin produces a null row; GROUP BY groups nulls together).

### 2c. `getDashboardData` — per-currency accumulator

Replace the scalar `depositsAtRisk` variable and its accumulation line:

```typescript
// BEFORE
const highRiskAppointments: DashboardAppointment[] = [];
let depositsAtRisk = 0;

for (const appointment of allAppointmentsRaw) {
  const isHighRisk = ...;
  if (isHighRisk) {
    highRiskAppointments.push(appointment);
    depositsAtRisk += appointment.depositAmount;
  }
}

// AFTER
const highRiskAppointments: DashboardAppointment[] = [];
const depositsAtRisk: Record<string, number> = {};

for (const appointment of allAppointmentsRaw) {
  const isHighRisk = ...;
  if (isHighRisk) {
    highRiskAppointments.push(appointment);
    if (appointment.depositAmount > 0 && appointment.depositCurrency) {
      const cur = appointment.depositCurrency;
      depositsAtRisk[cur] = (depositsAtRisk[cur] ?? 0) + appointment.depositAmount;
    }
  }
}
```

The guard `depositAmount > 0 && depositCurrency` prevents inserting zero-value keys when an appointment has no payment row (COALESCE returns 0, currency is null).

---

## Step 3 — `src/components/dashboard/summary-cards.tsx`

Three changes.

### 3a. `formatCurrency` — add `currency` param

```typescript
function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,                    // WAS: "USD"
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
```

### 3b. Add `renderDepositsAtRisk` — branch on key count

Add this function directly below `formatCurrency`:

```typescript
function renderDepositsAtRisk(depositsAtRisk: Record<string, number>): string {
  const entries = Object.entries(depositsAtRisk);
  if (entries.length === 0) return formatCurrency(0, "USD");
  if (entries.length === 1) {
    // Non-null assertion safe: length === 1 guarantees index 0 exists.
    // Required because tsconfig has noUncheckedIndexedAccess: true.
    const [currency, amountCents] = entries[0]!;
    return formatCurrency(amountCents, currency);
  }
  return "Multiple currencies";
}
```

Empty-record case (`{}`) means no high-risk appointments with deposits — show `$0`.  
Single key → format in that currency.  
Multiple keys → `"Multiple currencies"` (Option B, locked in shaping).

### 3c. Update `SummaryCardsProps` and card JSX

```typescript
// Prop type
interface SummaryCardsProps {
  totalUpcoming: number;
  highRiskCount: number;
  depositsAtRisk: Record<string, number>;  // WAS: number
  monthlyStats: DashboardMonthlyStats;
}
```

```tsx
// Card value — replace formatCurrency(depositsAtRisk) with the renderer
<p className="mt-2 text-3xl font-semibold tabular-nums text-amber-200">
  {renderDepositsAtRisk(depositsAtRisk)}
</p>
```

---

## Step 4 — Tests

Extend `src/lib/queries/__tests__/dashboard.test.ts`.

### 4a. Add to the import list

```typescript
const {
  getAllUpcomingAppointments,
  getDepositsAtRisk,       // ADD
  getDashboardData,        // ADD
  getHighRiskAppointments,
  getMonthlyFinancialStats,
  getTierDistribution,
  getTotalUpcomingCount,
} = await import("@/lib/queries/dashboard");
```

### 4b. New `getDepositsAtRisk` tests

```typescript
describe("getDepositsAtRisk", () => {
  it("returns an empty object when there are no matching rows", async () => {
    setRows([]);
    const result = await getDepositsAtRisk("shop-1", 168);
    expect(result).toEqual({});
  });

  it("returns a single-currency map", async () => {
    setRows([{ currency: "USD", total: 5000 }]);
    const result = await getDepositsAtRisk("shop-1", 168);
    expect(result).toEqual({ USD: 5000 });
  });

  it("returns a multi-currency map", async () => {
    setRows([
      { currency: "USD", total: 5000 },
      { currency: "GBP", total: 3000 },
    ]);
    const result = await getDepositsAtRisk("shop-1", 168);
    expect(result).toEqual({ USD: 5000, GBP: 3000 });
  });

  it("filters out null-currency rows (appointments with no payment record)", async () => {
    setRows([
      { currency: null, total: 0 },
      { currency: "USD", total: 7500 },
    ]);
    const result = await getDepositsAtRisk("shop-1", 168);
    expect(result).toEqual({ USD: 7500 });
  });

  it("calls groupBy once", async () => {
    setRows([]);
    await getDepositsAtRisk("shop-1", 168);
    expect(groupByMock).toHaveBeenCalledOnce();
  });
});
```

### 4c. New `getDashboardData` accumulator tests

`getDashboardData` calls three queries via `Promise.all` — all three share the same mock `rows`. The accumulator test sets rows shaped for the appointment query; the `getMonthlyFinancialStats` and `getTierDistribution` calls get the same rows but map different fields, producing zero/empty for each (which is fine — we're only asserting on `depositsAtRisk`).

```typescript
describe("getDashboardData — depositsAtRisk accumulator", () => {
  const makeRow = (overrides: Record<string, unknown>) => ({
    id: "appt-1",
    startsAt: new Date(Date.now() + 3_600_000),        // 1h from now → inside window
    endsAt: new Date(Date.now() + 7_200_000),
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "+12025550100",
    customerTier: "risk",
    customerScore: 30,
    voidedLast90Days: 0,
    confirmationStatus: "none",
    bookingUrl: null,
    smsOptIn: false,
    serviceName: null,
    depositAmount: 5000,
    depositCurrency: "USD",
    ...overrides,
  });

  it("accumulates deposits by currency for high-risk appointments", async () => {
    setRows([makeRow({})]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.depositsAtRisk).toEqual({ USD: 5000 });
  });

  it("sums multiple high-risk appointments in the same currency", async () => {
    setRows([
      makeRow({ id: "appt-1", depositAmount: 5000, depositCurrency: "USD" }),
      makeRow({ id: "appt-2", depositAmount: 3000, depositCurrency: "USD" }),
    ]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.depositsAtRisk).toEqual({ USD: 8000 });
  });

  it("returns an empty map when no appointments have deposits", async () => {
    setRows([makeRow({ depositAmount: 0, depositCurrency: null })]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.depositsAtRisk).toEqual({});
  });

  it("excludes non-high-risk appointments from the deposit map", async () => {
    setRows([makeRow({ customerTier: "top", customerScore: 95, voidedLast90Days: 0 })]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.depositsAtRisk).toEqual({});
  });
});
```

---

## Verification Sequence

Run these in order. Each gate must pass before proceeding to the next.

### Gate 1 — Types
```bash
pnpm typecheck
```
Expected: errors related to `customerId`/`serviceName` type drift may still appear — those are V2's job. What must be true after V1: **no new errors** from the `depositsAtRisk` type change (i.e. the prop mismatch in `summary-cards.tsx` and the return type mismatch in `getDashboardData()` are resolved). If those errors remain, the type cascade is incomplete — do not proceed to V2.

### Gate 2 — Lint
```bash
pnpm lint
```
Expected: 0 warnings, 0 errors.

### Gate 3 — New tests pass
```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
```
Expected: all new tests green. Watch for `groupByMock` assertion failures which would indicate the groupBy call was not added.

### Gate 4 — No regressions
```bash
pnpm test
```
Expected: full suite green. Specifically check the pre-existing assertions:
- `leftJoinMock.toHaveBeenCalledTimes(2)` in `getHighRiskAppointments` test — should still pass (V1 does not touch `baseAppointmentSelect` or `getHighRiskAppointments`; those are V2)
- `groupByMock.toHaveBeenCalledOnce()` in `getMonthlyFinancialStats` test — should still pass

---

## Callsite to watch

`src/app/app/dashboard/page.tsx:86` passes `depositsAtRisk={depositsAtRisk}` to `<SummaryCards />`.  
This line requires no edit — TypeScript enforces the updated prop type automatically once Steps 1–3 are complete. If `pnpm typecheck` passes, the callsite is correct.

---

## Sufficient Conditions Checklist (from shaping.md)

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, no regressions
- [ ] Single-currency: `{ USD: 5000 }` → `getDepositsAtRisk` test passes
- [ ] Multi-currency: `{ USD: 5000, GBP: 3000 }` → `getDepositsAtRisk` test passes
- [ ] Null-currency rows filtered: `getDepositsAtRisk` test passes
- [ ] Accumulator: `getDashboardData` tests all green
- [ ] `formatCurrency` no longer hardcodes `"USD"` (confirmed by lint/typecheck — any call without a currency arg is a TS error)
- [ ] `DashboardData.depositsAtRisk` is `Record<string, number>` — confirmed by typecheck
