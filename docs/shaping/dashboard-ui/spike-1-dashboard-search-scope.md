# Spike 1: Dashboard Search Scope

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Define what the dashboard search bar should actually do, using the current app model.

This spike needs to answer:

- what entities the search bar should search
- whether it filters the current dashboard or navigates to existing detail views
- what matching rules are safe and useful
- what validation, permissions, and result limits are required
- whether the current Postgres schema can support v1 without new tables or major indexing work

## Current State

Observed in the codebase:

- The dashboard page has no search behavior today.
- The app already has canonical destinations for both result types:
  - customer details at `/app/customers/[id]`
  - appointment details at `/app/appointments/[id]`
- Customers already have stable searchable fields:
  - `fullName`
  - `email`
  - `phone`
- Appointments already have stable searchable/display fields:
  - `startsAt`
  - `status`
  - `customerId`
  - `eventTypeId`
- Appointment details already join customer and service data.
- Customer phone numbers are normalized before persistence.
- All product routes are already scoped to the signed-in shop owner via session -> shop lookup.

Relevant code:

- `src/app/app/dashboard/page.tsx`
- `src/app/app/customers/[id]/page.tsx:14-58`
- `src/app/app/appointments/[id]/page.tsx:27-99`
- `src/lib/schema.ts:300-420`
- `src/lib/schema.ts:532-605`
- `src/lib/queries/customers.ts:22-53`
- `src/lib/queries/appointments.ts:1180-1222`
- `src/lib/phone.ts:1-13`

## Questions

| # | Question |
|---|----------|
| Q1 | Should search filter the dashboard in place, or act as quick navigation to existing entities? |
| Q2 | Which entities should be searchable in v1? |
| Q3 | Which fields and matching rules are appropriate for each entity? |
| Q4 | What result shape should the UI expect? |
| Q5 | What validation, permission, and rate/volume boundaries should exist? |
| Q6 | Does v1 need new schema/index work, or is a bounded shop-scoped query enough? |

## Findings

### Q1 — Search should be quick-find navigation, not table filtering

The proposed placeholder says `Search appointments or clients`, not `Filter upcoming appointments`.

That distinction matters. The current dashboard already has:

- a time-windowed attention table
- a tier-filtered upcoming appointments table

Turning the top search bar into a third filtering mechanism would create overlapping state and unclear behavior:

- does it filter both tables or only one
- does it combine with the existing tier filter
- does it survive page reloads and time-window changes
- what does a customer match mean when customers are not listed as a top-level dashboard table

The cleaner fit is a **quick-find search**:

- users type a name, email, phone, or service clue
- the UI shows grouped results
- selecting a result navigates to an existing detail route

This matches the current app structure because both customers and appointments already have dedicated detail pages.

**Decision:** the dashboard search bar should not mutate dashboard table state. It should return navigable search results.

### Q2 — Search two entity groups in v1: customers and appointments

The mock explicitly names two domains: appointments and clients.

The current model supports that cleanly:

- customers are first-class records scoped to `shopId`
- appointments are first-class records scoped to `shopId`
- appointment details already include customer and service context

No third entity group is needed in v1.

Do not search:

- services as standalone destinations
- reminders/templates/messages
- conflicts
- slot openings
- staff/resources

Those would make the search feel global before the rest of the app has a coherent global-search contract.

**Decision:** v1 returns two grouped result sets only:

- `customers`
- `appointments`

### Q3 — Matching rules should stay deterministic and bounded

The current data model supports a practical deterministic search contract without fuzzy search.

Recommended matching rules:

#### Customer results

Search against:

- `customers.fullName`
- `customers.email`
- `customers.phone`

Matching behavior:

- name: case-insensitive partial match
- email: case-insensitive partial match
- phone: normalize the query to digits, then suffix-match against stored normalized phone digits

Why phone suffix match is acceptable:

- phone numbers are already normalized before write
- day-to-day lookup often starts from the last digits of a call/SMS context
- customer phone is unique per shop

Recommended minimums:

- text query: at least 2 non-space characters
- phone query: at least 4 digits

#### Appointment results

Search against:

- joined customer `fullName`
- joined customer `email`
- joined customer `phone`
- joined service `eventTypes.name`

Return only appointments from the operational window already used elsewhere in the app:

- `booked`
- `pending`
- `ended`
- with `endsAt >= now() - 7 days`

Why this window is preferable:

- it matches the current appointments page scope
- it keeps the result set operationally relevant
- it avoids turning a lightweight quick-find into a full historical archive search

Do not add typo-tolerance, semantic search, or natural-language date parsing in v1.

**Decision:** use exact/partial deterministic matching only. No fuzzy search in this spike.

### Q4 — The search UI should consume grouped, lightweight results

The search UI does not need full record payloads.

Recommended response shape:

