# Dashboard Requirements Audit

Date: 2026-04-14

Scope: functional fit between the proposed dashboard design in `docs/shaping/dashboard-ui/screen.png` and the current dashboard capability shown in `docs/shaping/dashboard-ui/proj-astro-seven.vercel.app_app_dashboard.png` and implemented under `/app/dashboard`.

Evidence used:

- Proposed screen: `docs/shaping/dashboard-ui/screen.png`
- Existing dashboard capture: `docs/shaping/dashboard-ui/proj-astro-seven.vercel.app_app_dashboard.png`
- Current dashboard route and query layer:
  `src/app/app/dashboard/page.tsx`,
  `src/lib/queries/dashboard.ts`,
  `src/components/dashboard/attention-required-table.tsx`,
  `src/components/dashboard/all-appointments-table.tsx`,
  `src/components/dashboard/summary-cards.tsx`,
  `src/components/dashboard/tier-distribution-chart.tsx`
- Supporting workflow and schema:
  `src/components/dashboard/action-buttons.tsx`,
  `src/app/api/appointments/[id]/remind/route.ts`,
  `src/app/api/appointments/[id]/confirm/route.ts`,
  `src/lib/confirmation.ts`,
  `src/lib/queries/appointments.ts`,
  `src/lib/schema.ts`

Note: the localhost sign-in flow could not be automated because the browser tool blocked credential entry, so this audit relies on the supplied screenshots plus the live code and schema.

## Summary

- Supported now: the core dashboard model already supports an attention queue for risky upcoming bookings, tier distribution, an upcoming appointments list, service-linked appointments, and owner-scoped row actions.
- Needs spike: the proposed design adds several metrics and interactions whose meaning is not defined in the current product contract, especially search, daily log, trend/delta math, retention math, export, and pagination.
- Not feasible now: two visible dashboard controls imply product workflows that do not exist yet in the system: an internal new-appointment flow and an in-app notification center.

## Supported Now

### 1. Attention Required queue with time-window control

This is already a first-class dashboard feature. The route accepts only `24`, `72`, `168`, and `336` hour windows, and the query limits results to `booked` appointments inside that window. High-risk logic is already defined as `risk` tier, score `< 40`, or `voidedLast90Days >= 2`.

The current implementation also already supports the operational state behind this section:

- confirmation state is tracked on the appointment as `none`, `pending`, `confirmed`, or `expired`
- confirmation requests are automated through SMS and expire through scheduled jobs
- access is owner-scoped to the current shop

Evidence:

- `src/app/app/dashboard/page.tsx:11-42`
- `src/lib/queries/dashboard.ts:14-74`
- `src/components/dashboard/attention-required-table.tsx:12-133`
- `src/lib/confirmation.ts:143-353`

### 2. Upcoming appointments count and deposits-at-risk amount

The base metrics already exist.

- `Total Upcoming` is a count of future `booked` appointments in the next 30 days.
- `Deposits at Risk` is already calculable from booked upcoming high-risk appointments joined to `payments.amountCents`.

This is a good fit with the current backend and state model.

Evidence:

- `src/lib/queries/dashboard.ts:76-146`
- `src/components/dashboard/summary-cards.tsx:11-41`

### 3. Tier distribution, total clients, and new clients

Tier distribution is already supported directly from `customers` plus `customerScores`. The chart currently computes Top / Neutral / Risk counts and percentages. `Total clients` is just the sum of those buckets.

`New (30d)` is also supportable with the current data model because `customers.createdAt` exists per shop and customer identity is already constrained by unique phone/email per shop. This needs a new query, but it does not need a schema change or a new workflow.

Evidence:

- `src/lib/queries/dashboard.ts:175-203`
- `src/components/dashboard/tier-distribution-chart.tsx:7-74`
- `src/lib/schema.ts:402-420`

### 4. All upcoming appointments table with tier filter and sort state

The current dashboard already supports a shop-scoped upcoming appointments table for the next 30 days with:

- tier filter
- sort by time
- sort by score
- sort by tier
- empty-state handling

This fits the current state model cleanly because all rows are already loaded from the dashboard query and then filtered/sorted in the client.

Evidence:

- `src/lib/queries/dashboard.ts:205-325`
- `src/components/dashboard/all-appointments-table.tsx:17-181`

### 5. Service-aware appointment rows and operational row actions

The proposed appointments table shows a service column and an actions area. Both are compatible with what exists now.

- Appointments already reference services through `eventTypeId`.
- The appointments page already resolves `eventTypes.name`, so the dashboard can surface service names without changing the data model.
- Dashboard row actions already exist for `View`, `Contact`, `Remind`, `Confirm`, and `Cancel`.
- Those actions already enforce owner auth, shop scoping, UUID validation on reminder requests, SMS opt-in handling, and non-booked guards.

