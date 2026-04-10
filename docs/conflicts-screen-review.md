# Conflicts Screen Review

Reviewed against:
- Proposed mock: `docs/Conflicts_screen.png`
- Current route: `src/app/app/conflicts/page.tsx`
- Current actions: `src/app/app/conflicts/actions.ts`
- Current query/model: `src/lib/queries/calendar-conflicts.ts`, `src/lib/calendar-conflicts.ts`, `src/lib/schema.ts`

## Summary

The current product already supports a solid **calendar conflict dashboard**, but it is materially narrower than the mock.

Today the app supports:
- detecting pending conflicts between booked appointments and Google Calendar events
- showing those conflicts on `/app/conflicts`
- severity badges
- keeping an appointment by dismissing the alert
- cancelling an appointment from the conflict screen, including refund/cancellation side effects
- surfacing a conflict banner from the appointments page

The mock introduces several ideas that are **not first-class capabilities in the app today**:
- bulk resolution (`Resolve All`)
- rescheduling from the conflict screen
- staff reassignment (`Assign Other`)
- staff/team availability concepts (`Lead Stylist`, `Out of Office`, `Staff Unavailability`)
- richer conflict taxonomy (`Double Booking`, `Travel Time Conflict`) beyond severity
- operational analytics (`Weekly Efficiency Insight`, `98% Studio Reliability Score`)

The right approach is to treat the mock as a **future-state direction**, then split it into:
1. what can be implemented now with the existing model
2. what needs a small query/UI extension
3. what needs a product/technical spike before design should be committed

## What The App Supports Now

### Fully supported now

- Dedicated conflicts page at `/app/conflicts`
- Pending conflict alerts backed by `calendar_conflict_alerts`
- One row per appointment/event conflict
- Appointment time and conflicting event time
- Customer identity
- Severity display: `full`, `high`, `partial`, `all_day`
- Action: `Keep Appointment` via dismiss
- Action: `Cancel Appointment` via confirmation flow
- Banner on appointments page when conflicts exist
- Auto-resolution when appointments are cancelled or move into the past

### Supported by current backend, but the UI is simpler than the mock

- Conflict urgency styling can be upgraded without backend changes
- A card layout can replace the current table without backend changes
- Event/service metadata can be expanded
  - The app already has `eventTypes`
  - The current conflicts query does not join them yet
- Duration labels can be derived from `startsAt` / `endsAt`
- Conflict counts and overview chips can be added from current data

### Important nuance

The current scanner already understands **calendar overlap severity** and uses shared overlap rules, including buffer-aware conflict detection. That means parts of the mock like a tighter scheduling warning are directionally compatible with current logic, but the product does **not** currently classify those conflicts as a named type such as `Travel Time Conflict`.

## Mock Elements That Are Feasible Now

These are safe to design and implement against the current system.

### Safe now

- Page title and explanatory copy
- “Urgent attention” style label
- Conflict cards instead of a table
- Showing appointment details and event details in separate stacked blocks
- Showing severity more prominently
- Empty-state and banner polish
- Better visual grouping for actions

### Safe with a small extension

- Show service name on each conflict card
  - Requires joining `eventTypes` into the conflicts query
- Show duration on the appointment block
  - Derived from start/end timestamps
- Show clearer labels for all-day events or external calendar blocks
- Add filter chips for severity or status
  - Current route only shows pending alerts, so status filtering is limited unless expanded

## Mock Elements That Are Not Feasible As-Is Today

These should not be treated as implementation-ready without additional shaping.

### 1. `Resolve All`

The app has only per-conflict actions today. There is no batch resolution workflow, and the semantics are not obvious:
- Does “resolve all” mean dismiss all?
- Cancel all conflicting appointments?
- Resolve only conflicts below a threshold?
- Skip conflicts that require refund confirmation?

This is a product and safety decision, not just a UI button.

### 2. `Reschedule`

Rescheduling is explicitly out of scope in current shipped behavior. The system supports cancellation and booking creation, but not a first-class reschedule flow from conflicts.

This matters because rescheduling touches:
- payment handling
- policy snapshots
- calendar event updates
- availability revalidation
- buffer behavior
- notification behavior

### 3. `Assign Other`

