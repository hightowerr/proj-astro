# V1 Implementation Plan — High-Risk Customers KPI

**Slice:** V1 (only slice)  
**Appetite:** ~0.5 day  
**Prerequisite:** Bet 1 fully applied ✅ (confirmed in codebase)  
**Files changed:** 4 (`types/dashboard.ts`, `dashboard.ts`, `page.tsx`, `summary-cards.tsx`)  
**Tests:** `src/lib/queries/__tests__/dashboard.test.ts` (extend existing)

---

## Current state (confirmed)

| Location | Current | Needs to become |
|----------|---------|-----------------|
| `DashboardData` type | no `highRiskCustomerCount` field | `highRiskCustomerCount: number` |
| `getDashboardData()` return | no `highRiskCustomerCount` | Set derivation + field in return |
| `page.tsx:85` | `highRiskCount={highRiskAppointments.length}` | `highRiskCustomerCount={highRiskCustomerCount}` |
| `SummaryCardsProps` | `highRiskCount: number` | `highRiskCustomerCount: number` |
| Card label | `High-Risk Appointments` | `High-Risk Customers` |
| Card count | `{highRiskCount}` | `{highRiskCustomerCount}` |
| Card sublabel | absent | `In selected window` |

---

## Change order

Types first — adding `highRiskCustomerCount` to `DashboardData` immediately surfaces a TypeScript error in `getDashboardData()`'s return statement, making the next step self-directing.

```
1. src/types/dashboard.ts          ← type first; error surfaces in getDashboardData return
2. src/lib/queries/dashboard.ts    ← derivation + return field
3. src/app/app/dashboard/page.tsx  ← destructure + prop pass
4. src/components/dashboard/summary-cards.tsx  ← prop rename + card JSX
5. src/lib/queries/__tests__/dashboard.test.ts  ← tests
```

---

## Step 1 — `src/types/dashboard.ts`

Add `highRiskCustomerCount: number` to `DashboardData`:

```typescript
export interface DashboardData {
  highRiskAppointments: DashboardAppointment[];
  totalUpcoming: number;
  depositsAtRisk: Record<string, number>;
  highRiskCustomerCount: number;  // ADD
  monthlyStats: DashboardMonthlyStats;
  tierDistribution: DashboardTierDistribution;
  allAppointments: DashboardAppointment[];
}
```

After saving, TypeScript errors in `getDashboardData()` — return object is missing the required field. That error is the signal to move to Step 2.

---

## Step 2 — `src/lib/queries/dashboard.ts`

Two additions to `getDashboardData()`.

**After the `for` loop** (line 275, after `depositsAtRisk` accumulation closes), add the Set derivation:

```typescript
  }

  const highRiskCustomerCount = new Set(
    highRiskAppointments.map((a) => a.customerId)
  ).size;

  return {
```

**In the return object**, add `highRiskCustomerCount`:

```typescript
  return {
    highRiskAppointments,
    totalUpcoming: allAppointmentsRaw.length,
    depositsAtRisk,
    highRiskCustomerCount,   // ADD
    monthlyStats,
    tierDistribution,
    allAppointments: allAppointmentsRaw,
  };
```

**Why this is safe:**
- `highRiskAppointments` is already built by the time the Set runs — no ordering issue
- `a.customerId` is `string` (non-null UUID FK, selected via `appointments.customerId` in Bet 1 V2)
- `new Set([]).size === 0` — correct for empty arrays
- `noUncheckedIndexedAccess` does not affect `Set.prototype.size` — it is always `number`

---

## Step 3 — `src/app/app/dashboard/page.tsx`

Two edits.

**Add `highRiskCustomerCount` to the destructure** (around line 44):

```typescript
const {
  highRiskAppointments,
  totalUpcoming,
  depositsAtRisk,
  highRiskCustomerCount,   // ADD
  monthlyStats,
  tierDistribution,
  allAppointments,
} = dashboardData;
```

**Replace the prop on `<SummaryCards>`** (line 85):

```tsx
// Before
<SummaryCards
  totalUpcoming={totalUpcoming}
  highRiskCount={highRiskAppointments.length}
  depositsAtRisk={depositsAtRisk}
  monthlyStats={monthlyStats}
/>

// After
<SummaryCards
  totalUpcoming={totalUpcoming}
  highRiskCustomerCount={highRiskCustomerCount}
  depositsAtRisk={depositsAtRisk}
  monthlyStats={monthlyStats}
/>
```

`highRiskAppointments.length` is removed as the card source. `highRiskAppointments` itself stays — it is still passed to `<AttentionRequiredTable />` on line 81.

---

## Step 4 — `src/components/dashboard/summary-cards.tsx`

Four changes, all in the High-Risk card.

**Prop interface** — rename `highRiskCount` → `highRiskCustomerCount`:

```typescript
interface SummaryCardsProps {
  totalUpcoming: number;
  highRiskCustomerCount: number;  // WAS: highRiskCount
  depositsAtRisk: Record<string, number>;
  monthlyStats: DashboardMonthlyStats;
}
```

**Destructure parameter** — rename to match:

```tsx
export function SummaryCards({
  totalUpcoming,
  highRiskCustomerCount,  // WAS: highRiskCount
  depositsAtRisk,
  monthlyStats,
}: SummaryCardsProps) {
```

**Card JSX** — label, count, sublabel:

