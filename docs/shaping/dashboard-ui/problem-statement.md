# Problem Statement — Dashboard UI

Date: 2026-04-14

Source: synthesised from `requirements-audit.md`, `moscow-requirements.md`, and spikes 1–7.

---

## A) Goal(s)

**Primary objective:** The shop owner can monitor, triage, and act on all operationally relevant booking activity from a single dashboard surface without navigating to separate pages for basic information.

**Measurable success criteria:**

- Owner can identify which customers need attention and take a row action (View / Contact / Remind / Confirm / Cancel) within the current attention window without leaving the dashboard.
- All summary KPIs on the dashboard reflect the same underlying data contract (same window, same scope, same currency) so no two cards can disagree for an invisible reason.
- Owner can locate a specific customer or appointment in under 3 interactions without manual table scrolling.
- The dashboard does not show a metric, label, or control that implies a product workflow or data model that does not exist.

**Avoid goals:**

- Do not ship controls (notification bell, internal new-appointment creation) that imply features the system cannot back.
- Do not ship metrics (trend delta, retention %, expiry countdown) that are backed by ambiguous or undefined computation.

---

## B) Barrier(s)

| # | Barrier | Type |
|---|---------|------|
| B1 | Seven proposed dashboard features have undefined product contracts: search, daily log, trend delta, retention %, high-risk customer KPI, deposits-at-risk expiry, and pagination/export. Implementation cannot start without a locked definition for each. | knowledge gap |
| B2 | Two visible dashboard controls (notification bell, internal new-appointment CTA) require product workflows that do not exist in the codebase. Shipping them would create misleading UI surface. | technical limitation |
| B3 | The current `Deposits at Risk` card hardcodes `USD` currency, making the metric factually wrong for any shop that has changed payment currency or holds multi-currency bookings. | technical limitation |
| B4 | The current `High-Risk Appointments` card label does not match the proposed `High-Risk Customers` label, but the metric is still backed by appointment count. The naming mismatch cannot be resolved without a product decision on the unit of measure. | knowledge gap |
| B5 | The daily log has no unified event model: `appointment_events`, `message_log`, and automated state mutations (payment webhooks, confirmation replies, slot recovery transitions) use different shapes with no shared append-only activity contract. | technical limitation |
| B6 | The `Deposits at Risk` expiry line (`Expires in 48h`) has no single truthful backing timestamp in the current model; cancellation cutoff, confirmation deadline, and appointment start are three different clocks with different applicability rules. | knowledge gap |
| B7 | The dashboard currently has no search capability, and the scope, matching rules, and result behaviour for the proposed search bar are undefined. | knowledge gap |

---

## C) Current Situation (facts)

- The existing dashboard supports: time-windowed attention queue (`24 / 72 / 168 / 336 h`), tier distribution chart (Top / Neutral / Risk counts), upcoming appointments table with tier filter and sort, and summary cards for upcoming count and deposits at risk. *(Verified: `requirements-audit.md`, `src/lib/queries/dashboard.ts`)*
- The attention queue is already scoped to `booked` appointments and enforces owner-session shop scope. *(Verified: `src/app/app/dashboard/page.tsx:11–42`)*
- `Deposits at Risk` is computed from `payments.amountCents` with a hardcoded `USD` currency formatter; the query does not group by `payments.currency`. *(Verified: `src/components/dashboard/summary-cards.tsx:1–9`, `src/lib/queries/dashboard.ts:120–172`)*
- The current summary card passes `highRiskAppointments.length` (appointment count) into a component whose label is `High-Risk Appointments`; the proposed design labels the same card `High-risk customers`. *(Verified: `src/components/dashboard/summary-cards.tsx:31–34`, `spike-4`)*
- The system has no search route or search query contract for customers or appointments at the dashboard level. *(Verified: `src/components/dashboard/all-appointments-table.tsx:17–181`, `spike-1`)*
- `appointment_events` and `message_log` are separate tables with different schemas and no shared activity item model. Payment lifecycle state mutations (webhook-driven) do not write to either table. *(Verified: `src/lib/schema.ts:689–717`, `src/lib/schema.ts:880–919`, `spike-2`)*
- Shop policy currency is editable; new bookings snapshot currency into both `policy_versions` and `payments`. Multi-currency bookings in one dashboard window are operationally possible. *(Verified: `src/lib/schema.ts:340–399`, `spike-5`)*
- The proposed design includes a notification bell and an internal "New Appointment" CTA; neither has a backing model or creation flow in the codebase. *(Verified: `src/app/book/[slug]/page.tsx:12–153`, `src/components/app/app-nav.tsx:8–22`, `requirements-audit.md`)*
- Upcoming appointments trend delta is not computable from current data; `getTotalUpcomingCount` returns only the current count with no historical snapshot table. *(Verified: `src/lib/queries/dashboard.ts:76–93`, `spike-3`)*
- The current appointments table is fully client-side with no server-backed pagination or export route. *(Verified: `src/lib/queries/dashboard.ts:205–325`, `spike-7`)*