The app does not currently model staff assignment as a schedulable resource. The mock implies multi-staff routing, but the current product is still effectively a single-provider/shop-owner scheduling model.

Without staff/resource modeling, “assign other” has no real backend target.

### 4. `Keep & Notify Client`

The app has messaging infrastructure, but this specific conflict-resolution action does not exist. The product does not currently define:
- what message is sent
- when it is sent
- whether it is informational or asks for confirmation
- whether it changes appointment state

### 5. Named conflict categories like `Double Booking`, `Travel Time Conflict`, `Staff Unavailability`

Current alerts store **severity**, not a richer conflict type taxonomy. The app knows:
- the appointment
- the overlapping calendar event
- overlap severity

It does not currently know:
- whether the event represents travel
- whether it is staff leave
- whether it is a room/resource conflict
- whether it should be framed as a double booking vs. availability block

### 6. Team/staff language in the card body

Labels like:
- `Lead Stylist`
- `Out of Office`
- named staff coverage

imply a team/resource model that is not present in the current schema or workflows.

### 7. `Weekly Efficiency Insight` / `98% Studio Reliability Score`

This is not backed by an existing metric. It is a product analytics feature, not just decorative copy.

Before designing it into the page, the team needs agreement on:
- the numerator/denominator
- the time window
- whether dismissed conflicts count as avoided or ignored
- whether cancelled appointments reduce or improve the score

## Recommended Design Boundary

If the goal is to move this screen forward now, the design should stay within this boundary:

- Keep the page as a **conflict management screen**
- Use richer cards instead of a dense table
- Keep the core actions limited to:
  - `Keep Appointment`
  - `Cancel Appointment`
- Optionally add small data enrichments:
  - service name
  - duration
  - severity-first ordering
  - filters

Do not lock in:
- bulk resolution
- rescheduling
- reassignment
- staff-aware workflows
- analytics cards

until the spikes below are completed.

## Spikes Needed

### Spike 1: Conflict Action Matrix

Goal:
- define which actions are valid for each conflict type/severity

Questions:
- When is dismiss enough?
- When should cancellation be blocked or require extra confirmation?
- Is any safe bulk action allowed?
- Should all-day events behave differently from partial overlaps?

Output:
- action matrix for `pending` conflicts
- rules for single-item vs bulk resolution

### Spike 2: Rescheduling From Conflict Resolution

Goal:
- determine whether conflict resolution should support rescheduling, and if so, how

Questions:
- Is reschedule an in-place move or cancel + create new?
- How do policy snapshots behave?
- What happens to payment intents / deposits?
- How are calendar events updated?
- What customer communications are required?

Output:
- one-page flow decision
- API/service dependencies
- sequencing recommendation

### Spike 3: Staff / Resource Model

Goal:
- determine whether the conflicts page should stay single-provider, or evolve into staff/resource scheduling

Questions:
- Are appointments assigned to a staff member?
- Do staff have their own calendars?
- Is conflict detection against shop calendar, provider calendar, room calendar, or all three?
- What does `Assign Other` actually mutate?

Output:
- resource model proposal
- minimal schema changes
- scope cut for v1 vs future

### Spike 4: Conflict Taxonomy

Goal:
- move from generic severity-only alerts to meaningful conflict categories

Questions:
- Which categories matter now?
- Can they be inferred from current event data?
- Do categories affect action availability?
- Do we need a `conflictType` column, derived label, or both?

Output:
- proposed taxonomy
- derivation rules
- schema recommendation if needed

### Spike 5: Insight / Reliability Metrics

Goal:
- decide whether the screen should include operational analytics

Questions:
- What does “efficiency” mean in this domain?
- What does “reliability score” mean?
- Is this a weekly KPI, rolling 30-day KPI, or vanity metric?
- Which data already exists vs must be backfilled?

Output:
- metric definitions
- query/data source requirements
- recommendation to include or defer

## Recommended Next Step

Design the next iteration of `/app/conflicts` as a **high-fidelity version of the current product**, not the full mock.

That means:
- keep card-based conflict presentation
- keep existing actions only
- add service/duration enrichment
- defer staff workflows, rescheduling, bulk actions, and analytics until spikes are complete

This keeps the page honest to the system the app actually has today, while still letting the visual design improve substantially.
