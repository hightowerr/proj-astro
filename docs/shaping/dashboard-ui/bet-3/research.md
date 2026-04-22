# Bet 3 — Research Notes

**Sources:** Drizzle ORM type definitions, existing dashboard components, existing route tests, Next.js 15/16 routing
**Scope:** Technical details for A1–A5

---

## A2 / A3 — `ilike`, `like`, `or` in Drizzle

Both `ilike` and `like` are exported from `drizzle-orm` (confirmed in `node_modules/drizzle-orm/sql/expressions/conditions.d.ts`):

```typescript
function like(column: Column | SQL.Aliased | SQL, value: string | SQLWrapper): SQL
function ilike(column: Column | SQL.Aliased | SQL, value: string | SQLWrapper): SQL
```

`or` accepts `(SQLWrapper | undefined)[]` and returns `SQL | undefined`:
```typescript
function or(...conditions: (SQLWrapper | undefined)[]): SQL | undefined
```

**`or()` returns `SQL | undefined`** — important TypeScript detail. When `or()` always receives at least 2 non-undefined SQL args, its return is always `SQL`, but the TypeScript type doesn't narrow this. Use a non-null assertion (`!`) in that case:

```typescript
// Always ≥2 non-undefined args → safe to assert non-null
const textConditions = or(
  ilike(customers.fullName, pattern),
  ilike(customers.email, pattern),
  phoneCondition,           // may be undefined — or() handles it
)!;
```

`and()` has the same signature — accepts `(SQLWrapper | undefined)[]`, returns `SQL | undefined`. Since the WHERE clause always has `eq(customers.shopId, shopId)` plus `textConditions`, it will never be undefined in practice, but TypeScript requires the same treatment if `.where()` demands `SQL`.

**Full import line for `search.ts`:**
```typescript
import { and, eq, ilike, like, or } from "drizzle-orm";
```

---

## A2 — Phone digit-suffix matching

Stored phones are E.164 format (e.g., `+12025550100`). `normalizePhoneNumber` produces this on write. A suffix match catches last-N-digits lookups common in SMS/call contexts.

```typescript
const digits = q.replace(/\D/g, "");
const phoneCondition = digits.length >= 4
  ? like(customers.phone, `%${digits}`)
  : undefined;
```

`like` (case-sensitive) is correct here — phone digits are case-insensitive by nature. No need for `ilike`.

Guard: skip the phone condition if fewer than 4 digits are extracted. This avoids broad matches on short digit sequences.

**Edge case: query is all digits (e.g., `"5550100"`)** — both ILIKE conditions on `fullName` and `email` will return no rows (pattern `%5550100%`), but the phone suffix match will fire. The `or()` returns any row matching any condition, so a pure-digit query correctly falls through to phone matching.

---

## A2 — `or()` non-null assertion pattern

```typescript
const textConditions = or(
  ilike(customers.fullName, pattern),          // always present
  ilike(customers.email, pattern),             // always present
  digits.length >= 4
    ? like(customers.phone, `%${digits}`)
    : undefined,                               // filtered by or()
)!;  // non-null: ≥2 concrete SQL args always produce SQL
```

The `!` assertion is safe — `or()` only returns `undefined` when called with zero arguments or all-undefined arguments. Neither is possible here.

---

## A2 — LEFT JOIN customerScores

Match the pattern from `listCustomersForShop` in `src/lib/queries/customers.ts`:

```typescript
.leftJoin(
  customerScores,
  and(
    eq(customerScores.customerId, customers.id),
    eq(customerScores.shopId, shopId)
  )
)
```

`customerScores.tier` is `"top" | "neutral" | "risk"` (non-null when the join matches). Map with `row.tier ?? null` — customers without a computed score return `tier: null`.

---

## A1 — Auth pattern (confirmed in codebase)

From `src/app/api/appointments/[id]/confirm/route.ts`:

```typescript
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const shop = await getShopByOwnerId(session.user.id);
if (!shop) {
  return NextResponse.json({ error: "Shop not found" }, { status: 404 });
}
```

The search route follows this exact pattern.

---

## A1 — Input validation approach

All guards are server-side, applied before any DB call:

```typescript
const raw = new URL(request.url).searchParams.get("q") ?? "";
const q = raw.trim();

if (q.length > 80) {
  return NextResponse.json({ error: "Query too long" }, { status: 400 });
}

const nonSpaceLen = q.replace(/\s/g, "").length;
if (nonSpaceLen < 2) {
  return NextResponse.json(
    { query: q, customers: [], appointments: [] } satisfies SearchResponse
  );
}
```

Short queries return 200 with empty results (not 400) — the UI needs a clean `{ customers: [], appointments: [] }` shape, not an error response, so it can display the empty state correctly.

Only queries longer than 80 chars are outright rejected with 400.

---

