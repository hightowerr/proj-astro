# V1 Plan — Tab + Feed (Bookings)

**Slice:** V1 of 2  
**Bet:** Bet 4 — Daily Log Tab  
**Demo:** `/app/dashboard?view=log` shows a working tab switcher and a feed of new booking events from the last 7 days, grouped by calendar day with customer names and links to appointment detail pages.

---

## Files in Scope

| File | Action |
|------|--------|
| `src/lib/schema.ts` | Modify — add `appointment_events_shop_occurred_idx` index |
| `src/types/dashboard.ts` | Modify — add `DashboardLogItem` interface |
| `src/lib/queries/dashboard.ts` | Modify — add `getDashboardDailyLog` (bookings source only) |
| `src/lib/queries/__tests__/dashboard.test.ts` | Modify — add `getDashboardDailyLog` unit tests |
| `src/app/app/dashboard/page.tsx` | Modify — add `?view` param, tab switcher, conditional log render |
| `src/components/dashboard/daily-log-feed.tsx` | Create — DailyLogFeed component |

---

## Implementation Steps

### Step 1 — Schema index (N1)

In `src/lib/schema.ts`, add one line to the `appointmentEvents` table index array:

```typescript
// existing indexes...
uniqueIndex("appointment_events_type_time_unique").on(
  table.appointmentId,
  table.type,
  table.occurredAt
),
// add:
index("appointment_events_shop_occurred_idx").on(table.shopId, table.occurredAt),
```

Then run:

```bash
pnpm db:generate
```

Inspect the generated `.sql` file in `drizzle/` before migrating. It must contain only a `CREATE INDEX` statement — no `ALTER TABLE`, no `DROP`, nothing destructive. Then:

```bash
pnpm db:migrate
```

---

### Step 2 — DashboardLogItem type (N2)

In `src/types/dashboard.ts`, add after the existing interfaces:

```typescript
export interface DashboardLogItem {
  id: string;
  kind:
    | "appointment_created"
    | "appointment_cancelled"
    | "outcome_resolved"
    | "message_sent"
    | "message_failed";
  occurredAt: Date;
  appointmentId: string | null;
  customerName: string | null;
  eventLabel: string;
  channel: "sms" | "email" | null;
  href: string | null;
}
```

---

### Step 3 — getDashboardDailyLog, bookings source (N3)

In `src/lib/queries/dashboard.ts`:

**Imports to add:**
- `inArray`, `ne` to the drizzle-orm import (V2 will need them; add now to avoid a second schema-layer touch)
- `appointmentEvents`, `messageLog` to the schema import (same reason)
- `DashboardLogItem` to the types import

**Add function at the bottom of the file:**

```typescript
export async function getDashboardDailyLog(
  shopId: string,
  opts: { days?: number; limit?: number } = {}
): Promise<DashboardLogItem[]> {
  const { days = 7, limit = 50 } = opts;
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: appointments.id,
      occurredAt: appointments.createdAt,
      appointmentId: appointments.id,
      customerName: customers.fullName,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.createdAt, windowStart)
      )
    );

  const created: DashboardLogItem[] = rows.map((row) => ({
    id: `created-${row.id}`,
    kind: "appointment_created",
    occurredAt: row.occurredAt,
    appointmentId: row.appointmentId,
    customerName: row.customerName,
    eventLabel: "New booking",
    channel: null,
    href: `/app/appointments/${row.appointmentId}`,
  }));

  return created
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}
```

---

### Step 4 — DailyLogFeed component (N5)

Create `src/components/dashboard/daily-log-feed.tsx`. Build the complete component including all UI affordances (U2–U5). U4 (channel badge) won't render in V1 because no items will have `channel !== null`, but it belongs in this component and should be ready.

