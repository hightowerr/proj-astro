# V1 Implementation Plan — Customer Quick-Find

**Slice:** V1 (Customer Quick-Find)  
**Appetite:** ~1–1.5 days  
**Prerequisite:** Bet 1 fully applied ✅  
**Files created:** 4 new (`types/search.ts`, `queries/search.ts`, `api/search/route.ts`, `dashboard-search.tsx`)  
**Files modified:** 1 (`page.tsx`)  
**Tests:** `src/app/api/search/__tests__/route.test.ts` (new)

---

## Current state (confirmed)

| Location | Current | Needs to become |
|----------|---------|-----------------|
| `src/types/search.ts` | does not exist | `SearchResponse`, `CustomerSearchResult`, `AppointmentSearchResult` |
| `src/lib/queries/search.ts` | does not exist | `searchCustomers(shopId, q)` |
| `src/app/api/search/route.ts` | does not exist | `GET /api/search?q=` authenticated route |
| `src/components/dashboard/dashboard-search.tsx` | does not exist | `DashboardSearch` client component (customers group) |
| `src/app/app/dashboard/page.tsx:60–65` | `<header>` with `<h1>` + `<p>` only | Add `<DashboardSearch />` below the subtitle |

---

## Change order

Types first — defines the contract that the route's `satisfies SearchResponse` check and the component's `as SearchResponse` cast depend on. Then query, route, component, page mount.

```
1. src/types/search.ts                           ← type contract
2. src/lib/queries/search.ts                     ← searchCustomers query
3. src/app/api/search/route.ts                   ← API route
4. src/components/dashboard/dashboard-search.tsx ← client component
5. src/app/app/dashboard/page.tsx                ← mount
6. src/app/api/search/__tests__/route.test.ts    ← tests
```

---

## Step 1 — `src/types/search.ts` (new file)

```typescript
export interface CustomerSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tier: "top" | "neutral" | "risk" | null;
  href: string;
}

export interface AppointmentSearchResult {
  id: string;
  startsAt: Date;
  status: "pending" | "booked" | "ended";
  customerName: string;
  eventTypeName: string | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  customers: CustomerSearchResult[];
  appointments: AppointmentSearchResult[];
}
```

**Why `AppointmentSearchResult` is defined in V1:** The route returns `{ ..., appointments: [] }` typed as `SearchResponse`. The component casts the fetch response to `SearchResponse`. Both need `AppointmentSearchResult` in the type even though V1 never populates it. This avoids a type change in V2.

---

## Step 2 — `src/lib/queries/search.ts` (new file)

```typescript
import { and, eq, ilike, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, customerScores } from "@/lib/schema";
import type { CustomerSearchResult } from "@/types/search";

export async function searchCustomers(
  shopId: string,
  q: string
): Promise<CustomerSearchResult[]> {
  const pattern = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  // or() with ≥2 non-undefined SQL args always returns SQL — assertion is safe
  const textConditions = or(
    ilike(customers.fullName, pattern),
    ilike(customers.email, pattern),
    digits.length >= 4 ? like(customers.phone, `%${digits}`) : undefined,
  )!;

  const rows = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      tier: customerScores.tier,
    })
    .from(customers)
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, customers.id),
        eq(customerScores.shopId, shopId)
      )
    )
    .where(and(eq(customers.shopId, shopId), textConditions))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    tier: row.tier ?? null,
    href: `/app/customers/${row.id}`,
  }));
}
```

**Why `or()!` is safe:** `ilike(customers.fullName, pattern)` and `ilike(customers.email, pattern)` are both concrete SQL expressions — two non-undefined args are always present. `or()` only returns `undefined` when every argument is `undefined`.

**Why `like` for phone (not `ilike`):** Phone values are E.164 (`+12025550100`), all digits. Case is irrelevant; `like` is correct and slightly cheaper.

**Why `digits.length >= 4` guard:** Prevents overly broad phone matches on 1–3 digit fragments. `4` matches the analysis contract minimum.

---

## Step 3 — `src/app/api/search/route.ts` (new file)

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchCustomers } from "@/lib/queries/search";
import { getShopByOwnerId } from "@/lib/queries/shops";
import type { SearchResponse } from "@/types/search";

