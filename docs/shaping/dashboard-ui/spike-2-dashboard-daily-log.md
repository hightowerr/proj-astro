# Spike 2: Dashboard Daily Log

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Define what the `Daily Log` tab should mean in the current app.

This spike needs to answer:

- whether `Daily Log` is a notification center, an audit log, or an operational feed
- which current data sources are trustworthy enough to back it
- which activity types can be shown now without lying about product behavior
- which proposed activity types are blocked by missing event logging
- what the smallest implementation boundary is for a truthful v1

## Current State

Observed in the codebase:

- The current dashboard route has no log view; it only renders quick-view sections.
- The repo has two append-only activity-like sources:
  - `appointment_events`
  - `message_log`
- The repo also has stateful tables that look activity-like but are not full event streams:
  - `appointments`
  - `slot_openings`
  - `slot_offers`
  - `payments`
- Appointment detail already joins messages and customer/service context.
- Customer detail and appointment detail pages already exist as canonical drill-in destinations.

Important limitations in the current system:

- booking creation does not currently write a `created` row to `appointment_events`
- Stripe webhook payment success/failure updates state but does not write `payment_succeeded` / `payment_failed` rows to `appointment_events`
- customer confirmation replies update `confirmationStatus` in place, but do not create an event row
- slot recovery offer sends create `slot_offers` rows, but do not write to `message_log`
- slot recovery state transitions are mostly stored as current state with timestamps, not as an append-only lifecycle

Relevant code:

- `src/app/app/dashboard/page.tsx`
- `src/lib/schema.ts:139-160`
- `src/lib/schema.ts:689-919`
- `src/app/api/appointments/route.ts:27-139`
- `src/app/api/stripe/webhook/route.ts:209-290`
- `src/lib/confirmation.ts:143-285`
- `src/lib/confirmation.ts:509-572`
- `src/lib/messages.ts:174-194`
- `src/lib/messages.ts:305-373`
- `src/lib/messages.ts:382-505`
- `src/lib/slot-recovery.ts:46-95`
- `src/lib/slot-recovery.ts:337-366`

## Questions

| # | Question |
|---|----------|
| Q1 | What kind of surface should `Daily Log` be? |
| Q2 | Which current data sources are trustworthy enough for a v1 timeline? |
| Q3 | Which activity types can be shown now? |
| Q4 | Which activity types are not loggable yet? |
| Q5 | What should the v1 query and UI contract look like? |
| Q6 | Does v1 need schema changes? |

## Findings

### Q1 — `Daily Log` should be a passive operational timeline, not a notification center

The proposed mock shows `Quick View` and `Daily Log` as peer dashboard views.

The current product does not have:

- unread/read state
- user-scoped notifications
- acknowledgement state
- inbox semantics

So `Daily Log` cannot truthfully be a bell-style notification center.

It also should not be framed as a complete audit log because several meaningful lifecycle events are not written as append-only records today.

The truthful fit is a **passive operational timeline**:

- reverse chronological
- grouped by day
- link-out to existing appointment/customer details
- no unread state
- no resolution state
- no destructive actions inside the log

**Decision:** `Daily Log` is a read-only operational feed for recent customer-facing and appointment-state activity.

### Q2 — Three current sources are usable, but they are not equally strong

#### Source 1: `message_log`

This is the strongest existing source for outbound communication activity.

It already captures:

- channel
- purpose
- sent/failed status
- rendered body
- provider id
- created/sent timestamps
- shop, appointment, and customer ids

This is suitable for timeline items such as:

- booking confirmation sent/failed
- reminder sent/failed
- confirmation request sent/failed
- email reminder sent/failed

#### Source 2: `appointment_events`

This is the strongest source for appointment-state transitions, but only for the subset that is actually emitted.

Today the live code writes:

- `cancelled`
- `outcome_resolved`

The enum supports more event types, but the repo is not currently emitting all of them.

#### Source 3: `appointments.createdAt` as a derived event

If the daily log should show new bookings, the current app can derive a synthetic `appointment_created` item from `appointments.createdAt`.

This is not as strong as an append-only event table, but it is still truthful:

- appointment creation is durable
- `createdAt` is immutable
- it supports a useful “new booking appeared” item

**Decision:** a truthful v1 may merge:

- `message_log`
- emitted `appointment_events`
- synthetic booking-created items from `appointments.createdAt`

### Q3 — These activity types are supportable now

Recommended v1 item set:

| Activity type | Source | Support now | Notes |
|---|---|---|---|
| Appointment created | derived from `appointments.createdAt` | Yes | label should stay generic: `Appointment created` |
| Appointment cancelled | `appointment_events` | Yes | reason can come from `meta.reason` |
| Financial outcome resolved | `appointment_events` | Yes | label from `financialOutcome` + `resolutionReason` |
| Booking confirmation sent/failed | `message_log` | Yes | already logged after payment success workflow |
| Confirmation request sent/failed | `message_log` | Yes | already logged by confirmation flow |
| Reminder sent/failed | `message_log` | Yes | SMS and email reminders already log channel + status |

This set is operationally useful and backed by durable timestamps.

It also aligns with what a shop owner can already inspect elsewhere in the app.

### Q4 — These activity types are not truthful to show yet

#### 1. Payment succeeded / payment failed / payment canceled

Blocker:

- the Stripe webhook updates `payments` and `appointments`, but does not insert the corresponding `appointment_events` rows

Why it matters:

- `payments.updatedAt` is mutable state, not a durable lifecycle record
- a daily log should not infer exact payment milestones from overwritten row state

Recommendation:

- exclude payment lifecycle items from v1
- if needed later, add explicit event writes for `payment_succeeded` and `payment_failed`