Important current behavior:

- `Confirm` currently means “send a confirmation request”, not “force-set confirmed”.
- `Cancel` currently routes to the existing manage link; it is not a direct owner-side destructive action.

Evidence:

- `src/lib/schema.ts:300-337`
- `src/lib/schema.ts:532-605`
- `src/lib/queries/appointments.ts:1180-1222`
- `src/components/dashboard/action-buttons.tsx:12-150`
- `src/app/api/appointments/[id]/remind/route.ts:14-87`
- `src/app/api/appointments/[id]/confirm/route.ts:13-50`

## Needs Spike

### 1. Global search across appointments or clients

Resolved in: `docs/shaping/dashboard-ui/spike-1-dashboard-search-scope.md`

Assumption: the top search bar is meant to query both appointments and customers from the dashboard shell.

Uncertainty: the current app has no search contract for either surface. Scope is undefined: exact match vs partial match, customers only vs appointments plus customers, live results vs submit, and whether results should navigate away or filter the current view.

Spike needed: define the search scope, add indexed shop-scoped queries, decide URL/state behavior, and define empty/error results for PII-bearing searches.

Why this is not “supported now”: the current dashboard, appointments page, and customers page expose no search UI or search query path.

Evidence:

- `src/components/dashboard/all-appointments-table.tsx:17-181`
- `src/app/app/customers/page.tsx:1-89`
- `src/app/app/appointments/page.tsx:1-257`

### 2. Daily Log tab

Resolved in: `docs/shaping/dashboard-ui/spike-2-dashboard-daily-log.md`

Assumption: `Daily Log` is intended to be a chronological activity feed for bookings, cancellations, reminders, confirmations, refunds, and possibly slot recovery.

Uncertainty: the raw events exist in multiple places, but there is no unified feed contract. `appointment_events` and `message_log` have different shapes, different semantics, and no shared “activity item” model. The current message API is also appointment-specific, not dashboard-wide.

Spike needed: define which event types belong in the log, create a merged query/view model, decide pagination/retention, and define how automated events and failed sends should appear.

Why this matters: without a defined event model, the tab will either omit important automation or show an inconsistent operational history.

Evidence:

- `src/lib/schema.ts:689-717`
- `src/lib/schema.ts:880-919`
- `src/app/api/messages/route.ts:7-54`

### 3. Upcoming appointments delta versus last month

Resolved in: `docs/shaping/dashboard-ui/spike-3-dashboard-upcoming-delta.md`

Assumption: the green annotation under `Upcoming Appointments` is a period-over-period delta.

Uncertainty: the current metric is only the current count of future `booked` appointments in the next 30 days. The comparison baseline is not defined. It could mean previous 30-day forecast, previous calendar month, or appointments created this month. Each produces different numbers.

Spike needed: define the comparison window, timezone rules, and cancellation handling, then add a historical comparison query and tests.

Why this is not “supported now”: `getTotalUpcomingCount` only returns the current count.

Evidence:

- `src/lib/queries/dashboard.ts:76-93`
- `src/components/dashboard/summary-cards.tsx:25-29`

### 4. High-risk customers KPI

Resolved in: `docs/shaping/dashboard-ui/spike-4-dashboard-high-risk-customers-kpi.md`

Assumption: the proposed card is meant to count unique customers needing attention.

Uncertainty: the current summary card counts high-risk appointments, not customers. If one risky customer has two upcoming bookings, the current implementation will count two. It is also unclear whether the card should follow the selected dashboard window or represent all risky customers in the shop.

Spike needed: define whether the KPI is customer-level or appointment-level, align it with the attention queue, and decide dedupe rules across multiple future bookings.

Why this matters: the metric name in the proposed design will be misleading if it is backed by the current appointment count.

Evidence:

- `src/app/app/dashboard/page.tsx:44-88`
- `src/lib/queries/dashboard.ts:239-258`
- `src/components/dashboard/summary-cards.tsx:31-34`

### 5. Deposits-at-risk expiry messaging and currency handling

Resolved in: `docs/shaping/dashboard-ui/spike-5-dashboard-deposits-at-risk-expiry-and-currency.md`

Assumption: `Expires in 48h` is intended to communicate when the at-risk amount will no longer be recoverable or refundable, and the card currency should match shop policy/payment currency.

Uncertainty: the system has several time anchors that could drive expiry: cancellation cutoff, confirmation deadline, or appointment start. The dashboard query does not currently compute any “next expiry” timestamp. The current summary card also hardcodes `USD` even though policy versions and payments both store currency.

