# V2 Implementation Plan — Appointment Search

**Slice:** V2 (Appointment Search)  
**Appetite:** ~0.5–1 day  
**Prerequisite:** V1 fully applied ✅  
**Files modified:** 4 (all created in V1; no new files)

---

## Current state (confirmed after V1)

| Location | Current (end of V1) | Needs to become |
|----------|---------------------|-----------------|
| `src/lib/queries/search.ts` | `searchCustomers` only | Add `searchAppointments` |
| `src/app/api/search/route.ts` | `appointments: []` hardcoded | Run `Promise.all([searchCustomers, searchAppointments])` |
| `src/components/dashboard/dashboard-search.tsx` | Customers group only; `items: CustomerSearchResult[]` | Multi-group (customers + appointments); unified keyboard nav |
| `src/app/api/search/__tests__/route.test.ts` | Customer tests only | Add appointment search tests |

---

## Change order

Query first — the route can't wire what doesn't exist. Route second — TypeScript will error if `searchAppointments` is referenced but not exported. Component last — it consumes the now-complete `SearchResponse.appointments` field.

```
1. src/lib/queries/search.ts        ← add searchAppointments
2. src/app/api/search/route.ts      ← wire into Promise.all
3. src/components/dashboard/dashboard-search.tsx  ← add appointment group + refactor keyboard nav
4. src/app/api/search/__tests__/route.test.ts     ← extend tests
```

---

## Step 1 — `src/lib/queries/search.ts`

**Add** to the existing file (below `searchCustomers`):

**New import additions** at the top of the existing file:

```typescript
import { and, asc, eq, ilike, inArray, like, or } from "drizzle-orm";  // add inArray, asc
import { db } from "@/lib/db";
import { appointments, customers, customerScores, eventTypes } from "@/lib/schema";  // add appointments, eventTypes
import type { AppointmentSearchResult, CustomerSearchResult } from "@/types/search";  // add AppointmentSearchResult
```

**New function** (add below `searchCustomers`):

```typescript
export async function searchAppointments(
  shopId: string,
  q: string
): Promise<AppointmentSearchResult[]> {
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pattern = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  // or() with ≥3 non-undefined args always returns SQL — assertion is safe
  const textConditions = or(
    ilike(customers.fullName, pattern),
    ilike(customers.email, pattern),
    ilike(eventTypes.name, pattern),
    digits.length >= 4 ? like(customers.phone, `%${digits}`) : undefined,
  )!;

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      customerName: customers.fullName,
      eventTypeName: eventTypes.name,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
    .where(
      and(
        eq(appointments.shopId, shopId),
        inArray(appointments.status, ["pending", "booked", "ended"]),
        gte(appointments.endsAt, windowStart),
        textConditions
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    status: row.status as "pending" | "booked" | "ended",
    customerName: row.customerName,
    eventTypeName: row.eventTypeName,
    href: `/app/appointments/${row.id}`,
  }));
}
```

**Why `inArray` for status (not `or(eq(...), ...)`)**:
- `inArray(appointments.status, ["pending", "booked", "ended"])` compiles to `status IN ('pending','booked','ended')` — one operator, readable
- Equivalent to three `eq` conditions joined by `or`, but cleaner
- Confirmed available: `appointments.ts` imports `inArray` from `drizzle-orm`

**Why the status cast `row.status as "pending" | "booked" | "ended"`**:
- Drizzle infers `appointments.status` as the full enum: `"pending" | "booked" | "cancelled" | "ended"`
- The `inArray` WHERE clause excludes `"cancelled"` at runtime, but TypeScript can't narrow this statically
- The cast is justified by the WHERE clause — not a blind assertion
- `AppointmentSearchResult.status` is typed as the 3-value union (defined in V1) — the cast bridges the gap

**Why `eventTypeName: row.eventTypeName` (not `?? null`)**:
- `eventTypes.name` is `text().notNull()` in the schema, but after a LEFT JOIN Drizzle infers it as `string | null`
- The value is already `string | null` — no coalescing needed
- `AppointmentSearchResult.eventTypeName` is `string | null` — types align directly

**Why `gte(appointments.endsAt, windowStart)` (not `startsAt`)**:
- The analysis contract specifies `endsAt >= now() - 7 days`
- Using `endsAt` keeps recently-ended appointments visible (e.g., an appointment that ended yesterday is still findable)
- Using `startsAt` would exclude appointments that have started but not yet ended
- Matches the appointment search scope defined in Spike 1

**Missing import**: `gte` needs to be added to the import from `drizzle-orm`. The current file only imports `and, eq, ilike, like, or`. Full updated import:

```typescript
import { and, asc, eq, gte, ilike, inArray, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, customerScores, eventTypes } from "@/lib/schema";
import type { AppointmentSearchResult, CustomerSearchResult } from "@/types/search";
```