```ts
type SearchResponse = {
  query: string;
  customers: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    tier: "top" | "neutral" | "risk" | null;
    href: string;
  }>;
  appointments: Array<{
    id: string;
    startsAt: string;
    status: "pending" | "booked" | "ended";
    customerName: string;
    eventTypeName: string | null;
    href: string;
  }>;
};
```

Behavior recommendation:

- show grouped results in a popover or command-style panel under the input
- cap each group to a small number, e.g. `5`
- do not auto-redirect while typing
- pressing `Enter` should open the highlighted result if one is selected, not guess silently

This keeps the control honest to the mock while staying compatible with the existing route structure.

**Decision:** return grouped lightweight results and navigate only on explicit selection.

### Q5 — Permission and validation should be strict and shop-derived

This search bar will expose PII-bearing results, so the server contract needs to be narrow.

Required rules:

- authenticated session required
- derive the shop from the current session on the server
- never accept `shopId` from the client
- trim the query before execution
- reject blank queries
- cap query length, e.g. `80`
- short-circuit text queries below 2 chars
- short-circuit phone queries below 4 digits
- hard-cap results per group

Because the results are only visible to the shop owner already authorized to see the same data elsewhere in the app, the response can include full email and phone values. That is consistent with the current customers and appointments views.

**Decision:** search stays owner-only and shop-scoped with minimal validated inputs.

### Q6 — V1 does not need schema changes; it does need a bounded query contract

The current schema is enough for v1. There is no need for:

- a search index table
- a materialized search document
- a separate denormalized entity
- a full-text engine

The main constraint is performance.

What exists now:

- `customers.shopId` is indexed
- `appointments.shopId` is indexed
- `appointments.eventTypeId` is indexed
- customer phone/email are unique per shop

What does not exist:

- substring/trigram indexes for `fullName`, `email`, or service name

That means the right v1 strategy is:

1. keep the query shop-scoped
2. keep the result limit low
3. keep the appointment scope bounded to recent/upcoming operational rows
4. run customer search and appointment search in parallel
5. monitor latency before adding index complexity

Do not start with `pg_trgm` or full-text search unless real latency or scale proves it necessary. The repo is still at a stage where per-shop result sets are likely small enough for bounded `ILIKE` queries to be acceptable.

**Decision:** ship v1 with bounded SQL search, not a search subsystem.

## Recommended Product Contract

### Search purpose

The dashboard search bar is a **quick-find control** for jumping to existing customers and appointments.

It is not:

- a dashboard filter
- a historical reporting tool
- a command palette for every app entity
- a fuzzy search feature

### Search scope

Search these two groups only:

1. Customers
2. Appointments

### Searchable fields

Customers:

- full name
- email
- phone

Appointments:

- customer full name
- customer email
- customer phone
- service name

### Appointment inclusion rules

Only search appointments that are already part of the current operational surface:

- statuses: `pending`, `booked`, `ended`
- `endsAt >= now() - 7 days`

### Result destinations

- customer result -> `/app/customers/[id]`
- appointment result -> `/app/appointments/[id]`

### Validation

- trim query
- max length `80`
- text queries require `>= 2` chars
- phone lookup requires `>= 4` digits
- return at most `5` results per group

## Recommended Technical Shape

### Route

Add one authenticated app-internal route:

- `GET /api/search?q=...`

Why a route is the best fit:

- the search control will live in a client component
- the result list is ephemeral UI state, not page-level SSR state
- the same route can be reused later outside the dashboard if needed

### Query strategy

Run two queries in parallel:

1. customer search
2. appointment search

Both must:

- derive `shop.id` from the session
- use bounded `ILIKE` / normalized matching
- return only small lightweight payloads

### Ranking

Use simple deterministic ranking:

1. exact match
2. prefix match
3. substring match
4. for appointments, break ties by nearest upcoming `startsAt`
5. for customers, break ties alphabetically

This can be implemented in SQL with simple `CASE` ordering if needed, but it is still bounded enough to stay understandable.

## What Should Not Be In This Spike

- fuzzy typo tolerance
- semantic/vector search
- cross-shop search
- full appointment history search
- service search as a standalone destination
- dashboard table filtering through the top bar
- saved searches or recent searches
- search analytics

## Launch Recommendation

Ship dashboard search as a bounded, owner-only quick-find feature.

Recommended v1 behavior:

- local dashboard input
- grouped results for customers and appointments
- explicit selection-based navigation
- deterministic partial matching
- no schema changes
- no special search infrastructure

If the team later sees slow queries or larger per-shop datasets, the next step is not to redesign the UX. It is to add search-specific indexes or a denormalized search surface behind the same contract.

## Output

Search decision:

- the dashboard search bar should be a quick-find navigator, not a dashboard filter

V1 search scope:

- customers by name/email/phone
- appointments by customer name/email/phone and service name
- appointments limited to the same recent/upcoming operational window used by the current appointments surface

Implementation boundary:

- one authenticated `GET /api/search` route
- shop derived from session
- grouped lightweight results
- bounded deterministic matching
- no schema change or full-text engine in v1