---

## D) Standard / Expectation

**What "good" looks like:**

Every dashboard metric, label, and control satisfies the following conditions simultaneously:

1. **Truthful** — the label matches the exact unit of measure the query returns (customers vs appointments, captured payments vs policy amounts, single-currency vs multi-currency).
2. **Consistent** — all cards that reference a window or scope use the same window and scope so they cannot disagree with each other.
3. **Actionable** — every visible control navigates to an existing route or triggers an existing API operation with no implied workflow that the system cannot complete.
4. **Defined** — every displayed metric has a locked product contract (what is counted, what window, what currency, what denominator) before implementation begins.

---

## E) Discrepancy

**Standard:** Every dashboard metric, label, and control is truthful, consistent, actionable, and defined before implementation.
**Current:** Seven proposed features have undefined contracts, two controls imply non-existent workflows, the money KPI uses a hardcoded currency that can be factually wrong, and the high-risk card label does not match its backing metric.
**Discrepancy:** The proposed dashboard design cannot be implemented as shown without first resolving seven knowledge gaps and removing or deferring two controls that require new product workflows.

---

## F) Extent (problem characteristics)

| Dimension | Detail |
|-----------|--------|
| When it happens | At design handoff to implementation — gaps surface when the developer looks for a backing query or product rule |
| How often | Affects every implementation pass that touches the undefined features (7 of the 17 non-deferred items) |
| Where it occurs | Dashboard route (`/app/dashboard`), summary cards, appointments table, proposed search bar, proposed daily log tab |
| How long it has been happening | Since the proposed design was created (2026-04-14); the current implementation predates the proposed design and does not have these gaps |
| Trend | Stable — no gaps are resolving without explicit product decisions |
| What is affected | Shop owner operational visibility; developer implementation accuracy; metric trust once shipped |
| Types of occurrences | Undefined units of measure (KPI labeling), undefined computation (delta, retention, expiry), missing infrastructure (search route, event model, pagination), implied-but-absent workflows (notification, booking creation) |

---

## G) Point of Cause (POC)

The gaps are not implementation bugs — they are upstream product definition gaps that entered the backlog when the proposed design was created before a product contract existed for each metric.

**Track-back plan:**

1. **Labels vs backing data (B3, B4):** Compare each proposed card label against the actual query return type and unit. Two mismatches already confirmed: currency hardcoding and appointment-count-vs-customer-count.
2. **Controls vs existing workflows (B2):** For each visible control on the proposed design, verify that a complete backing route and data model exist. Two controls fail this check: notification bell and internal new-appointment CTA.
3. **Metric definitions (B1, B6):** For each proposed KPI without a currently implemented query, confirm whether the required data exists, whether the denominator is defined, and whether the current schema supports it without additions.
4. **Infrastructure gaps (B5, B7):** For each proposed UI surface (search, daily log) verify whether a route contract, query contract, and event model exist today. Both are currently absent.

