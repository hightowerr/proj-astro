# Spike 3: Upcoming Appointments Delta

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Decide what the green delta under `Upcoming Appointments` should mean.

This spike needs to answer:

- what `+12% vs last month` would mean on a future-load card
- whether the current data model can support that definition truthfully
- whether there is a smaller truthful metric that could replace it
- what the v1 dashboard should ship
- what implementation shape would be required if the product later insists on a true delta

## Current State

Observed in the codebase:

- The current dashboard metric is only a live count of future `booked` appointments in the next 30 days.
- There is no comparison baseline or historical snapshot table.
- Appointments have durable timestamps:
  - `startsAt`
  - `cancelledAt`
  - `createdAt`
- Payment-required appointments are created as `pending`, then later moved to `booked` after Stripe success.
- The Stripe webhook mutates appointment/payment state directly, but does not currently emit corresponding `appointment_events` for payment success/failure.
- The schema has a shop timezone on `booking_settings`, but the current upcoming-count query does not use a shop-local calendar comparison model.

Relevant code:

- `src/lib/queries/dashboard.ts:76-93`
- `src/lib/schema.ts:260-295`
- `src/lib/schema.ts:528-585`
- `src/lib/schema.ts:139-148`
- `src/lib/queries/appointments.ts:892-912`
- `src/app/api/stripe/webhook/route.ts:209-263`

## Questions

| # | Question |
|---|----------|
| Q1 | What are the plausible meanings of `+12% vs last month` on an upcoming-load card? |
| Q2 | Which of those meanings matches the mock best? |
| Q3 | Can the current model support that best meaning truthfully? |
| Q4 | Are there weaker metrics that are calculable now? |
| Q5 | What should ship in v1? |
| Q6 | If the team wants this later, what implementation shape is required? |

## Findings

### Q1 — There are three plausible interpretations, and they are not equivalent

The mock implies a period-over-period change attached to a future-load KPI.

There are three realistic candidate meanings:

#### Option A: Forecast-over-forecast

Meaning:

- compare today’s `upcoming appointments in the next 30 days`
- against what that same metric was one month ago

Example:

- on April 14, count booked appointments between April 14 and May 14
- compare to the count that was booked between March 14 and April 14, as measured on March 14

This is the best semantic match to the mock.

#### Option B: Forward load vs previous realized volume

Meaning:

- compare today’s upcoming next-30-day load
- against how many appointments actually occurred in the previous 30 days

This is calculable, but it is not the same metric repeated across periods.

#### Option C: Booking inflow vs last month

Meaning:

- compare appointments created this month
- against appointments created last month

This is also calculable, but it is a bookings-created metric, not an upcoming-load metric.

### Q2 — Option A is the only interpretation that matches the mock cleanly

If the annotation sits directly under `Upcoming Appointments`, the honest reader expectation is:

- “How does my current future booking load compare with the future booking load I had last month?”

That is Option A.

Options B and C would both require a label change, because they describe different business questions:

- B asks: “Am I booked ahead compared with the volume I served recently?”
- C asks: “Am I creating bookings faster than last month?”

Neither is a true `Upcoming Appointments` delta.

**Decision:** if the mock’s sublabel remains `vs last month`, the only correct interpretation is Option A.

### Q3 — The current model cannot support Option A truthfully

At first glance, the app appears close:

- appointments have `createdAt`
- appointments have `cancelledAt`
- appointments have `startsAt`

But Option A requires knowing what the shop’s **future booked load was at a prior point in time**.

That depends on whether each appointment was already considered booked at the historical snapshot moment.

The current model does not persist that reliably:

- payment-required appointments are inserted as `pending`, not `booked`
- later, Stripe success mutates the appointment to `booked`
- the webhook does not write a `payment_succeeded` event row
- booking creation also does not currently write a `created` event row to `appointment_events`

That means the system cannot answer this question exactly:

- “On March 14, was this April 2 appointment already booked, or was it still pending, or not yet created?”

Why `createdAt` and `cancelledAt` are not enough:

- `createdAt <= snapshot` only tells us the row existed
- it does not tell us whether the booking had progressed from `pending` to `booked`
- current `status` is overwritten over time, so it cannot reconstruct that historical state