#### 2. Customer confirmed by SMS reply

Blocker:

- `processConfirmationReply()` updates `confirmationStatus` directly and returns a reply message, but does not write an append-only event or timestamped confirmation record

Why it matters:

- the log cannot reconstruct when confirmation happened or distinguish it from any later appointment update

Recommendation:

- exclude “customer confirmed” from v1
- later, add a dedicated event row or confirmation timestamp field

#### 3. Slot recovery offer sent / accepted / expired / declined

Blocker:

- sending an offer writes `slot_offers.status = "sent"` but does not write to `message_log`
- later transitions mutate `slot_offers` / `slot_openings` state in place
- there is no append-only slot recovery activity stream

Why it matters:

- a daily log would only see the latest state, not the full lifecycle
- showing slot recovery as timeline items would imply a durable audit trail that does not exist yet

Recommendation:

- exclude slot recovery lifecycle from v1
- later, either log offers to `message_log` and/or add append-only slot recovery activity rows

#### 4. Conflict dismissed / keep appointment

Blocker:

- dismissing a conflict does not create a timeline-friendly event record in the dashboard activity model

Why it matters:

- the action is operationally meaningful, but not currently represented as feed activity

Recommendation:

- exclude from v1

### Q5 — V1 should use a bounded merged query, not a new subsystem

Recommended server contract:

```ts
type DashboardDailyLogItem = {
  id: string;
  kind:
    | "appointment_created"
    | "appointment_cancelled"
    | "outcome_resolved"
    | "message_sent"
    | "message_failed";
  occurredAt: string;
  appointmentId: string | null;
  customerId: string | null;
  customerName: string | null;
  eventLabel: string;
  channel: "sms" | "email" | null;
  href: string | null;
  meta?: Record<string, string | number | boolean | null>;
};
```

Recommended query shape:

- `getDashboardDailyLog(shopId, { limit: 50, days: 7 })`
- fetch three bounded datasets in parallel:
  - recent appointments by `createdAt`
  - recent `appointment_events`
  - recent `message_log`
- map to a shared item shape
- merge in memory
- sort descending by `occurredAt`

Why this is the right level:

- the feed is bounded
- the repo already has the required relational joins
- the current app does not need a generalized event bus just to support one dashboard tab

Recommended UI behavior:

- grouped by calendar day, newest first
- no unread counters
- no row-level mutations
- each row can link to appointment details when `appointmentId` exists
- optional secondary link to customer details if the item is customer-centric

### Q6 — V1 does not need a new table, but it should add one small index

No new schema object is required for v1.

However, if implementation begins, one small index is justified:

- add an index on `appointment_events(shop_id, occurred_at desc)`

Why:

- `appointment_events` currently indexes by `appointmentId`, not by `shopId`
- a dashboard-wide recent feed is shop-scoped, not appointment-scoped

Optional follow-up index if volume grows:

- `message_log(shop_id, created_at desc)`

This is not required to settle the product decision, but it is the right implementation guardrail if the feature ships.

## Recommended Product Contract

### What `Daily Log` is

`Daily Log` is a recent operational timeline for the shop owner.

It shows:

- recent appointment creation
- recent cancellation / outcome changes
- recent outbound customer communications and failures

It does not show:

- unread notifications
- full payment lifecycle
- slot recovery lifecycle
- customer confirmation reply events
- every possible background-system event

### Time window

Recommended default:

- last 7 days
- maximum 50 items

Reason:

- enough density to feel alive
- small enough to stay useful and fast
- avoids implying full historical audit support

### Drill-in behavior

Primary drill-in target:

- `/app/appointments/[id]`

Why:

- appointment detail already exposes messages and related customer context
- it is the best existing destination for most timeline items

## Recommended Technical Shape

### Route / state

Keep this on the dashboard route and switch views by query param, for example:

- `/app/dashboard?view=quick`
- `/app/dashboard?view=log`

This fits the mock’s tabbed model and keeps routing simple.

### Data assembly

Build one server query helper:

- `getDashboardDailyLog(shopId, options)`

Implementation notes:

- use `shopId` derived from the current session
- avoid client-side fetching for first render
- join customer names where needed so feed rows are readable
- normalize all items into one shared shape before rendering

## What Should Not Be In This Spike

- unread/read notification state
- notification preferences
- a bell menu
- payment milestone timeline items
- slot recovery lifecycle timeline items
- staff/team activity
- a generalized event bus
- historical pagination across all time

## Launch Recommendation

Ship `Daily Log` only if the team is comfortable with a narrow but truthful activity scope.

Recommended v1:

- read-only operational feed
- backed by `appointments.createdAt`, `appointment_events`, and `message_log`
- links out to appointment detail
- excludes payment lifecycle, slot recovery lifecycle, and confirmation-reply events

If the design requires a broader “everything that happened today” surface, do not fake it with current data. Add missing event logging first.

## Follow-up Needed For A Broader Log

If the product later wants a richer dashboard activity stream, the next required work is:

1. Write `appointment_events` for booking creation.
2. Write `appointment_events` for Stripe payment success/failure.
3. Record confirmation replies as append-only events.
4. Add append-only slot recovery activity logging, or log offers through `message_log`.
5. Decide whether conflict dismissals and calendar sync events belong in the same feed.

## Output

Daily log decision:

- `Daily Log` should be a passive operational timeline, not a notification center

V1 source-of-truth:

- merge `appointments.createdAt`, emitted `appointment_events`, and `message_log`

V1 exclusions:

- payment lifecycle
- slot recovery lifecycle
- customer confirmation replies
- unread/notification semantics