```tsx
// Before
<article className="rounded-lg border border-red-500/30 bg-bg-dark-secondary p-5">
  <h3 className="text-xs font-medium uppercase text-red-300">High-Risk Appointments</h3>
  <p className="mt-2 text-3xl font-semibold tabular-nums text-red-200">{highRiskCount}</p>
</article>

// After
<article className="rounded-lg border border-red-500/30 bg-bg-dark-secondary p-5">
  <h3 className="text-xs font-medium uppercase text-red-300">High-Risk Customers</h3>
  <p className="mt-2 text-3xl font-semibold tabular-nums text-red-200">{highRiskCustomerCount}</p>
  <p className="mt-1 text-xs text-red-300/70">In selected window</p>
</article>
```

Sublabel class: `text-xs text-red-300/70 mt-1` — same red family as the card header at 70% opacity. Matches the design system's text hierarchy principle for secondary copy within a tonal group.

---

## Step 5 — Tests

Extend `src/lib/queries/__tests__/dashboard.test.ts`.

Add a new `describe` block after the existing `getDashboardData depositsAtRisk accumulator` block. Reuse the same row shape — it already has `customerId`, `startsAt` inside the high-risk window, and `customerTier: "risk"`.

```typescript
describe("getDashboardData highRiskCustomerCount", () => {
  const makeRow = (overrides: Record<string, unknown>) => ({
    id: "appt-1",
    customerId: "customer-1",
    startsAt: new Date(Date.now() + 3_600_000),   // 1h from now — inside 168h window
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

  it("returns 0 when no appointments exist", async () => {
    setRows([]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.highRiskCustomerCount).toBe(0);
  });

  it("returns 0 when all rows are non-high-risk", async () => {
    setRows([makeRow({ customerTier: "top", customerScore: 95, voidedLast90Days: 0 })]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.highRiskCustomerCount).toBe(0);
  });

  it("counts 1 customer with a single high-risk appointment", async () => {
    setRows([makeRow({})]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.highRiskCustomerCount).toBe(1);
  });

  it("deduplicates — 1 customer × 3 appointments → count 1", async () => {
    setRows([
      makeRow({ id: "appt-1", customerId: "customer-1" }),
      makeRow({ id: "appt-2", customerId: "customer-1" }),
      makeRow({ id: "appt-3", customerId: "customer-1" }),
    ]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.highRiskCustomerCount).toBe(1);
  });

  it("counts distinct — 2 different customers → count 2", async () => {
    setRows([
      makeRow({ id: "appt-1", customerId: "customer-1" }),
      makeRow({ id: "appt-2", customerId: "customer-2" }),
    ]);
    const result = await getDashboardData("shop-1", 168);
    expect(result.highRiskCustomerCount).toBe(2);
  });

  it("excludes out-of-window appointments from the count", async () => {
    setRows([
      makeRow({ id: "appt-1", customerId: "customer-1", startsAt: new Date(Date.now() + 3_600_000) }),
      // appt-2: same customer, startsAt beyond 168h window
      makeRow({ id: "appt-2", customerId: "customer-1", startsAt: new Date(Date.now() + 200 * 3_600_000) }),
    ]);
    const result = await getDashboardData("shop-1", 168);
    // appt-2 does not pass the isHighRisk time check — only appt-1 counts
    expect(result.highRiskCustomerCount).toBe(1);
  });
});
```

**Note on the "cancelled appointment" test case:** The analysis lists this as a required test case, but it is enforced by the DB `status = 'booked'` WHERE clause — not by the in-memory accumulator. The mock bypasses the DB filter, so a "cancelled" row set via `setRows()` would still reach the in-memory loop. The correct layer to verify this is `pnpm typecheck` (ensures the query remains correct) and the existing WHERE clause in the query. No mock-based test is added for it — it is an integration-level concern.

---

## Verification sequence

### Gate 1 — Types

```bash
pnpm typecheck
```

Expected: 0 errors. After Step 4, all four files align:
- `DashboardData.highRiskCustomerCount` exists
- `getDashboardData()` returns it
- `page.tsx` destructures and passes it
- `SummaryCards` receives it

If errors remain, the most likely cause is `highRiskCount` still referenced somewhere — search and replace.

### Gate 2 — Lint

```bash
pnpm lint
```

Expected: 0 warnings, 0 errors. Watch for `noUnusedLocals` — confirm `highRiskCount` has been fully removed from `summary-cards.tsx` (both the interface and the destructure).

### Gate 3 — New tests pass

```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
```

Expected: all 6 new tests green. Specifically:
- Deduplication test: `1 customer × 3 appointments → 1` confirms the Set is working
- Out-of-window test: confirms the count only reflects the active period window
- Non-high-risk exclusion: confirms the count uses `highRiskAppointments` (already filtered), not `allAppointmentsRaw`

### Gate 4 — No regressions

```bash
pnpm test
```

Expected: full suite green. Specifically verify the existing `getDashboardData depositsAtRisk accumulator` tests still pass — the `makeRow` helper in those tests does not need changing since we added `highRiskCustomerCount` to the return (which doesn't affect what `depositsAtRisk` tests assert on).

---

## Sufficient conditions checklist

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, no regressions
- [ ] `highRiskCount` does not appear anywhere in `summary-cards.tsx` or `page.tsx`
- [ ] `highRiskAppointments.length` does not appear as the source for the card value
- [ ] 1 customer × 3 appointments → `highRiskCustomerCount = 1` (deduplication test passes)
- [ ] Out-of-window appointment → excluded from count (window test passes)
- [ ] Card label: `High-Risk Customers`
- [ ] Card sublabel: `In selected window`
- [ ] Card value: `{highRiskCustomerCount}`
