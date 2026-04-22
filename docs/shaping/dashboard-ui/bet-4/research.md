# Bet 4 — Research Notes

**Sources:** Drizzle ORM type definitions (confirmed in node_modules), existing schema, existing query patterns, date-fns docs
**Scope:** Technical details for A1–A5

---

## A1 — Schema index addition

**Pattern** (confirmed from `appointmentEvents` table definition, lines 705–716 of `schema.ts`):

```typescript
export const appointmentEvents = pgTable(
  "appointment_events",
  { /* columns */ },
  (table) => [
    index("appointment_events_appointment_id_idx").on(table.appointmentId),
    index("appointment_events_appointment_occurred_idx").on(table.appointmentId, table.occurredAt),
    uniqueIndex("appointment_events_type_time_unique").on(table.appointmentId, table.type, table.occurredAt),
    // ADD:
    index("appointment_events_shop_occurred_idx").on(table.shopId, table.occurredAt),
  ]
);
```

One line added to the array. No other change to the table definition.

**Generated migration SQL** — based on existing migrations (e.g., `0017_appointment_calendar_event.sql`):
```sql
CREATE INDEX "appointment_events_shop_occurred_idx"
  ON "appointment_events" ("shop_id", "occurred_at");
```

Drizzle generates `CREATE INDEX` with column names in snake_case matching the field definitions.

**Migration steps after schema edit:**
```bash
pnpm db:generate   # produces new migration file in drizzle/
pnpm db:migrate    # applies to the database
```

Review the generated `.sql` file before running `migrate` to confirm it contains only the expected `CREATE INDEX` statement and no destructive operations.

---

## A3 — Drizzle operators: `ne`, `inArray`, `notInArray`

All three confirmed exported from **top-level `drizzle-orm`** (via `index.d.ts` → `sql/index.js` → `expressions/index.js`):

```typescript
import { and, asc, eq, gte, inArray, ne } from "drizzle-orm";
```

**`inArray` for event type filter:**
```typescript
inArray(appointmentEvents.type, ["cancelled", "outcome_resolved"])
```
Produces: `type IN ('cancelled', 'outcome_resolved')`

**`ne` for message_log purpose exclusion:**
```typescript
ne(messageLog.purpose, "slot_recovery_offer")
```
Produces: `purpose != 'slot_recovery_offer'`

`ne` (not equal) is preferred over `notInArray` here — only one value is excluded, so `ne` is simpler and more readable.

**Current `dashboard.ts` imports** (needs extending):
```typescript
// Current:
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

// After adding new operators:
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
```

---

## A3 — Three sub-query JOIN patterns

### Source 1: `appointments.createdAt` → `appointment_created` items

```typescript
db
  .select({
    id: appointments.id,
    occurredAt: appointments.createdAt,
    appointmentId: appointments.id,
    customerId: appointments.customerId,
    customerName: customers.fullName,
  })
  .from(appointments)
  .innerJoin(customers, eq(customers.id, appointments.customerId))
  .where(and(
    eq(appointments.shopId, shopId),
    gte(appointments.createdAt, windowStart)
  ))
```

- `innerJoin`: every appointment has a customer (FK not null)
- `occurredAt = appointments.createdAt` — immutable, durable
- No `appointment_events` join — this is synthetic (no `created` event is written to `appointment_events` by current code)

### Source 2: `appointment_events` (cancelled + outcome_resolved)

```typescript
db
  .select({
    id: appointmentEvents.id,
    occurredAt: appointmentEvents.occurredAt,
    type: appointmentEvents.type,
    appointmentId: appointmentEvents.appointmentId,
    meta: appointmentEvents.meta,
    financialOutcome: appointments.financialOutcome,
    resolutionReason: appointments.resolutionReason,
    customerId: appointments.customerId,
    customerName: customers.fullName,
  })
  .from(appointmentEvents)
  .innerJoin(appointments, eq(appointments.id, appointmentEvents.appointmentId))
  .innerJoin(customers, eq(customers.id, appointments.customerId))
  .where(and(
    eq(appointmentEvents.shopId, shopId),
    inArray(appointmentEvents.type, ["cancelled", "outcome_resolved"]),
    gte(appointmentEvents.occurredAt, windowStart)
  ))
```

- Both joins are INNER: `appointmentId` is a not-null FK; `appointments.customerId` is a not-null FK
- `financialOutcome` from the joined `appointments` row is needed for the `outcome_resolved` event label
- `meta` from `appointment_events` may contain `reason` for cancelled items (type: `Record<string, unknown> | null`)
- New `appointment_events_shop_occurred_idx` on `(shopId, occurredAt)` makes this query efficient

