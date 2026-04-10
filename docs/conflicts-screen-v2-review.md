# Conflicts Screen V2 Review

Reviewed against:
- Proposed mock: `docs/conflict_screenv2.png`
- Current route: `src/app/app/conflicts/page.tsx`
- Current actions: `src/app/app/conflicts/actions.ts`
- Current query/model: `src/lib/queries/calendar-conflicts.ts`, `src/lib/calendar-conflicts.ts`, `src/lib/schema.ts`

## Summary

This v2 design is substantially closer to what the app can support today than the earlier mock.

Compared with v1, it removes the two biggest unsupported ideas:
- no bulk `Resolve All`
- no analytics card / reliability score

That is a good direction. The current app can support the overall structure of this screen:
- a dedicated conflicts page
- a list or table of pending conflicts
- a time column
- a conflict details section
- severity badges
- per-row actions for `Keep Appointment` and `Cancel Appt`

The remaining mismatch is that the design still suggests a richer product than the app currently has in three areas:
- conflict categories (`Calendar Event`, `Personal Event`, `Calendar Block`)
- team/staff semantics (`Studio Appointment`, implied staff ownership)
- travel / leave semantics (`Requires 25 min travel`, `Status: Medical Appt`)

## What Is Supported Now

### Fully supported now

- Route at `/app/conflicts`
- Pending conflict records from `calendar_conflict_alerts`
- One item per booked appointment conflicting with one calendar event
- Appointment start/end time
- Conflicting calendar event title and time
- Customer identity
- Severity display from existing values:
  - `full`
  - `high`
  - `partial`
  - `all_day`
- Action: dismiss via `Keep Appointment`
- Action: cancel appointment via `Cancel Appointment`
- Empty state when no conflicts exist

### Supported with straightforward UI reshaping

- Converting the current table into a more polished table/card hybrid
- Adding a top label like `Urgent Attention`
- Using a four-column structure:
  - time
  - conflict details
  - severity
  - actions
- Stronger visual emphasis on the appointment block vs event block
- Button hierarchy with primary `Keep Appointment` and secondary text action for cancellation

### Supported with a small query extension

- Showing service name instead of a generic appointment label
  - requires joining `eventTypes` into the conflicts query
- Showing appointment duration inline
  - derived from start/end timestamps
- Sorting conflicts by severity before time
  - current query sorts by appointment time only

## What This Mock Gets Right

This v2 mock is aligned with the current product in several important ways:

- It keeps the page focused on **single-conflict resolution**
- It preserves the two real actions the app currently has
- It uses a structured list layout rather than bespoke cards for every conflict
- It removes unsupported bulk and KPI concepts from the earlier mock

If the team wants to implement a visually upgraded `/app/conflicts` now, this mock is a much safer base than v1.

## What Is Not Feasible As-Shown Today

### 1. Named event types like `Personal Event` and `Calendar Block`

The current data model stores:
- calendar event summary
- calendar event start/end
- severity

It does not store a normalized event classification such as:
- personal event
- calendar block
- travel block
- leave block

Those labels may be visually useful, but today they would be guessed from freeform Google Calendar event text. That is not reliable enough to treat as a committed UX behavior without shaping.

### 2. Travel semantics like `Requires 25 min travel`

The app has buffer logic and conflict detection, but it does not model travel time as a first-class concept in the conflicts feature.

That means the UI cannot honestly promise travel-aware conflict reasoning today. A line like `Requires 25 min travel` would currently be decorative unless the product first defines:
- where travel time comes from
- whether it is user-authored, inferred, or imported
- how it affects conflict severity or actions

### 3. Leave / availability semantics like `Status: Medical Appt`

The app can detect a conflict with any overlapping Google Calendar event. It cannot currently distinguish:
- leave
- appointment
- admin hold
- commute
- personal appointment

That means the event title can be shown, but the system does not yet know the business meaning of that event.

### 4. Team/staff semantics

The left navigation still includes `Team`, and the detail blocks imply a studio/team workflow, but the current conflicts system is not staff-assigned.

Today there is no conflict row data for:
- assigned staff member
- provider calendar
- reassignment target
- resource/room ownership

So the visual language should avoid implying staff-aware resolution unless that capability is shaped first.

### 5. Severity labels shown as `High` / `Medium`

The current backend severity values are:
- `full`
- `high`
- `partial`
- `all_day`

The design shows `High` and `Medium`, which is close, but not an exact match. That is a small mismatch, but it still needs an explicit product decision:
- map `partial` to `medium`
- keep raw backend wording
- introduce a presentation-only severity mapping

## Recommended Design Boundary For V2

This design can move forward if it stays inside the current product boundary:

- keep the structured list/table layout
- keep per-row actions only
- show actual event summary text from Google Calendar
- show actual appointment/customer/service data from the booking system
- present severity in a cleaner visual form

Remove:
- inferred event category labels
- travel-time messaging
- leave-specific statuses
- staff-aware resolution semantics

unless the spikes below are completed.

## Spikes Needed

### Spike 1: Conflict Presentation Mapping

Goal:
- define how backend conflict data should map to the polished UI

Questions:
- Should severity stay as `full/high/partial/all_day` in UI?
- Should `partial` display as `Medium`?
- Should all-day events have a unique row treatment?
- What fields are always present vs optional?

Output:
- stable UI mapping spec for current data model

### Spike 2: Calendar Event Classification

Goal:
- determine whether event labels like `Personal Event` or `Calendar Block` are trustworthy enough to display

Questions:
- Can these be inferred from Google event metadata?
- Do we need explicit user tagging?
- Are categories purely cosmetic or do they change actions?
- What is the fallback when the event cannot be classified?

Output:
- classification approach
- confidence/fallback rules
- recommendation: infer, tag, or defer

### Spike 3: Travel-Time Conflicts

Goal:
- decide whether travel-aware conflicts are a real feature or just visual flavor

Questions:
- Is travel time part of buffer settings, event metadata, or a separate model?
- Do travel conflicts need a separate severity or category?
- Should travel affect booking prevention, scanner output, or only UI messaging?

Output:
- source-of-truth decision
- scope recommendation
- implementation dependencies

### Spike 4: Staff / Resource Ownership

Goal:
- determine whether conflicts remain shop-level or become staff/resource-level

Questions:
- Are appointments assigned to providers?
- Are there separate calendars per provider?
- Do we need room/chair/resource conflicts?
- Is reassignment in scope for conflicts resolution?

Output:
- ownership model
- minimum schema additions
- recommended phased rollout

### Spike 5: Service Enrichment On Conflicts

Goal:
- define the minimal data enrichment that is safe to add immediately

Questions:
- Should the row show service name, customer, and duration?
- Should the row deep-link to appointment details?
- Should service and duration come from `eventTypes` and timestamp math only?

Output:
- small-scope UI/data enhancement plan that can ship without new product bets

## Recommended Next Step

Use this v2 mock as the basis for the next design iteration, but trim it to the data the app can truthfully support now.

Best near-term implementation target:
- keep the overall layout
- use real severity values or a documented presentation mapping
- show service name, customer, duration, and calendar event summary
- keep actions limited to `Keep Appointment` and `Cancel Appointment`

Defer:
- inferred event categories
- travel-specific messaging
- leave/status semantics
- team/resource implications

This keeps the visual upgrade ambitious, while keeping the product honest to the current system.