This is the core blocker.

**Decision:** a true upcoming-load delta is not reconstructible from current live rows alone.

### Q4 — Weaker metrics are possible now, but they change the meaning

The following are supportable today:

#### 1. Compare current upcoming load to appointments that started in the previous 30 days

Possible source:

- `appointments.startsAt`
- final `status`

Problem:

- this compares forecast load to realized history
- the label would need to change to something like `vs previous 30d served volume`

#### 2. Compare booking creation volume this month vs last month

Possible source:

- `appointments.createdAt`

Problem:

- this is a booking inflow metric
- it does not belong under `Upcoming Appointments`

#### 3. Compare live next-30-day count to live previous-calendar-window count

Possible source:

- `startsAt`
- historical windows

Problem:

- again, that measures a different thing: past appointments in a prior period, not the prior forecast for that period

These are all valid metrics in their own right, but they are not truthful replacements for the mock’s implied meaning.

### Q5 — V1 should ship with no delta on the upcoming appointments card

This is the cleanest product decision.

Recommended v1 card:

- primary value: count of future `booked` appointments in the next 30 days
- secondary line: neutral scope text only

Recommended secondary line options:

- `Next 30 days`
- `Booked ahead`
- `Future booked appointments`

Do not ship:

- `+12% vs last month`
- up/down arrows
- positive/negative trend coloring

Why this is the right call:

- the current count is already truthful and useful
- any delta would either be ambiguous or quietly based on a different metric
- the dashboard should not imply forecasting precision the app cannot support

**Decision:** remove the delta from v1. Keep the card as a single live KPI.

### Q6 — A true future delta later requires snapshots, not clever SQL over mutable rows

If the product later insists on `vs last month`, the correct implementation is a snapshot-based metric.

Recommended future approach:

#### Add a dashboard metric snapshot table

Example shape:

```ts
dashboard_metric_snapshots {
  id
  shopId
  metricDateLocal
  timezone
  upcomingBooked30dCount
  capturedAt
}
```

Capture rule:

- once per shop per local day
- in the shop’s configured timezone
- count future `booked` appointments in `[snapshotTime, snapshotTime + 30 days)`

Comparison rule:

- compare today’s live count against the snapshot from the same shop-local date one month earlier
- if no prior snapshot exists, hide the delta

Why snapshots are preferable to reconstructing history from event tables:

- they directly answer the metric question
- they avoid trying to rebuild “booked as of historical timestamp” from incomplete lifecycle logs
- they preserve the exact number that was true at the time

This is the only implementation shape that makes the mock’s wording robust.

## Recommended Product Contract

### What the current metric means

`Upcoming Appointments` means:

- count of `booked` appointments whose `startsAt` falls within the next 30 days

### What the card should show in v1

- count only
- neutral sublabel only

### What it should not imply in v1

- month-over-month trend
- demand growth trend
- booking creation trend
- forecast comparison

## Recommended Technical Shape

### V1

Do nothing beyond the current count query, except optional neutral helper text.

### V2 if the product wants a delta

1. Add a daily snapshot mechanism in shop local time.
2. Store `upcomingBooked30dCount` per shop/day.
3. Compare today against the previous-month snapshot.
4. Hide the delta when baseline is missing.

## What Should Not Be In This Spike

- using `appointments.createdAt` as a hidden substitute for future-load delta
- comparing against prior realized appointments while still labeling it `vs last month`
- reconstructing prior booked-load snapshots from current mutable status alone
- trend arrows with no defined baseline

## Launch Recommendation

Do not ship a trend annotation under `Upcoming Appointments` in the current dashboard.

Ship the card as:

- a live next-30-day booked count
- with neutral scope text only

If the team wants a real `vs last month` trend later, implement daily metric snapshots first.

## Output

Delta decision:

- do not include `+12% vs last month` on the v1 `Upcoming Appointments` card

Reason:

- the current app can count live future bookings, but it cannot reconstruct a truthful historical future-load baseline

Future implementation boundary:

- add daily shop-timezone metric snapshots for `upcomingBooked30dCount`, then compare current count against the previous-month snapshot