```tsx
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DashboardLogItem } from "@/types/dashboard";

interface DailyLogFeedProps {
  items: DashboardLogItem[];
}

export function DailyLogFeed({ items }: DailyLogFeedProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-light-muted">
        No activity in the last 7 days.
      </p>
    );
  }

  // Items arrive pre-sorted newest-first; Map preserves insertion order → groups are newest-day-first
  const grouped = new Map<string, DashboardLogItem[]>();
  for (const item of items) {
    const key = format(item.occurredAt, "yyyy-MM-dd");
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([key, dayItems]) => (
        <div key={key}>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-light-muted">
            {format(new Date(key + "T00:00:00"), "MMM d, yyyy")}
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5">
            {dayItems.map((item, idx) => {
              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-3 py-3",
                    idx !== 0 && "border-t border-white/5"
                  )}
                >
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{item.eventLabel}</span>
                      {item.channel && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            item.channel === "sms"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                          )}
                        >
                          {item.channel}
                        </span>
                      )}
                    </div>
                    {item.customerName && (
                      <span className="text-xs text-text-light-muted">
                        {item.customerName}
                      </span>
                    )}
                  </div>
                  <time
                    dateTime={item.occurredAt.toISOString()}
                    className="shrink-0 text-xs text-text-light-muted"
                  >
                    {format(item.occurredAt, "h:mm a")}
                  </time>
                </div>
              );

              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block transition-colors hover:bg-white/5"
                >
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### Step 5 — Page wiring (N4)

In `src/app/app/dashboard/page.tsx`:

**New imports:**
```typescript
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getDashboardDailyLog } from "@/lib/queries/dashboard";
import { DailyLogFeed } from "@/components/dashboard/daily-log-feed";
```

**Update searchParams type:**
```typescript
searchParams: Promise<{ period?: string; view?: string }>;
```

**After auth/shop checks, before any data fetching:**
```typescript
const { period, view } = await searchParams;
const isLogView = view === "log";
```

**Extract tab switcher** (used in both branches):
```typescript
const tabSwitcher = (
  <nav className="flex w-fit gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
    <Link
      href="/app/dashboard?view=quick"
      className={cn(
        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
        !isLogView
          ? "bg-white/10 text-white"
          : "text-text-light-muted hover:text-white"
      )}
    >
      Quick View
    </Link>
    <Link
      href="/app/dashboard?view=log"
      className={cn(
        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
        isLogView
          ? "bg-white/10 text-white"
          : "text-text-light-muted hover:text-white"
      )}
    >
      Daily Log
    </Link>
  </nav>
);
```

**Log view early return** (place before the existing `getDashboardData` / `getEventTypesForShop` calls — this is the key perf guard: neither call runs when `isLogView` is true):
```typescript
if (isLogView) {
  const logItems = await getDashboardDailyLog(shop.id, { days: 7, limit: 50 });
  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="container mx-auto space-y-6 px-4 py-10">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
            <p className="text-sm text-text-light-muted">
              Monitor high-risk appointments and upcoming reliability trends for {shop.name}.
            </p>
          </div>
          <DashboardSearch />
        </header>
        {tabSwitcher}
        <DailyLogFeed items={logItems} />
      </div>
    </div>
  );
}
```

**In the existing Quick View return**, insert `{tabSwitcher}` between `<DashboardSearch />` and the `hasOnlyDefaultServices` banner. The header `space-y-4` container already groups them cleanly.

---

## How I'll Verify This

### 1. Inspect the migration SQL

After `pnpm db:generate`, open the generated file in `drizzle/` and confirm it contains exactly:

```sql
CREATE INDEX "appointment_events_shop_occurred_idx"
  ON "appointment_events" ("shop_id", "occurred_at");