---

## Step 2 — `src/app/api/search/route.ts`

Two changes: add the `searchAppointments` import, and replace the single `searchCustomers` call with `Promise.all`.

**Updated import line:**

```typescript
import { searchCustomers, searchAppointments } from "@/lib/queries/search";
```

**Replace the body from `const customerResults = ...` to the return:**

```typescript
// Before (V1):
const customerResults = await searchCustomers(shop.id, q);

return NextResponse.json({
  query: q,
  customers: customerResults,
  appointments: [],
} satisfies SearchResponse);

// After (V2):
const [customerResults, appointmentResults] = await Promise.all([
  searchCustomers(shop.id, q),
  searchAppointments(shop.id, q),
]);

return NextResponse.json({
  query: q,
  customers: customerResults,
  appointments: appointmentResults,
} satisfies SearchResponse);
```

**Why `Promise.all`**: Both queries are independent shop-scoped reads. Running them in parallel halves the round-trip time for the common case where both groups return results.

**`satisfies SearchResponse` still holds**: Both `customerResults` and `appointmentResults` match their respective array types — the compile-time check confirms this automatically.

---

## Step 3 — `src/components/dashboard/dashboard-search.tsx`

Three changes: add `AppointmentSearchResult` import, refactor keyboard nav to a unified item list, and render the appointments group.

### 3a — Updated import

```typescript
import type { AppointmentSearchResult, CustomerSearchResult, SearchResponse } from "@/types/search";
```

### 3b — Unified item list for keyboard navigation

Replace the V1 `items` derivation with a tagged union list. Add this type at the top of the function body:

```typescript
type SearchItem =
  | { type: "customer"; data: CustomerSearchResult }
  | { type: "appointment"; data: AppointmentSearchResult };
```

Replace:
```typescript
// V1:
const items: CustomerSearchResult[] = results?.customers ?? [];
const hasResults = items.length > 0;
```

With:
```typescript
// V2:
const allItems: SearchItem[] = [
  ...(results?.customers ?? []).map(
    (c): SearchItem => ({ type: "customer", data: c })
  ),
  ...(results?.appointments ?? []).map(
    (a): SearchItem => ({ type: "appointment", data: a })
  ),
];
const hasResults = allItems.length > 0;
```

### 3c — Updated keyboard handler

The `handleKeyDown` handler references `items` (V1). Replace with `allItems`:

```typescript
const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (!open) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveIndex((prev) => Math.min(prev + 1, allItems.length - 1));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveIndex((prev) => Math.max(prev - 1, -1));
  } else if (event.key === "Enter") {
    const item = allItems[activeIndex];
    if (item) {
      router.push(item.data.href);
      setOpen(false);
      setQuery("");
    }
  } else if (event.key === "Escape") {
    setOpen(false);
  }
};
```

Note: `item.data.href` — both `CustomerSearchResult` and `AppointmentSearchResult` have `href`, so this works on the discriminated union without type narrowing.

### 3d — Appointment group in JSX

The `activeIndex` for an appointment at position `j` in the appointments array is `(results?.customers ?? []).length + j`. Compute the offset inside the render:

**Add after the customer group** (inside the `hasResults` block):

```tsx
{(results?.appointments ?? []).length > 0 && (
  <>
    <p className="mt-2 px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-light-muted">
      Appointments
    </p>
    {results!.appointments.map((appointment, index) => {
      const itemIndex = (results?.customers ?? []).length + index;
      const date = new Date(appointment.startsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return (
        <button
          key={appointment.id}
          role="option"
          aria-selected={activeIndex === itemIndex}
          type="button"
          onClick={() => handleSelect(appointment.href)}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
            activeIndex === itemIndex ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-white">
              {appointment.customerName}
            </span>
            <span className="block truncate text-xs text-text-light-muted">
              {appointment.eventTypeName ?? "No service"} · {date} · {appointment.status}
            </span>
          </span>
        </button>
      );
    })}
  </>
)}
```

**Why `results!.appointments`**: Inside the `(results?.appointments ?? []).length > 0` guard, `results` is definitely non-null. The non-null assertion avoids the awkward `results?.appointments.map(...)` syntax in this context.

**Why `new Date(appointment.startsAt)`**: `appointment.startsAt` is typed as `Date` (from the query), but after JSON serialization/deserialization in the fetch response, it arrives as a string. `new Date(...)` handles both cases safely.

**`"No service"` for null `eventTypeName`**: The appointment exists but has no linked service. This is an expected case (V1 of the codebase had appointments before event types existed). A neutral fallback label is clearest.

**Status label in subtitle**: `appointment.status` is `"pending" | "booked" | "ended"` — readable as-is for the shop owner context.

---

## Step 4 — Test extension

Extend `src/app/api/search/__tests__/route.test.ts`.