## A4 — Debounce + AbortController pattern

Uses `useEffect` with cleanup. Creates a new `AbortController` per effect run:

```typescript
useEffect(() => {
  const trimmed = query.trim();
  if (trimmed.replace(/\s/g, "").length < 2) {
    setResults(null);
    setOpen(false);
    return;
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as SearchResponse;
      setResults(data);
      setOpen(true);
      setActiveIndex(-1);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // other errors: silently ignore (network blip, etc.)
    }
  }, 300);

  return () => {
    window.clearTimeout(timeout);
    controller.abort();
  };
}, [query]);
```

**Why AbortController:** If the user types faster than 300ms, the cleanup fires before the fetch starts — the `window.clearTimeout` cancels the scheduled fetch. If the user types after 300ms (fetch in-flight), the cleanup aborts the ongoing fetch. The `AbortError` catch prevents that abort from surfacing as an error.

**`window.clearTimeout` / `window.setTimeout`**: matches the existing `contact-popover.tsx` pattern in this codebase.

---

## A4 — Click-outside pattern

From `contact-popover.tsx` (Esc key) and adapted to mousedown:

```typescript
useEffect(() => {
  const handleClick = (event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);
```

The wrapper `ref` wraps both the input and the popover, so clicking inside either doesn't close the results.

---

## A4 — Dark UI styling (confirmed from existing components)

**Input field** — from `all-appointments-table.tsx`'s `<select>`:
```
rounded-md border border-white/20 bg-bg-dark px-3 py-2 text-sm text-white outline-none ring-primary focus:ring-2
```
For search input, add `placeholder:text-text-light-muted` and `bg-white/5` (lighter than `bg-bg-dark` to signal interactivity).

**Popover container** — from `contact-popover.tsx`:
```
absolute z-20 mt-2 rounded-xl border border-white/10 bg-bg-dark shadow-2xl shadow-black/30
```
Make it `w-full` and add `p-2` for inner padding. Wrap the input + popover in `relative`.

**Result item (resting):** `flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-white/5`

**Result item (active/highlighted):** `bg-white/10`

**Group header:** `px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-light-muted`

**Empty state text:** `px-2 py-3 text-sm text-text-light-muted`

**Tier badge — inline (no TierBadge import needed for search):**
```
rounded px-1.5 py-0.5 text-[10px] font-bold uppercase
top:     bg-emerald-500/20 text-emerald-300
risk:    bg-red-500/20 text-red-300
neutral: bg-white/10 text-text-light-muted
```

---

## A4 — `useRouter` in Next.js 15/16

```typescript
import { useRouter } from "next/navigation";
const router = useRouter();
// then:
router.push(href);
```

`next/navigation` is the correct import for app-router client components in Next.js 15/16.

---

## A4 — `noUncheckedIndexedAccess` and result arrays

`results?.customers[activeIndex]` returns `CustomerSearchResult | undefined` under `noUncheckedIndexedAccess`. Always guard with:

```typescript
const item = allItems[activeIndex];
if (item) {
  router.push(item.href);
}
```

`Array.prototype.map()` is unaffected — iterates safely over elements. No guard needed for `.map()`.

---

## Route testing pattern (confirmed)

From `src/app/api/availability/route.test.ts`:

```typescript
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: getShopByOwnerIdMock,
}));

vi.mock("@/lib/queries/search", () => ({
  searchCustomers: searchCustomersMock,
}));

const { GET } = await import("./route");

// then:
const response = await GET(
  new Request("http://localhost:3000/api/search?q=john")
);
expect(response.status).toBe(200);
const body = await response.json();
```

Auth mock:
```typescript
getSessionMock.mockResolvedValue({ user: { id: "user-1" } });  // authenticated
getSessionMock.mockResolvedValue(null);                         // unauthenticated
```

---

## Summary table

| Question | Answer |
|----------|--------|
| Is `ilike` available in drizzle-orm? | Yes — `import { ilike } from "drizzle-orm"` |
| Does `or()` handle `undefined` args? | Yes — skips them; returns `SQL \| undefined` |
| How to do phone suffix match? | `like(customers.phone, \`%${digits}\`)` — case-sensitive is fine for digits |
| What to assert on `or()` return? | `!` non-null when ≥2 non-undefined args are guaranteed |
| Debounce pattern? | `window.setTimeout` + `AbortController` per effect run |
| Click-outside pattern? | `document.addEventListener("mousedown", ...)` + `wrapperRef.contains()` |
| Dark UI input/popover class source? | `all-appointments-table.tsx` (input), `contact-popover.tsx` (popover) |
| `useRouter` import? | `import { useRouter } from "next/navigation"` |
| `noUncheckedIndexedAccess` impact? | Array index access returns `T \| undefined` — guard with `if (item)` |
| Auth mock pattern? | `vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockFn } } }))` |