The defect first appears at the design-to-implementation boundary. The root is that the design was built from a visual mock rather than from the current product model.

---

## H) Draft Problem Statement (final)

The shop owner's dashboard currently supports core operational monitoring — attention queue, tier distribution, and upcoming appointments — but the proposed enhanced design cannot be implemented as shown because seven of its new features (global search, daily log, trend delta, retention percentage, high-risk customer KPI, deposits-at-risk expiry, and pagination/export) lack locked product contracts, and two visible controls (notification bell, internal appointment creation) require product workflows that do not exist in the system.

Additionally, two existing metrics already contain factual inaccuracies: the deposits-at-risk card uses a hardcoded USD formatter that is wrong for multi-currency shops, and the high-risk card label names customers while the query counts appointments.

The discrepancy is between a proposed design that assumes a fully-defined operational intelligence surface and a current implementation where the data contracts, computation rules, and backing infrastructure for roughly half the proposed features are undefined or absent.

---

## I) Clarifying Questions

1. **(B1 / H)** Of the seven "needs spike" features, which ones are hard requirements for the first shipped version, and which can be deferred to a follow-up iteration?
- docs\shaping\dashboard-ui\spike-1-dashboard-search-scope.md - Do not ship dashboard search
- docs\shaping\dashboard-ui\spike-2-dashboard-daily-log.md - Do not Ship `Daily Log`
- docs\shaping\dashboard-ui\spike-3-dashboard-upcoming-delta.md - Do not ship a trend annotation under `Upcoming Appointments` in the current dashboard.
- docs\shaping\dashboard-ui\spike-4-dashboard-high-risk-customers-kpi.md - Yes follow Recommended implementation shape
- docs\shaping\dashboard-ui\spike-5-dashboard-deposits-at-risk-expiry-and-currency.md
-- keep `Deposits at Risk` as a money KPI
-- define it as payment-led captured exposure on booked high-risk appointments in the selected window
-- remove the generic expiry line from v1
-- make dashboard money currency-aware, with a mixed-currency guard instead of a hardcoded `USD`
- docs\shaping\dashboard-ui\spike-6-dashboard-monthly-retention.md
-- do not ship `Monthly Retention %` with `Recovered / Refunded` breakdown
-- keep the current monthly money totals as the truthful v1 surface
- docs\shaping\dashboard-ui\spike-7-dashboard-pagination-and-export.md - do not ship pagination or export on the dashboard upcoming-appointments table yet

2. **(B4 / D)** Should the high-risk summary card count **unique customers** with at least one high-risk booked appointment in the selected window, or should it continue to count **appointments**? The answer determines the metric label and the query shape. - It count **unique customers** with at least one high-risk booked appointment

3. **(B3 / D)** If a shop has bookings in multiple currencies within the same dashboard window, should the deposits-at-risk card show a per-currency breakdown, a single dominant-currency total, or a neutral "multiple currencies" state? A: a single dominant-currency total

4. **(B2 / F)** Is the notification bell in scope for this iteration, or should it be removed from the design? If in scope, what is the minimum notification model required to back it honestly? A: Removed

5. **(B5 / G)** For the daily log tab: which event types must appear at launch (e.g., bookings created, cancellations, confirmation outcomes)? And is an append-only event table an acceptable schema addition to support it? See Q1 Do not Ship `Daily Log` for mvp

6. **(B6 / D)** If the deposits-at-risk expiry line ships, which expiry clock does the product intend: (A) next cancellation-cutoff crossing, (B) next confirmation-deadline expiry, or (C) nearest appointment start? Make a recommendation for MVP

7. **(B7 / G)** Should the dashboard search bar filter the current tables in place, or act as a quick-find navigator that routes to existing customer/appointment detail pages? Do not ship dashboard search for mvp