const MAX_QUERY_LENGTH = 80;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const nonSpaceLen = q.replace(/\s/g, "").length;
  if (nonSpaceLen < 2) {
    return NextResponse.json({
      query: q,
      customers: [],
      appointments: [],
    } satisfies SearchResponse);
  }

  const customerResults = await searchCustomers(shop.id, q);

  return NextResponse.json({
    query: q,
    customers: customerResults,
    appointments: [],
  } satisfies SearchResponse);
}
```

**Why `satisfies SearchResponse` (not type annotation):** `satisfies` verifies the shape at the call site without widening. If `SearchResponse` changes, this errors here rather than failing silently at the consumer.

**Why short query returns 200 (not 400):** The client needs a consistent shape to render an empty state. A 400 would require the client to distinguish "validation error" from "no results" — unnecessary complexity when the right behavior is identical.

**No `Promise.all` in V1:** V1 only runs `searchCustomers`. V2 extends this to `Promise.all([searchCustomers, searchAppointments])`.

---

## Step 4 — `src/components/dashboard/dashboard-search.tsx` (new file)

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSearchResult, SearchResponse } from "@/types/search";

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce + fetch with AbortController
  useEffect(() => {
    const trimmed = query.trim();
    const nonSpaceLen = trimmed.replace(/\s/g, "").length;

    if (nonSpaceLen < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  // Click-outside to close
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const items: CustomerSearchResult[] = results?.customers ?? [];
  const hasResults = items.length > 0;
  const isEmptyState =
    open && results !== null && !hasResults;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === "Enter") {
      const item = items[activeIndex];
      if (item) {
        router.push(item.href);
        setOpen(false);
        setQuery("");
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search appointments or clients"
        aria-label="Quick search"
        autoComplete="off"
        className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-text-light-muted outline-none ring-primary focus:ring-2"
      />

      {(open && (hasResults || isEmptyState)) ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full z-30 mt-1.5 w-full rounded-xl border border-white/10 bg-bg-dark p-2 shadow-2xl shadow-black/40"
        >
          {hasResults && (
            <>
              <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-light-muted">
                Customers
              </p>
              {items.map((customer, index) => (
                <button
                  key={customer.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  type="button"
                  onClick={() => handleSelect(customer.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                    activeIndex === index ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-white">
                      {customer.fullName}
                    </span>
                    <span className="block truncate text-xs text-text-light-muted">
                      {customer.email}
                    </span>
                  </span>
                  {customer.tier !== null ? (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        customer.tier === "top"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : customer.tier === "risk"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-text-light-muted"
                      }`}
                    >
                      {customer.tier}
                    </span>
                  ) : null}
                </button>
              ))}
            </>
          )}

          {isEmptyState ? (
            <p className="px-2 py-3 text-sm text-text-light-muted">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

**Key decisions:**

- `max-w-md` on the wrapper: constrains the search to a readable width in the header
- `bg-bg-dark` for the popover: matches existing popover pattern (`contact-popover.tsx`)
- `bg-white/5` on the input: lighter than `bg-bg-dark` to signal interactivity
- `items[activeIndex]` requires `if (item)` guard — `noUncheckedIndexedAccess` returns `CustomerSearchResult | undefined`
- `customer.tier !== null` (not just `customer.tier`) — avoids falsy check masking `"neutral"` (which is truthy, so this is fine either way, but `!== null` is explicit about intent)
- No `TierBadge` import — inline tier badge avoids coupling search component to the customers component tree

---

## Step 5 — `src/app/app/dashboard/page.tsx`

Add `DashboardSearch` import and mount it in the header. Two edits:

**Import** — add to existing imports:
```typescript
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
```

**Header** — replace the existing `<header>` block:

```tsx
// Before (lines 60–65):
<header className="space-y-2">
  <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
  <p className="text-sm text-text-light-muted">
    Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
  </p>
</header>

// After:
<header className="space-y-4">
  <div className="space-y-2">
    <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
    <p className="text-sm text-text-light-muted">
      Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
    </p>
  </div>
  <DashboardSearch />
</header>
```

**Why `space-y-4` on header:** The search input adds vertical spacing below the title/subtitle block. Changing from `space-y-2` to `space-y-4` gives the input breathing room without adjusting margin manually.

**Why wrap title + subtitle in a `<div>`:** Preserves the `space-y-2` gap between title and subtitle as a nested group. The header's `space-y-4` then spaces the whole title block from the search input.

`DashboardSearch` is a `"use client"` component inside a server component (`page.tsx`). This is valid in Next.js 15/16 — server components can import client components directly.

---

## Step 6 — Tests

New file: `src/app/api/search/__tests__/route.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, getShopByOwnerIdMock, searchCustomersMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    getShopByOwnerIdMock: vi.fn(),
    searchCustomersMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: getShopByOwnerIdMock,
}));

vi.mock("@/lib/queries/search", () => ({
  searchCustomers: searchCustomersMock,
}));

const { GET } = await import("../route");

describe("GET /api/search", () => {
  const makeRequest = (q = "john") =>
    new Request(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`);

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getShopByOwnerIdMock.mockResolvedValue({ id: "shop-1", name: "Test Shop" });
    searchCustomersMock.mockResolvedValue([]);
  });

  describe("auth guard", () => {
    it("returns 401 when session is null", async () => {
      getSessionMock.mockResolvedValue(null);
      const response = await GET(makeRequest());
      expect(response.status).toBe(401);
    });

    it("returns 401 when session has no user id", async () => {
      getSessionMock.mockResolvedValue({ user: null });
      const response = await GET(makeRequest());
      expect(response.status).toBe(401);
    });

    it("returns 404 when shop not found", async () => {
      getShopByOwnerIdMock.mockResolvedValue(null);
      const response = await GET(makeRequest());
      expect(response.status).toBe(404);
    });
  });

  describe("input validation", () => {
    it("returns 200 empty results for 1-char query", async () => {
      const response = await GET(makeRequest("a"));
      const body = (await response.json()) as { customers: unknown[]; appointments: unknown[] };
      expect(response.status).toBe(200);
      expect(body.customers).toHaveLength(0);
      expect(body.appointments).toHaveLength(0);
      expect(searchCustomersMock).not.toHaveBeenCalled();
    });

    it("returns 200 empty results for blank query", async () => {
      const response = await GET(makeRequest(""));
      expect(response.status).toBe(200);
      expect(searchCustomersMock).not.toHaveBeenCalled();
    });

    it("returns 200 empty results for spaces-only query", async () => {
      const response = await GET(makeRequest("   "));
      expect(response.status).toBe(200);
      expect(searchCustomersMock).not.toHaveBeenCalled();
    });

    it("returns 400 for query exceeding 80 chars", async () => {
      const response = await GET(makeRequest("a".repeat(81)));
      expect(response.status).toBe(400);
    });

    it("calls searchCustomers for a valid 2+ char query", async () => {
      const response = await GET(makeRequest("jo"));
      expect(response.status).toBe(200);
      expect(searchCustomersMock).toHaveBeenCalledWith("shop-1", "jo");
    });
  });

  describe("response shape", () => {
    it("returns customers from searchCustomers with appointments: []", async () => {
      const mockCustomer = {
        id: "cust-1",
        fullName: "John Smith",
        email: "john@example.com",
        phone: "+12025550100",
        tier: "top" as const,
        href: "/app/customers/cust-1",
      };
      searchCustomersMock.mockResolvedValue([mockCustomer]);

      const response = await GET(makeRequest("john"));
      const body = (await response.json()) as {
        query: string;
        customers: typeof mockCustomer[];
        appointments: unknown[];
      };

      expect(response.status).toBe(200);
      expect(body.query).toBe("john");
      expect(body.customers).toHaveLength(1);
      expect(body.customers[0]?.fullName).toBe("John Smith");
      expect(body.customers[0]?.href).toBe("/app/customers/cust-1");
      expect(body.appointments).toHaveLength(0);
    });

    it("passes trimmed query to searchCustomers", async () => {
      await GET(makeRequest("  john  "));
      expect(searchCustomersMock).toHaveBeenCalledWith("shop-1", "john");
    });
  });
});
```

**Test note on `body.customers[0]?.fullName`:** The optional chain is required because `body.customers[0]` returns `typeof mockCustomer | undefined` under `noUncheckedIndexedAccess`. Safe because the test asserts `toHaveLength(1)` before accessing the item.

---

## Verification sequence

### Gate 1 — Types

```bash
pnpm typecheck
```

Expected: 0 errors. Watch for:
- `satisfies SearchResponse` in route — fails if types don't match
- `as SearchResponse` in component — fails if interface structure mismatches
- `items[activeIndex]` — TypeScript accepts `CustomerSearchResult | undefined`; the `if (item)` guard narrows it

### Gate 2 — Lint

```bash
pnpm lint
```

Expected: 0 warnings. Watch for:
- `noUnusedLocals` — ensure `AppointmentSearchResult` import in route is used (it is, via `satisfies SearchResponse`)
- No unused variables in component

### Gate 3 — New tests pass

```bash
pnpm test src/app/api/search/__tests__/route.test.ts
```

Expected: all tests green. Specifically:
- 401 test confirms auth guard is first
- Short query test confirms no DB call on `"a"`
- Shape test confirms `appointments: []` in V1

### Gate 4 — No regressions

```bash
pnpm test
```

Expected: full suite green, including existing dashboard tests. The dashboard page change (mounting `DashboardSearch`) is a JSX-only change — no query logic touched.

---

## Sufficient conditions checklist

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0, no regressions
- [ ] `GET /api/search` without session → 401
- [ ] `GET /api/search?q=a` → 200 `{ customers: [], appointments: [] }`, no DB call
- [ ] `GET /api/search?q=<81 chars>` → 400
- [ ] `GET /api/search?q=john` → 200 `{ query: "john", customers: [...], appointments: [] }`
- [ ] Each customer result has `href: "/app/customers/[id]"` 
- [ ] `tier` is `null` for customers without a computed score
- [ ] `DashboardSearch` renders in the dashboard header below title/subtitle
- [ ] Typing 1 char → no popover
- [ ] Typing 2+ chars → popover appears after 300ms debounce
- [ ] Empty search results → "No results for …" message shown
- [ ] Pressing Esc → popover closes
- [ ] Clicking outside wrapper → popover closes
- [ ] Pressing Enter on highlighted item → navigates to customer href