```

Nothing else. No `DROP`, no `ALTER TABLE`. If anything else appears, do not run `pnpm db:migrate` — investigate the diff in `schema.ts` first.

---

### 2. Unit tests for getDashboardDailyLog

Add a new `describe("getDashboardDailyLog")` block to `src/lib/queries/__tests__/dashboard.test.ts`. The existing mock infrastructure (shared chain, `setRows`) handles a single `db.select()` call, which is all V1 needs.

Add `getDashboardDailyLog` to the existing top-level import:
```typescript
const {
  getAllUpcomingAppointments,
  getDashboardData,
  getDashboardDailyLog,   // add
  ...
} = await import("@/lib/queries/dashboard");
```

**Test cases to write:**

```typescript
describe("getDashboardDailyLog", () => {
  it("returns empty array when no bookings exist in the window", async () => {
    setRows([]);
    const result = await getDashboardDailyLog("shop-1");
    expect(result).toEqual([]);
  });

  it("maps a booking row to a DashboardLogItem with correct shape", async () => {
    const now = new Date();
    setRows([{
      id: "appt-abc",
      occurredAt: now,
      appointmentId: "appt-abc",
      customerName: "Jordan Lee",
    }]);

    const result = await getDashboardDailyLog("shop-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "created-appt-abc",
      kind: "appointment_created",
      occurredAt: now,
      appointmentId: "appt-abc",
      customerName: "Jordan Lee",
      eventLabel: "New booking",
      channel: null,
      href: "/app/appointments/appt-abc",
    });
  });

  it("never exposes a phone number — customerName is the customer's full name", async () => {
    setRows([{
      id: "appt-1",
      occurredAt: new Date(),
      appointmentId: "appt-1",
      customerName: "Alex Smith",  // fullName from JOIN, not phone
    }]);

    const [item] = await getDashboardDailyLog("shop-1");

    expect(item?.customerName).toBe("Alex Smith");
    // Sanity: no E.164 phone pattern in customerName
    expect(item?.customerName).not.toMatch(/^\+\d+$/);
  });

  it("sorts items newest-first", async () => {
    const older = new Date("2026-04-14T10:00:00Z");
    const newer = new Date("2026-04-15T10:00:00Z");
    setRows([
      { id: "appt-old", occurredAt: older, appointmentId: "appt-old", customerName: "A" },
      { id: "appt-new", occurredAt: newer, appointmentId: "appt-new", customerName: "B" },
    ]);

    const result = await getDashboardDailyLog("shop-1");

    expect(result[0]?.id).toBe("created-appt-new");
    expect(result[1]?.id).toBe("created-appt-old");
  });

  it("caps results at the limit", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `appt-${i}`,
      occurredAt: new Date(Date.now() - i * 1000),
      appointmentId: `appt-${i}`,
      customerName: `Customer ${i}`,
    }));
    setRows(rows);

    const result = await getDashboardDailyLog("shop-1", { limit: 5 });

    expect(result).toHaveLength(5);
  });

  it("prefixes item id with 'created-' to prevent collisions with other sources", async () => {
    setRows([{
      id: "uuid-123",
      occurredAt: new Date(),
      appointmentId: "uuid-123",
      customerName: "Someone",
    }]);

    const [item] = await getDashboardDailyLog("shop-1");

    expect(item?.id).toBe("created-uuid-123");
  });
});
```

**Run tests:**
```bash
pnpm test src/lib/queries/__tests__/dashboard.test.ts
```

All new cases must pass. Existing cases must not regress.

---

### 3. Type and lint check

```bash
pnpm lint && pnpm typecheck
```

What to look for:
- No TypeScript errors on the `DashboardLogItem` interface being used in the component props
- No TypeScript errors on `searchParams` destructuring `view`
- No lint warnings on the new component or query

---

### 4. Full test suite

```bash
pnpm test
```

Confirms nothing in the broader suite regressed. Pay attention to any existing dashboard tests — the mock chain is shared and imports are re-used, so if the new import or function signature breaks the module, all existing dashboard tests will fail visibly.

---

### 5. Browser verification checklist (for user to run)

These can't be automated without the dev server, so hand off to the user after steps 1–4 pass.

| Check | URL / Action | Expected |
|-------|-------------|----------|
| Default view | `/app/dashboard` | Quick View renders; tab switcher visible with "Quick View" active |
| Explicit quick | `/app/dashboard?view=quick` | Quick View renders; "Quick View" tab active |
| Log view | `/app/dashboard?view=log` | Daily Log renders; "Daily Log" tab active |
| Unknown param | `/app/dashboard?view=foo` | Quick View renders (fallback) |
| Empty log | `/app/dashboard?view=log` (no bookings in 7 days) | "No activity in the last 7 days." message |
| Day grouping | Log with bookings on multiple days | Separate day header per calendar day, newest day first |
| Item detail | Click a log item row | Navigates to `/app/appointments/[id]` |
| Customer display | Any item | Shows customer full name, not a phone number |
| Quick View intact | `/app/dashboard` | All existing cards, table, chart render normally — no regression |

---

## Definition of Done

**R1 — Tab switching:**
- [ ] `/app/dashboard` (no param) renders Quick View
- [ ] `/app/dashboard?view=quick` renders Quick View
- [ ] `/app/dashboard?view=log` renders Daily Log
- [ ] Unknown `view` param falls back to Quick View

**R2 — Sources (partial — bookings only in V1):**
- [ ] Log includes items from `appointments.createdAt` within last 7 days
- [ ] Items sorted newest-first

**R4 — Item display:**
- [ ] Customer name appears (not phone number)
- [ ] Items link to `/app/appointments/[id]`
- [ ] "New booking" label on appointment_created items

**R5 — UI:**
- [ ] Items grouped under calendar-day headers
- [ ] No unread badge or action buttons on any row

**R6 — Migration:**
- [ ] `appointment_events_shop_occurred_idx` index exists after migration
- [ ] Generated SQL contains only `CREATE INDEX` — nothing destructive

**Project rules:**
- [ ] `pnpm lint && pnpm typecheck` passes
- [ ] `pnpm test` passes with no regressions
