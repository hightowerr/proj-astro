# V2 Implementation Plan — Type Drift Fix

**Slice:** V2: Type Drift — customerId + serviceName  
**Appetite:** ~1 hour  
**Prerequisite:** V1 merged and verified  
**Files changed:** 1 (`queries/dashboard.ts`)  
**Tests:** `src/lib/queries/__tests__/dashboard.test.ts` (update + extend)

---

## Context

After V1, `pnpm typecheck` still shows errors. The pre-existing type drift:

- `DashboardAppointment.customerId: string` — declared in the type since before V1; never selected from DB
- `DashboardAppointment.serviceName: string | null` — same

`getHighRiskAppointments()`, `getAllUpcomingAppointments()`, and `getDashboardData()` all return rows typed via `baseAppointmentSelect`. That select object has neither field, so the Drizzle-inferred type is missing two required `DashboardAppointment` fields. With `strict: true`, TypeScript errors on every push to `DashboardAppointment[]`.

**V2 is the fix.** No type file changes needed — the interface is already correct. The select just needs to catch up.

---

## What does NOT change

- `src/types/dashboard.ts` — untouched; `DashboardAppointment` already has the fields
- `src/components/` — untouched; no component currently reads `customerId` or `serviceName`
- Schema — no migrations; `eventTypes.name` and `appointments.customerId` already exist

---

## Change Order

Single file. All 5 edits are in `src/lib/queries/dashboard.ts`.

```
1. Add eventTypes to schema import
2. Add customerId + serviceName to baseAppointmentSelect
3. Add eventTypes leftJoin to getHighRiskAppointments()
4. Add eventTypes leftJoin to getAllUpcomingAppointments()
5. Add eventTypes leftJoin to getDashboardData() main query
```

---

## Step 1 — Import `eventTypes`

```typescript
// Before
import { appointments, customerContactPrefs, customers, customerScores, payments } from "@/lib/schema";

// After
import { appointments, customerContactPrefs, customers, customerScores, eventTypes, payments } from "@/lib/schema";
```

---

## Step 2 — `baseAppointmentSelect` — add `customerId` and `serviceName`

```typescript
const baseAppointmentSelect = {
  id: appointments.id,
  customerId: appointments.customerId,   // ADD — was declared in type, missing from select
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  customerName: customers.fullName,
  customerEmail: customers.email,
  customerPhone: customers.phone,
  customerTier: customerScores.tier,
  customerScore: customerScores.score,
  voidedLast90Days: sql<number>`COALESCE((${customerScores.stats} ->> 'voidedLast90Days')::int, 0)`,
  confirmationStatus: appointments.confirmationStatus,
  bookingUrl: appointments.bookingUrl,
  smsOptIn: sql<boolean>`COALESCE(${customerContactPrefs.smsOptIn}, false)`,
  serviceName: eventTypes.name,          // ADD — left join (Step 3–5); null when no service linked
};
```

`eventTypes.name` is `text().notNull()` in the schema but the join is `leftJoin` — rows without a matched event type get `null` at runtime. Drizzle infers the type as `string | null`. This matches `DashboardAppointment.serviceName: string | null`.

`appointments.customerId` is a `uuid` FK — always present, maps to `string`. This matches `DashboardAppointment.customerId: string`.

---

## Step 3 — `getHighRiskAppointments()` — add `eventTypes` join

```typescript
return await db
  .select(baseAppointmentSelect)
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(
    customerScores,
    and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
  )
  .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
  .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))   // ADD
  .where(
    and(
      eq(appointments.shopId, shopId),
      eq(appointments.status, "booked"),
      gte(appointments.startsAt, now),
      lte(appointments.startsAt, endDate),
      highRiskCondition
    )
  )
  .orderBy(asc(appointments.startsAt));
```

---

## Step 4 — `getAllUpcomingAppointments()` — add `eventTypes` join

```typescript
const query = db
  .select(baseAppointmentSelect)
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(
    customerScores,
    and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
  )
  .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
  .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))   // ADD
  .where(and(...whereClauses));
```

---

## Step 5 — `getDashboardData()` main query — add `eventTypes` join

Inside `Promise.all`, the first query uses `dashboardAppointmentSelect` (which spreads `baseAppointmentSelect`). Add the join after the existing `customerContactPrefs` join:

```typescript
db
  .select(dashboardAppointmentSelect)
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(
    customerScores,
    and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
  )
  .leftJoin(payments, eq(payments.appointmentId, appointments.id))
  .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
  .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))   // ADD
  .where(
    and(
      eq(appointments.shopId, shopId),
      eq(appointments.status, "booked"),
      gte(appointments.startsAt, now),
      lte(appointments.startsAt, upcomingWindowEnd)
    )
  )
  .orderBy(asc(appointments.startsAt)),
```

**Join count after V2 per function:**

| Function | innerJoin | leftJoin |
|----------|-----------|----------|
| `getHighRiskAppointments` | 1 (customers) | 3 (customerScores, customerContactPrefs, eventTypes) |
| `getAllUpcomingAppointments` | 1 (customers) | 3 (customerScores, customerContactPrefs, eventTypes) |
| `getDashboardData` main query | 1 (customers) | 4 (customerScores, payments, customerContactPrefs, eventTypes) |

---

## Step 6 — Tests

### 6a. Update existing `getHighRiskAppointments` assertion

