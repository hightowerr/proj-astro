# Bet 1 — Research Notes

**Sources:** Drizzle ORM docs — [Select](https://orm.drizzle.team/docs/select) · [Joins](https://orm.drizzle.team/docs/joins)  
**Scope:** Implementation-level details for shape parts A1–A4

---

## A1.4 — `getDepositsAtRisk()` currency-grouped query

**Pattern:** chain `.groupBy()` with the grouped column; select that column alongside the aggregation.

```typescript
// Drizzle groupBy + SUM — PostgreSQL cast pattern
const rows = await db
  .select({
    currency: payments.currency,
    total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)::int`,
  })
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(
    customerScores,
    and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, appointments.shopId))
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

// Collapse into Record<string, number>
return Object.fromEntries(rows.map((r) => [r.currency, r.total]));
```

**Casting note:** `count()` and `sum()` return `bigint` in PostgreSQL — treated as `string` at runtime unless cast.  
The codebase already uses `::int` (PostgreSQL cast syntax). Stay consistent — do not switch to SQL-standard `CAST(... AS int)`.

**`sql<number>` generic caveat:** the `<number>` type generic is a TypeScript-only annotation; Drizzle does not perform runtime coercion. The `::int` cast in the SQL string is what actually forces the numeric type at the DB layer.

---

## A1.1 + A1.2 — `dashboardAppointmentSelect` + in-memory accumulation

**Add to `dashboardAppointmentSelect`:**

```typescript
const dashboardAppointmentSelect = {
  ...baseAppointmentSelect,
  depositAmount: sql<number>`COALESCE(${payments.amountCents}, 0)`,
  depositCurrency: payments.currency,  // ← add this
};
```

**Nullability:** `payments.currency` is `text().notNull()` in schema, but the join is a `leftJoin` — if an appointment has no payment row, `depositCurrency` will be `null` at runtime despite the column constraint. Type will be `string | null`.

**Accumulation replacement in `getDashboardData()`:**

```typescript
// Before
let depositsAtRisk = 0;
...
depositsAtRisk += appointment.depositAmount;

// After
const depositsAtRisk: Record<string, number> = {};
...
if (appointment.depositAmount > 0 && appointment.depositCurrency) {
  const cur = appointment.depositCurrency;
  depositsAtRisk[cur] = (depositsAtRisk[cur] ?? 0) + appointment.depositAmount;
}
```

Guard `depositAmount > 0` avoids inserting zero-value keys for appointments with no payment record (COALESCE returns 0 on null).

---

## A1.3 — `DashboardData` and `DashboardAppointment` type changes

Two type changes needed:

```typescript
// src/types/dashboard.ts

export interface DashboardAppointment {
  // ...existing fields...
  depositAmount: number;       // ← add (was only in dashboardAppointmentSelect, not the type)
  depositCurrency: string | null; // ← add
}

export interface DashboardData {
  // ...existing fields...
  depositsAtRisk: Record<string, number>; // ← was: number
}
```

**Note:** `DashboardAppointment` currently has no `depositAmount` field even though `dashboardAppointmentSelect` selects it. Queries using `baseAppointmentSelect` (not `dashboardAppointmentSelect`) won't have this field — those are `getHighRiskAppointments()` and `getAllUpcomingAppointments()`. Check whether callers of those functions ever access `depositAmount` before adding it to the interface.

---

## A2 — `SummaryCards` currency rendering

**Rendering logic:**

```typescript
function renderDepositsAtRisk(depositsAtRisk: Record<string, number>): React.ReactNode {
  const entries = Object.entries(depositsAtRisk);

  if (entries.length === 0) return formatCurrency(0, "USD");

  if (entries.length === 1) {
    const [currency, amountCents] = entries[0];
    return formatCurrency(amountCents, currency);
  }

  // Multiple currencies — Option B selected: neutral label, no layout change
  return "Multiple currencies";
}
```

**`formatCurrency` update:**

```typescript
// Before (hardcoded USD)
function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

// After (currency param)
function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
```

**Decision: Option B selected.** Render `"Multiple currencies"` as a plain string — no list, no layout change.

---

## A4.3 — `eventTypes` left join chaining

**Pattern:** Drizzle chains `.leftJoin()` calls sequentially. No syntax change needed — just append another call after the existing joins.

```typescript
// Existing pattern (three joins)
db.select(baseAppointmentSelect)
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(customerScores, and(...))
  .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))

// After adding eventTypes (four joins)
db.select(baseAppointmentSelect)
  .from(appointments)
  .innerJoin(customers, eq(appointments.customerId, customers.id))
  .leftJoin(customerScores, and(...))
  .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
  .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))  // ← add
```

**Nullability:** Left join makes `eventTypes.name` → `string | null` in the inferred type.  
This aligns exactly with `DashboardAppointment.serviceName: string | null` — no type mismatch.

**Fan-out risk:** None. `appointments.eventTypeId` is a single UUID FK — one appointment maps to at most one event type. No row multiplication from this join.

**Import:** Add `eventTypes` to the existing schema import in `dashboard.ts`:

```typescript
// Before
import { appointments, customerContactPrefs, customers, customerScores, payments } from "@/lib/schema";

// After
import { appointments, customerContactPrefs, customers, customerScores, eventTypes, payments } from "@/lib/schema";
```

---

## A3 — `customerId` select

No research needed — direct column reference. One line:

```typescript
const baseAppointmentSelect = {
  id: appointments.id,
  customerId: appointments.customerId,  // ← add (was in type, missing from select)
  ...
};
```

---

## Pre-Implementation Grep

Before starting, run these to bound the type-cascade impact:

```bash
# Find all consumers of DashboardData.depositsAtRisk
grep -rn "depositsAtRisk" src/

# Find all callers of getDepositsAtRisk() standalone function
grep -rn "getDepositsAtRisk" src/

# Confirm no other formatCurrency callers outside summary-cards.tsx
grep -rn "formatCurrency" src/
```