Spike needed: define the expiry rule, expose the relevant timestamp in the dashboard query, and switch dashboard money formatting to a shop/policy-aware currency source.

Why this matters: incorrect expiry messaging or currency formatting will undermine trust in the most operationally sensitive KPI on the page.

Evidence:

- `src/components/dashboard/summary-cards.tsx:3-9`
- `src/lib/queries/dashboard.ts:120-172`
- `src/lib/schema.ts:340-399`
- `src/lib/schema.ts:719-740`

### 6. Monthly retention percentage with recovered/refunded breakdown

Resolved in: `docs/shaping/dashboard-ui/spike-6-dashboard-monthly-retention.md`

Assumption: the proposed `92% Monthly Retention` card is meant to summarize how much at-risk business was preserved this month, with sub-breakdowns for recovered and refunded outcomes.

Uncertainty: the current product does not define a canonical retention KPI. The dashboard today only shows this month’s retained and refunded money totals. Separately, slot recovery has its own data model, which could also be interpreted as “recovered”. The mock does not make clear whether `recovered` and `refunded` are counts, appointments, openings, or money.

Spike needed: define the KPI precisely, choose the source of truth, decide the denominator, and add tests around edge cases such as partial refunds and slot recoveries without payments.

Why this matters: this card can look precise while actually mixing unrelated concepts if the definition is not locked first.

Evidence:

- `src/lib/queries/dashboard.ts:148-172`
- `src/components/dashboard/summary-cards.tsx:43-58`
- `src/lib/schema.ts:719-740`
- `src/lib/schema.ts:760-858`

### 7. Pagination and export for the upcoming appointments table

Resolved in: `docs/shaping/dashboard-ui/spike-7-dashboard-pagination-and-export.md`

Assumption: the footer pager and download icon in the proposed table imply persistent pagination and export of the filtered result set.

Uncertainty: the current table is fully client-side after loading all upcoming rows for 30 days. There is no page state, no total count separate from the loaded dataset, and no export route or CSV contract. It is also unclear whether export should respect current filters and sort order.

Spike needed: decide whether pagination stays client-side or moves to server-backed query params, add total counts and page state, and define export format plus PII handling.

Why this matters: pagination and export become operational features once users depend on them, especially if the dashboard becomes the daily work surface.

Evidence:

- `src/lib/queries/dashboard.ts:205-325`
- `src/components/dashboard/all-appointments-table.tsx:17-181`

## Not Feasible Now

### 1. Internal “New Appointment” creation from the dashboard

Blocker: there is no authenticated owner-side appointment creation workflow in the app. The only creation flow in the repo is the public `/book/[slug]` booking journey, which is designed for customer self-service and runs through service selection, validation, and payment logic.

Why it matters: an internal staff booking flow usually needs different permissions and state handling, such as booking on behalf of a client, skipping or overriding payment, handling missing SMS consent, and distinguishing admin-created vs customer-created bookings. The current system does not expose that workflow.

Recommendation: defer a true internal booking flow. If the design only needs a CTA, simplify it to “Open booking page” or “Copy booking link” using the existing public booking route.

Evidence:

- `src/app/book/[slug]/page.tsx:12-153`
- `src/app/app/page.tsx:22-35`

### 2. In-app notification bell / notification center

Blocker: the app does not have a user-scoped notification model, unread/read state, delivery preferences, or a dashboard-wide notification feed query. Existing automation writes to `appointment_events` and `message_log`, but those are operational records, not a user-facing notification system.

Why it matters: a bell icon implies reliable unread counts and actionable state. Shipping the control without a notification model would create a misleading dashboard surface and duplicate the existing attention/conflict/reminder concepts inconsistently.

Recommendation: remove it for now, or simplify it to a direct link into an existing operational surface such as `Conflicts` or `Reminders`. Defer a true notification center until a user-notification model exists.

Evidence:

- `src/components/app/app-nav.tsx:8-22`
- `src/lib/schema.ts:689-717`
- `src/lib/schema.ts:880-919`

## Practical Direction

If the goal is to stay close to the proposed design without inventing major product surface area, the safest next step is:

- keep the current dashboard backbone: attention queue, summary cards, tier distribution, upcoming appointments table
- add only the items backed by existing data with low ambiguity: service names, total clients, new clients (30d), and possibly shop-aware currency formatting
- spike the ambiguous metrics and interactions before implementation: search, daily log, delta math, retention math, export, and pagination
- remove or simplify the two controls that imply missing workflows: internal new appointment creation and the notification bell