The existing test asserts `leftJoinMock.toHaveBeenCalledTimes(2)`. After V2 it will be 3. Update it:

```typescript
// Before
expect(leftJoinMock).toHaveBeenCalledTimes(2);

// After
expect(leftJoinMock).toHaveBeenCalledTimes(3);
```

### 6b. Add join-count assertions to `getAllUpcomingAppointments` test

The existing test only checks `orderByMock`. Add the join assertion:

```typescript
it("returns all upcoming appointments for table rendering", async () => {
  // ... existing setup ...
  expect(result).toEqual(mockRows);
  expect(orderByMock).toHaveBeenCalledOnce();
  expect(leftJoinMock).toHaveBeenCalledTimes(3);   // ADD
});
```

### 6c. New tests — field presence

Add a new `describe` block after the existing ones:

```typescript
describe("V2: customerId and serviceName field presence", () => {
  it("getHighRiskAppointments includes customerId in each row", async () => {
    setRows([
      {
        id: "appt-1",
        customerId: "cust-abc",
        startsAt: new Date("2026-05-01T10:00:00Z"),
        endsAt: new Date("2026-05-01T11:00:00Z"),
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerPhone: "+12025550100",
        customerTier: "risk",
        customerScore: 30,
        voidedLast90Days: 2,
        confirmationStatus: "none",
        bookingUrl: null,
        smsOptIn: false,
        serviceName: "Haircut",
      },
    ]);

    const result = await getHighRiskAppointments("shop-1", 168);

    expect(result[0]?.customerId).toBe("cust-abc");
    expect(result[0]?.serviceName).toBe("Haircut");
  });

  it("getHighRiskAppointments returns null serviceName when no event type linked", async () => {
    setRows([
      {
        id: "appt-2",
        customerId: "cust-xyz",
        startsAt: new Date("2026-05-01T10:00:00Z"),
        endsAt: new Date("2026-05-01T11:00:00Z"),
        customerName: "Other User",
        customerEmail: "other@example.com",
        customerPhone: "+12025550101",
        customerTier: "risk",
        customerScore: 25,
        voidedLast90Days: 3,
        confirmationStatus: "none",
        bookingUrl: null,
        smsOptIn: false,
        serviceName: null,    // ← left join produced null
      },
    ]);

    const result = await getHighRiskAppointments("shop-1", 168);

    expect(result[0]?.customerId).toBe("cust-xyz");
    expect(result[0]?.serviceName).toBeNull();
  });

  it("getAllUpcomingAppointments includes customerId in each row", async () => {
    setRows([
      {
        id: "appt-3",
        customerId: "cust-def",
        startsAt: new Date("2026-05-02T10:00:00Z"),
        endsAt: new Date("2026-05-02T11:00:00Z"),
        customerName: "Another User",
        customerEmail: "another@example.com",
        customerPhone: "+12025550102",
        customerTier: "top",
        customerScore: 90,
        voidedLast90Days: 0,
        confirmationStatus: "none",
        bookingUrl: null,
        smsOptIn: true,
        serviceName: "Colour",
      },
    ]);

    const result = await getAllUpcomingAppointments("shop-1");

    expect(result[0]?.customerId).toBe("cust-def");
    expect(result[0]?.serviceName).toBe("Colour");
  });
});
```

**Note on `noUncheckedIndexedAccess`:** `result[0]` is `DashboardAppointment | undefined` under the strict config. The `?.` optional chaining in `result[0]?.customerId` is correct and avoids the lint error. Do not use `result[0].customerId` without the guard.

---

## Verification Sequence

### Gate 1 — Typecheck passes clean

```bash
pnpm typecheck
```

Expected: **0 errors**. This is V2's primary demo. After V2, the Drizzle-inferred return types of all three query functions include `customerId: string` and `serviceName: string | null`, satisfying the `DashboardAppointment` interface. The pre-existing type drift errors are gone.

If errors remain, check:
- All three query functions have the `eventTypes` leftJoin
- `baseAppointmentSelect` includes both `customerId` and `serviceName`
- The import includes `eventTypes`

### Gate 2 — Lint

```bash
pnpm lint
```

Expected: 0 warnings, 0 errors. Watch for `noUnusedLocals` — `eventTypes` must be referenced in at least one join or the import triggers an error.

### Gate 3 — Updated join-count test passes

```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
```

Expected: the updated `leftJoinMock.toHaveBeenCalledTimes(3)` assertion passes for `getHighRiskAppointments`. New field-presence tests pass.

### Gate 4 — Full suite, no regressions

```bash
pnpm test
```

Expected: all tests green. Key regression to watch: the V1 `getDashboardData` accumulator tests — adding the `eventTypes` join to `getDashboardData` does not change the mock's row output, so those tests are unaffected.

---

## Sufficient Conditions Checklist (from shaping.md)

- [ ] `pnpm typecheck` exits 0 — **this is the V2 demo gate**
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, no regressions
- [ ] `getHighRiskAppointments` leftJoin count test passes at 3
- [ ] `getAllUpcomingAppointments` leftJoin count test passes at 3
- [ ] `result[0]?.customerId` populated in field-presence tests
- [ ] `result[0]?.serviceName` populated (non-null) and null cases both pass
- [ ] `customerId` and `serviceName` are `null` for no matched rows — left join, not inner join

---

## Combined Bet 1 Gate

After both V1 and V2 are merged:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

All three exit 0. This is the sufficient condition for the full Correctness Sprint.