**Add `searchAppointmentsMock` to the hoisted setup:**

```typescript
const { getSessionMock, getShopByOwnerIdMock, searchCustomersMock, searchAppointmentsMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    getShopByOwnerIdMock: vi.fn(),
    searchCustomersMock: vi.fn(),
    searchAppointmentsMock: vi.fn(),
  }));
```

**Update the mock** to include `searchAppointments`:

```typescript
vi.mock("@/lib/queries/search", () => ({
  searchCustomers: searchCustomersMock,
  searchAppointments: searchAppointmentsMock,
}));
```

**Update `beforeEach`** to set default for the new mock:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
  getShopByOwnerIdMock.mockResolvedValue({ id: "shop-1", name: "Test Shop" });
  searchCustomersMock.mockResolvedValue([]);
  searchAppointmentsMock.mockResolvedValue([]);  // ADD
});
```

**Add new describe block** after the existing `"response shape"` block:

```typescript
describe("appointment search (V2)", () => {
  it("calls searchAppointments with the same shopId and query", async () => {
    await GET(makeRequest("haircut"));
    expect(searchAppointmentsMock).toHaveBeenCalledWith("shop-1", "haircut");
  });

  it("runs searchCustomers and searchAppointments in parallel", async () => {
    // Both mocks are called — confirms Promise.all pattern
    await GET(makeRequest("john"));
    expect(searchCustomersMock).toHaveBeenCalledOnce();
    expect(searchAppointmentsMock).toHaveBeenCalledOnce();
  });

  it("returns appointments from searchAppointments in response", async () => {
    const mockAppointment = {
      id: "appt-1",
      startsAt: new Date("2026-05-01T10:00:00.000Z"),
      status: "booked" as const,
      customerName: "Alex Kim",
      eventTypeName: "Haircut",
      href: "/app/appointments/appt-1",
    };
    searchAppointmentsMock.mockResolvedValue([mockAppointment]);

    const response = await GET(makeRequest("haircut"));
    const body = (await response.json()) as {
      appointments: typeof mockAppointment[];
    };

    expect(response.status).toBe(200);
    expect(body.appointments).toHaveLength(1);
    expect(body.appointments[0]?.customerName).toBe("Alex Kim");
    expect(body.appointments[0]?.href).toBe("/app/appointments/appt-1");
  });

  it("short query still returns empty appointments without DB call", async () => {
    const response = await GET(makeRequest("a"));
    expect(searchAppointmentsMock).not.toHaveBeenCalled();
    const body = (await response.json()) as { appointments: unknown[] };
    expect(body.appointments).toHaveLength(0);
  });
});
```

---

## Verification sequence

### Gate 1 — Types

```bash
pnpm typecheck
```

Expected: 0 errors. Watch for:
- `searchAppointments` return type — `Promise<AppointmentSearchResult[]>`
- `row.status as "pending" | "booked" | "ended"` — valid cast (widening to union subset)
- `allItems[activeIndex]` in component — TypeScript accepts `SearchItem | undefined`; the `if (item)` guard narrows it
- `item.data.href` — `href` is present on both union members; no narrowing required

### Gate 2 — Lint

```bash
pnpm lint
```

Expected: 0 warnings. Watch for:
- `noUnusedLocals` — ensure `AppointmentSearchResult` import in `dashboard-search.tsx` is consumed
- `results!.appointments` — ESLint non-null assertions are permitted here (guarded by length check)

### Gate 3 — New tests pass

```bash
pnpm test src/app/api/search/__tests__/route.test.ts
```

Expected: all tests green — both V1 tests and the new V2 block. Specifically:
- `"runs searchCustomers and searchAppointments in parallel"` confirms `Promise.all` wiring (both mocks called once)
- `"short query still returns empty appointments without DB call"` confirms validation guard blocks both queries

### Gate 4 — No regressions

```bash
pnpm test
```

Expected: full suite green. The `dashboard-search.tsx` component is UI-only (no server logic) and has no existing tests — no regression risk from the component changes.

---

## Sufficient conditions checklist

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, no regressions
- [ ] `searchCustomers` and `searchAppointments` both called on a valid query
- [ ] Short query (`< 2 chars`) → `searchAppointments` not called
- [ ] Route returns real `appointments` array (not `[]`) on a valid query
- [ ] `href` on each appointment result is `/app/appointments/[id]`
- [ ] `eventTypeName` is `null` when appointment has no linked service
- [ ] Appointment group rendered in the popover below customers group
- [ ] Keyboard navigation (down arrow) moves through customers then appointments continuously
- [ ] Enter on a highlighted appointment item navigates to `/app/appointments/[id]`
- [ ] `status = 'cancelled'` appointments excluded (`inArray` filter)
- [ ] `endsAt < now() - 7 days` appointments excluded (`gte` filter)
