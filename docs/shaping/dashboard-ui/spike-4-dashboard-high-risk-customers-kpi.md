# Spike 4: High-Risk Customers KPI

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Decide what the proposed `High-risk customers` KPI should actually count.

This spike needs to answer:

- whether the card should count appointments or unique customers
- whether it should follow the selected dashboard window or be shop-wide
- whether the current model can support a truthful customer-level count
- what dedupe and edge-case rules are required
- what the v1 dashboard should ship

## Current State

Observed in the codebase:

- The current dashboard is operationally centered on high-risk appointments, not customer records.
- The page passes `highRiskAppointments.length` into the summary card, and the rendered label is `High-Risk Appointments`.
- High-risk status is already defined consistently from customer scoring data:
  - `tier = risk`
  - or `score < 40`
  - or `voidedLast90Days >= 2`
- The dashboard period selector only controls the attention queue today.
- Appointments already carry `customerId`, so distinct-customer counting is possible without new tables.
- Customer scoring is already one row per customer per shop.

Relevant code:

- `src/app/app/dashboard/page.tsx:11-88`
- `src/lib/queries/dashboard.ts:14-117`
- `src/lib/queries/dashboard.ts:205-263`
- `src/components/dashboard/summary-cards.tsx:11-34`
- `src/components/dashboard/tier-distribution-chart.tsx:7-74`
- `src/lib/scoring.ts:81-97`
- `src/lib/schema.ts:424-462`
- `src/lib/schema.ts:519-618`

## Questions

| # | Question |
|---|----------|
| Q1 | What are the plausible meanings of `High-risk customers` on this dashboard? |
| Q2 | Which meaning best fits the current dashboard surface? |
| Q3 | Can the current backend support that meaning truthfully? |
| Q4 | What edge-case rules are required? |
| Q5 | What should ship in v1? |
| Q6 | What implementation shape is required? |

## Findings

### Q1 — There are three plausible interpretations, and they are not interchangeable

The proposed label `High-risk customers` could mean any of these:

#### Option A: count high-risk appointments in the selected attention window

This is the current implementation in practice.

It is operationally useful, but it does not match the mock label.

#### Option B: count unique customers who have at least one high-risk booked appointment in the selected attention window

This is customer-level, but still tied to the operational queue on the page.

It answers the practical question:

- “How many customers need attention right now?”

#### Option C: count all risk-tier customers in the shop, regardless of upcoming bookings

This is also customer-level, but it is not an operational queue metric.

It overlaps heavily with the existing tier distribution section, which already exposes the shop-wide risk bucket.

### Q2 — Option B is the best fit for the proposed card

If the mock keeps the label `High-risk customers`, the truthful interpretation is a distinct-customer count, not an appointment count.

Option B fits the current dashboard best because it stays aligned with the surrounding surfaces:

- the attention table is time-windowed
- deposits at risk are computed from the same booked future appointments
- the dashboard header frames this page as an operational monitoring surface

Option C is weaker because the dashboard already has a customer-tier distribution section. A second shop-wide risk count would mostly restate the red bucket from that chart instead of surfacing immediate work.

**Decision:** if the card label remains customer-oriented, it should mean:

- distinct customers
- with at least one booked high-risk appointment
- inside the selected attention window

### Q3 — The current model can support Option B with a small query change

The backend already has the required ingredients:

- appointments are shop-scoped and future-filtered
- each appointment has `customerId`
- each customer can have at most one score row per shop
- high-risk logic is already defined in one place

This means the app can compute a truthful customer KPI by deduping `customerId` after applying the same high-risk appointment filter already used for the attention queue.

No schema change is required.

What does need to change:

- the dashboard query/result shape must expose `customerId`
- the summary card must accept a dedicated customer count instead of reusing appointment-row length

This is materially smaller than inventing a new risk model or a new background job.

### Q4 — The KPI needs explicit dedupe and window rules

If this card becomes customer-level, the counting rules must be fixed up front.

Recommended rules:

#### 1. Dedupe by `appointments.customerId`

If one risky customer has two booked appointments in the selected window, the KPI should count `1`, not `2`.

The attention table may still show both rows. That is correct, because the queue is appointment-level while the card is customer-level.

#### 2. Follow the selected attention window

The KPI should use the same `24 / 72 / 168 / 336` hour window as the attention table.

Why:

- otherwise the card and queue can disagree for reasons the user cannot see
- the dashboard already treats period selection as the main attention-state control

This means the card value should change when the window selector changes.

#### 3. Count only `booked` future appointments

The current dashboard excludes cancelled and pending appointments from its high-risk queue. The customer KPI should inherit that same rule.

That avoids counting:

- cancelled customers who no longer need outreach
- pending-payment bookings that are not yet operationally committed

#### 4. Do not count shop-wide risk-tier customers without an upcoming appointment in window

A customer can be `risk` tier historically and still have no current booking that needs action.

Those customers belong in:

- the customers page
- the tier distribution section

They should not inflate an operational KPI meant to summarize near-term attention.

### Q5 — V1 should ship as a distinct-customer count tied to the selected window

Recommended v1 card meaning:

- `High-Risk Customers`
- unique customers with at least one booked high-risk appointment inside the currently selected attention window

Recommended supporting text:

- `In selected window`
- or `Customers needing attention`

Do not ship the mock label backed by the current appointment count. That would be a naming bug, not just a copy mismatch.

If the team does not want a window-sensitive customer KPI, the safer fallback is:

- keep the existing appointment count
- keep the label `High-Risk Appointments`

What should not ship:

- `High-risk customers` backed by `highRiskAppointments.length`
- a shop-wide risk-tier customer count on this card

### Q6 — Implementation is straightforward and does not need new backend infrastructure

Recommended implementation shape:

#### Query/data contract

- add `customerId` to the dashboard appointment select shape
- compute `highRiskCustomerCount` from the same filtered pass that already builds `highRiskAppointments`
- return both:
  - `highRiskAppointments`
  - `highRiskCustomerCount`

The simplest implementation is a `Set<string>` over `customerId` inside `getDashboardData()`.

An alternative is a dedicated SQL query using `COUNT(DISTINCT appointments.customerId)`, but that is not necessary for v1 because the page already materializes the relevant appointment rows.

#### UI contract

- rename the card prop from generic `highRiskCount` to `highRiskCustomerCount`
- render the customer-oriented label only when the metric is truly deduped
- add a small scope hint so users understand why the number changes with the window selector

#### Test coverage

Add cases for:

- one customer with multiple high-risk appointments in window counts once
- one customer with one appointment inside window and one outside window counts once
- cancelled appointments do not count
- pending appointments do not count
- a risk-tier customer with no booked appointment in window does not count

## Recommendation

The fourth spike resolves to a clear v1 rule:

- the proposed `High-risk customers` KPI is feasible now
- but only as a distinct-customer count tied to the selected attention window

If the product wants a static shop-wide customer-risk KPI instead, that should be designed as a different metric, because the current dashboard already exposes shop-wide risk through tier distribution and the operational queue is appointment-window based.
