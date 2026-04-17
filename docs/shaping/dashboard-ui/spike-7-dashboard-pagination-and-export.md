# Spike 7: Dashboard Pagination And Export

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Decide whether the upcoming-appointments table should support pagination and export, and if so, what the backend contract must be.

This spike needs to answer:

- whether pagination should stay client-side or move server-side
- whether export should download the visible page or the filtered result set
- what data and PII rules an export must follow
- whether the current dashboard route can support either feature truthfully
- what the v1 dashboard should ship

## Current State

Observed in the codebase:

- The dashboard route only persists one piece of URL state: `period`.
- The page loads one precomputed `allAppointments` array from `getDashboardData()`.
- That array is limited to future `booked` appointments in the next 30 days.
- The dashboard table applies tier filtering and sort entirely in client state with `useState` and `useMemo`.
- There is no page index, page size, total count, or cursor in the dashboard types.
- There is an existing server-side `getAllUpcomingAppointments()` query that already supports tier filtering and sort branches in SQL, but it is not used by the page and it does not expose `limit`, `offset`, or `totalCount`.
- The table displays PII-bearing fields:
  - customer name
  - email or phone
- The table also has action-only fields that should not automatically become export columns:
  - dashboard row actions
  - tokenized `bookingUrl` passed into actions
- Dashboard access is owner-scoped through session auth plus `shop.ownerUserId`, but there is no finer export permission model or download audit trail in the app.
- No existing CSV/export route or content-disposition download endpoint exists in the repo.

Relevant code:

- `src/app/app/dashboard/page.tsx:11-42`
- `src/app/app/dashboard/page.tsx:81-92`
- `src/components/dashboard/all-appointments-table.tsx:17-181`
- `src/lib/queries/dashboard.ts:205-325`
- `src/types/dashboard.ts:1-44`
- `src/lib/session.ts:19-40`
- `src/lib/queries/shops.ts:50-53`
- `src/app/app/appointments/page.tsx:16-67`

## Questions

| # | Question |
|---|----------|
| Q1 | Is client-side pagination a good fit for the current dashboard table? |
| Q2 | If pagination exists later, should it be URL-backed and server-backed? |
| Q3 | What should export mean: current page or current filtered result set? |
| Q4 | What export fields and safeguards are required? |
| Q5 | What should ship in v1? |
| Q6 | If product insists on these features later, what implementation shape is required? |

## Findings

### Q1 — Client-side pagination is technically possible, but it is the wrong contract

The current table already holds the full dataset in memory and applies filter/sort locally.

That means adding a simple client-only pager would be easy, but it would create the wrong operational contract:

- page state would disappear on reload
- page state would not be shareable by URL
- page count would be derived only after the entire dataset is loaded
- export could not reliably mirror the visible result set because the server does not know the table state

This matters because the proposed mock shows a real table footer and a download control, not just a cosmetic pager.

Once users rely on a footer pager, they will expect:

- stable page navigation
- durable filter/sort state
- export behavior that matches what the table is showing

The current client-only setup cannot guarantee that.

**Decision:** do not add client-only pagination to the dashboard table.

### Q2 — If pagination ships later, it should be URL-backed and server-backed

The repo already has a useful starting point:

- `getAllUpcomingAppointments()` applies tier filtering in SQL
- it also supports server-side sort branches for time, score, and tier

That means the backend work is not starting from zero.

What is missing is the rest of the table contract:

- `page`
- `pageSize`
- `totalCount`
- durable query-param state

Recommended future URL state:

- `period`
- `tier`
- `sort`
- `direction`
- `page`

For v1 of a paginated table, keep `pageSize` fixed server-side, for example `25`, instead of exposing another control immediately.

Why URL-backed state is the right fit:

- the dashboard already uses query params for period state
- pagination becomes refresh-safe and shareable
- export can reuse the same filter/sort params

**Decision:** if pagination is implemented, it should move to a server-backed query-param model, not stay in local component state.

### Q3 — Export should mean the filtered result set, not just the visible page

The mock places the download affordance on the table itself, which implies:

- “download the results I am working with”

If pagination is introduced, exporting only the current page would be surprising and low-value for operations work.

Recommended export meaning:

- export all rows matching the current dashboard table scope
- after applying the current filter and sort contract
- across all pages in that filtered set

Do not export:

- the entire shop’s appointment history
- results outside the dashboard’s built-in next-30-day scope

That keeps the export truthful to the table surface instead of quietly becoming a general reporting API.

**Decision:** export should target the current filtered result set, not the current page and not the entire shop dataset.

### Q4 — Export needs a strict column contract and PII safeguards

The current table already exposes customer contact data, so export is not a trivial formatting feature. It is a data-handling feature.

Recommended export columns:

- appointment id
- start time
- end time
- customer name
- customer email
- customer phone
- tier
- score
- voided last 90 days
- confirmation status

Optional later column:

- service name, once the dashboard table actually surfaces it

What should not be exported by default:

- row actions
- raw `bookingUrl` manage links

Why `bookingUrl` must stay out:

- it is a tokenized customer self-service link
- exporting it would spread an operational control outside the app surface

Additional export safeguards needed:

- owner-authenticated request only, using the existing shop-owner gate
- explicit CSV field sanitization for spreadsheet formula prefixes such as `=`, `+`, `-`, and `@`
- clear timezone handling for date columns

The current app does not have:

- separate export roles
- download audit logs
- staff-level permission granularity

So a v1 export should stay narrow and owner-scoped, without pretending to support richer governance than the product actually has.

### Q5 — V1 should ship without pagination and without export

This is the narrowest truthful product boundary.

Why that is the right call now:

- the dashboard table is intentionally bounded to the next 30 days
- there is already a broader appointments surface for recent and upcoming appointment operations
- the current dashboard route has no durable table-state contract beyond `period`
- export and pagination become coupled once users expect the download to reflect table state

Recommended v1 behavior:

- keep the dashboard table as one unpaginated operational list
- keep tier filter and sort local
- remove footer pagination UI
- remove the download affordance

This keeps the dashboard honest as a quick operational surface instead of turning it into a half-implemented report table.

### Q6 — Later implementation should promote the existing query into a real table contract

If product later insists on pagination and export, use the existing server query as the base and add a proper shared contract.

Recommended implementation shape:

#### Table query

- extend `getAllUpcomingAppointments()` with:
  - `page`
  - fixed `pageSize`
  - `totalCount`
- return a payload like:
  - `rows`
  - `totalCount`
  - `page`
  - `pageSize`

#### URL state

- persist:
  - `period`
  - `tier`
  - `sort`
  - `direction`
  - `page`

#### Export route

- add a dedicated owner-authenticated export endpoint
- make it consume the same filter and sort params as the table
- export the full filtered result set, not the visible page

#### Stability rules

- keep deterministic ordering for paginated results
- preserve the existing secondary sort by `startsAt`
- add a final stable tie-breaker such as appointment id if the query contract broadens later

#### Output rules

- format dates in the shop timezone or export explicit ISO timestamps plus timezone context
- sanitize CSV cells to prevent formula injection
- exclude action-only or token-bearing fields

## Recommendation

The seventh spike resolves to this v1 rule:

- do not ship pagination or export on the dashboard upcoming-appointments table yet

If either feature is required later, implement them together on top of a shared server-backed query and URL state model. The repo already has the beginnings of that query shape in `getAllUpcomingAppointments()`, but the current dashboard route is still a client-filtered operational list rather than a durable paginated data grid.