### Source 3: `message_log`

```typescript
db
  .select({
    id: messageLog.id,
    createdAt: messageLog.createdAt,
    appointmentId: messageLog.appointmentId,
    customerId: messageLog.customerId,
    customerName: customers.fullName,
    channel: messageLog.channel,
    purpose: messageLog.purpose,
    status: messageLog.status,
  })
  .from(messageLog)
  .innerJoin(customers, eq(customers.id, messageLog.customerId))
  .where(and(
    eq(messageLog.shopId, shopId),
    ne(messageLog.purpose, "slot_recovery_offer"),
    gte(messageLog.createdAt, windowStart)
  ))
```

- `customerId` on `message_log` is a direct not-null FK — no need to go through `appointments`
- `occurredAt` for message items = `messageLog.createdAt` (always set; `sentAt` is nullable)
- Existing `message_log_shop_id_idx` on `shopId` supports this query

---

## A3 — `financialOutcomeEnum` values

Confirmed from `schema.ts:134–137`:
```
"unresolved" | "settled" | "voided" | "refunded" | "disputed"
```

Event label mapping for `outcome_resolved` items:
| `financialOutcome` | Label |
|---|---|
| `settled` | `"Outcome: settled"` |
| `refunded` | `"Outcome: refunded"` |
| `voided` | `"Outcome: voided"` |
| `disputed` | `"Outcome: disputed"` |
| `unresolved` | `"Outcome resolved"` (fallback — shouldn't occur with this event type) |

`outcome_resolved` events are emitted by the resolver job when an appointment ends and the outcome is determined. The `financialOutcome` field on the joined appointment row is the correct label source.

---

## A3 — `messagePurposeEnum` → event label mapping

Confirmed enum values from `schema.ts:152–164`:

| Purpose | Kind | Label |
|---|---|---|
| `booking_confirmation` | `message_sent` / `message_failed` | `"Booking confirmation sent"` / `"Booking confirmation failed"` |
| `cancellation_confirmation` | `message_sent` / `message_failed` | `"Cancellation notice sent"` / `"Cancellation notice failed"` |
| `appointment_confirmation_request` | `message_sent` / `message_failed` | `"Confirmation request sent"` / `"Confirmation request failed"` |
| `appointment_reminder_*` (all 6) | `message_sent` / `message_failed` | `"Reminder sent"` / `"Reminder failed"` |
| `slot_recovery_offer` | — | **EXCLUDED** via `ne` filter |

`message_sent` = `status IN ('sent', 'queued')`. `message_failed` = `status = 'failed'`.

Note: `"queued"` is a transient in-flight state. For the daily log, treat `queued` items the same as `sent` — they represent an attempted delivery. The shop owner doesn't need to distinguish queued vs delivered for a timeline feed.

`messageStatusEnum` values: `"queued" | "sent" | "failed"` (confirmed from `schema.ts:171–175`).

---

## A3 — In-memory merge and sort

After the three parallel queries, map each to `DashboardLogItem[]`, then merge:

```typescript
const [created, events, messages] = await Promise.all([
  fetchCreated(shopId, windowStart),
  fetchEvents(shopId, windowStart),
  fetchMessages(shopId, windowStart),
]);

const allItems = [...created, ...events, ...messages]
  .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
  .slice(0, limit);
```

- `Date.prototype.getTime()` for numeric comparison — no external library needed
- `.slice(0, limit)` after sort — 50-item cap applied to the merged result, not each source individually (prevents hiding activity from one source due to another source having more volume)

---

## A5 — Day grouping with `date-fns`

Confirmed available in the project: `import { format } from "date-fns"` used in `attention-required-table.tsx` and `all-appointments-table.tsx`.

**Day key:** `format(item.occurredAt, "yyyy-MM-dd")` — lowercase `y` (calendar year, not week-numbering year). Using `YYYY` would produce incorrect results near year boundaries.

**Day header label:** `format(item.occurredAt, "MMM d, yyyy")` (e.g., `"Apr 16, 2026"`) — matches the existing date format used elsewhere in the dashboard.

**Grouping pattern:**
```typescript
const grouped = new Map<string, DashboardLogItem[]>();
for (const item of items) {
  const key = format(item.occurredAt, "yyyy-MM-dd");
  const group = grouped.get(key) ?? [];
  group.push(item);
  grouped.set(key, group);
}
// Map iteration order preserves insertion order
// Items are already sorted desc, so groups appear newest-first
```

Since items arrive already sorted newest-first, the `Map` iteration order naturally produces groups in descending day order.

---

## A5 — Dark UI patterns for log feed

From existing dashboard components:

**Day header:** match the section heading style from `all-appointments-table.tsx`
```
text-sm font-semibold text-text-light-muted uppercase tracking-wide
```

**Log item row (link):**
```
flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/5
```

**Item label text:**
```
text-sm text-white
```

**Customer name / secondary text:**
```
text-xs text-text-light-muted
```

**Channel badge** (`sms` / `email`) — same inline badge style as tier badges in `DashboardSearch`:
```
rounded px-1.5 py-0.5 text-[10px] font-bold uppercase
sms:   bg-blue-500/20 text-blue-300
email: bg-purple-500/20 text-purple-300
```

**Empty state:**
```
text-sm text-text-light-muted py-8 text-center
```

---

## A4 — Tab switcher: `?view` param alongside existing `?period`

`page.tsx` already reads `searchParams: Promise<{ period?: string }>`. Add `view?:` to the same destructure:

```typescript
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>;
}) {
  const { period, view } = await searchParams;
  const periodHours = parsePeriod(period);
  const isLogView = view === "log";
```

Tab switcher links:
```tsx
<nav className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
  <Link
    href="/app/dashboard?view=quick"
    className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
      !isLogView ? "bg-white/10 text-white" : "text-text-light-muted hover:text-white"
    )}
  >
    Quick View
  </Link>
  <Link
    href="/app/dashboard?view=log"
    className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
      isLogView ? "bg-white/10 text-white" : "text-text-light-muted hover:text-white"
    )}
  >
    Daily Log
  </Link>
</nav>
```

**`cn` utility** — already used throughout the dashboard codebase (`import { cn } from "@/lib/utils"`).

**Performance:** When `isLogView` is true, the existing `getDashboardData` call is skipped and `getDashboardDailyLog` is called instead. These are mutually exclusive — no double-fetching.

---

## A3 — `?view=log` query isolation

On the log view, the page only needs to call `getDashboardDailyLog`. It does NOT need `getDashboardData`, `getEventTypesForShop`, or any of the existing dashboard queries. The conditional structure in `page.tsx`:

```typescript
if (isLogView) {
  const logItems = await getDashboardDailyLog(shop.id, { days: 7, limit: 50 });
  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="container mx-auto space-y-6 px-4 py-10">
        <header>...</header>
        {tabSwitcher}
        <DailyLogFeed items={logItems} />
      </div>
    </div>
  );
}

// else: existing Quick View render
const [dashboardData, activeEventTypes] = await Promise.all([...]);
// ... existing return
```

This keeps the log view path clean and avoids loading unneeded data.

---

## Summary table

| Question | Answer |
|----------|--------|
| Are `ne` and `notInArray` in top-level `drizzle-orm`? | Yes — both confirmed from `index.d.ts` export chain |
| How to exclude `slot_recovery_offer`? | `ne(messageLog.purpose, "slot_recovery_offer")` |
| How to filter event types? | `inArray(appointmentEvents.type, ["cancelled", "outcome_resolved"])` |
| How to add index to `appointmentEvents`? | Add `index("appointment_events_shop_occurred_idx").on(table.shopId, table.occurredAt)` to the table's index array |
| What SQL does `db:generate` produce? | `CREATE INDEX "appointment_events_shop_occurred_idx" ON "appointment_events" ("shop_id", "occurred_at")` |
| JOIN pattern for `appointment_events` → customer name? | `INNER JOIN appointments` on `eq(appointments.id, appointmentEvents.appointmentId)` then `INNER JOIN customers` on `eq(customers.id, appointments.customerId)` |
| JOIN pattern for `message_log` → customer name? | `INNER JOIN customers` on `eq(customers.id, messageLog.customerId)` (direct FK, no `appointments` join needed) |
| `occurredAt` for message items? | `messageLog.createdAt` (always set; `sentAt` is nullable) |
| `financialOutcomeEnum` values? | `unresolved`, `settled`, `voided`, `refunded`, `disputed` |
| Day grouping key format? | `format(date, "yyyy-MM-dd")` — lowercase `y` required |
| `date-fns` available in project? | Yes — used in `attention-required-table.tsx` and `all-appointments-table.tsx` |
| Quick View and Log View: double-fetch risk? | None — mutually exclusive branches in `page.tsx`; only one data path executes per request |
