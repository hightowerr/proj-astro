# Reasoning — Shape Up

**Model:** Shape Up (`Mental_Models/Mental_Model_Economics/m33_shape_up_product_development_model.md`)
**Applied to:** Dashboard UI: Post-Clarification Implementation Scope

---

## The Shaping Is Already Done

The 7 spikes and the MoSCoW document collectively constitute the shaping output that Shape Up requires before a betting table and a build cycle. Each spike answered a structured question, identified rabbit holes, and produced an explicit no-go list. The MoSCoW classifies all 25 items across four tiers. This is a complete Shape Up pitch package.

What has not yet happened: the betting and building phases. This analysis applies Shape Up to structure those.

---

## Step 1 — Frame: What Problem Are We Solving, and For Whom?

**Who:** Shop owner — sole consumer of the dashboard (owner-only session auth).
**Workflow:** Daily or pre-week operational triage: "Who needs attention? What is my financial exposure? Who did I communicate with recently?"
**Why now:** Two existing KPIs are factually wrong (USD formatter, appointment-count labelled as customers). Seven more features were blocked by undefined contracts; those contracts are now locked.

**Bounded problem:** The dashboard surface at `/app/dashboard` needs to become an honest, accurate operational monitoring surface. Not a reporting tool, not a notification center, not a booking creation surface.

---

## Step 2 — Bets: Translating the MoSCoW into Sprint Commitments

### Bet 1 — Correctness Sprint (Must Have fixes, appetite: ~1–2 days)

These are bugs in the currently-shipped dashboard. They require no product decisions, no new routes, and no schema changes. They must ship before any new feature work begins.

| Item | File | Change |
|---|---|---|
| Fix currency formatter | `summary-cards.tsx:4` | Replace hardcoded `currency: "USD"` with shop's currency from payment data |
| Fix deposits-at-risk query | `dashboard.ts:120-146` | Group by `payments.currency`; return currency-keyed totals, not a scalar |
| Fix high-risk label | `summary-cards.tsx:32` | Label stays `High-Risk Appointments` until Bet 2 ships the customer-level KPI |
| Remove notification bell | design only | Delete from design mock; no code change needed (bell never existed in `app-nav.tsx`) |
| Remove expiry sublabel | design only | `Expires in 48h` never shipped; remove from design spec |
| Add `serviceName` to query | `dashboard.ts:26-38` | Join `eventTypes.name` to satisfy the existing `DashboardAppointment.serviceName` type field |
| Add `customerId` to query | `dashboard.ts:26-38` | Required for Bet 2's distinct-customer count; correct type drift now |

**Circuit breaker:** If this bet cannot ship in ~1–2 days, something is wrong with scope. These are targeted column-level fixes and one label change — not feature work.

**Rabbit hole:** Currency-aware formatting. The fix is to group by `payments.currency` and return a map. The `SummaryCards` component must handle the "single currency" (format normally) vs "multiple currencies" (breakdown or neutral state) cases. The mixed-currency rendering must be defined before the component can be correctly implemented.

**No-go for Bet 1:** Do not redesign the card layout. Fix the data contract; keep the visual structure.

---

### Bet 2 — High-Risk Customers KPI (Should Have, appetite: ~0.5–1 day)

**What it is:** Replace the appointment-count backing of the high-risk summary card with a distinct-customer count, scoped to the selected attention window.

**Shaped solution:**
- `getDashboardData()` already filters `highRiskAppointments` from `allAppointmentsRaw`
- Add a `Set<string>` pass over `customerId` from that filtered set
- Return `highRiskCustomerCount: number` from `getDashboardData()`
- Pass it to `SummaryCards` as a dedicated prop (rename from `highRiskCount`)
- Update card label to `High-Risk Customers` with sublabel `In selected window`

**Prerequisite:** Bet 1 must ship first (specifically: `customerId` must be in the query select before this Set deduplication can work).

**Rabbit holes:**
- One customer with 3 booked appointments in window → count 1
- One customer with 1 appointment inside window, 1 outside → count 1 (only inside counts)
- Cancelled / pending appointments must not count (already filtered in the attention queue — inherit that filter)
- A `risk`-tier customer with no appointments in window must not count (the filter already requires a booked appointment in window)

**No-gos:**
- Do not count shop-wide risk-tier customers without upcoming appointments
- Do not make this card reflect a static shop-level risk population (that is already the tier distribution chart)

**Test coverage required:**
- Customer with 2 appointments in window → count 1
- Customer with appointment outside window → count 0
- Cancelled appointment in window → count 0
- Risk-tier customer with no appointments in window → count 0

---

### Bet 3 — Global Search Quick-Find (Should Have, appetite: ~2–3 days)

**What it is:** A new `GET /api/search?q=` route returning two entity groups (customers + appointments), navigating to existing detail routes on selection.

**Shaped solution:**
- One new authenticated route: `src/app/api/search/route.ts`
- Derives `shopId` from session (never from client)
- Runs two parallel queries: customer search (name/email/phone ILIKE) + appointment search (customer fields + service name, bounded to recent/upcoming window)
- Returns `{ customers: [], appointments: [] }`, max 5 each
- Client: search input in dashboard shell, popover/panel for results, navigate on selection

**Rabbit holes:**
- Phone number matching must normalize query to digits before ILIKE (phone numbers are stored normalized)
- Minimum length guards: 2 chars for text, 4 digits for phone — reject below these without a DB hit
- Result cap: 5 per group — prevents the route from becoming a reporting API
- Appointment window: `booked/pending/ended` + `endsAt >= now() - 7 days` — keeps results operationally relevant

**No-gos:**
- No fuzzy/typo-tolerant search in v1
- No cross-shop search
- No full appointment history (all-time)
- No service search as a standalone destination
- No `pg_trgm` or full-text engine in v1

**Schema change required:** None. No new tables. No new indexes required to ship v1 (monitor latency first; add trigram indexes only if real perf data justifies it).

---

### Bet 4 — Daily Log Tab (Should Have, appetite: ~2–3 days)

**What it is:** A read-only operational timeline tab on the dashboard, merging three sources into one reverse-chronological feed.

**Shaped solution:**
- Add `?view=log` query param to dashboard route (peer to existing `?view=quick`)
- New query: `getDashboardDailyLog(shopId, { limit: 50, days: 7 })`
- Three parallel fetches: `appointments.createdAt`, `appointment_events` (filtered to `cancelled` + `outcome_resolved`), `message_log`
- Map all to shared `DashboardDailyLogItem` shape
- Merge in memory, sort descending by `occurredAt`
- Group by calendar day in the UI
- Each row links out to `/app/appointments/[id]`

**Rabbit holes:**
- `appointment_events` is currently indexed by `appointmentId`, not by `shopId`. A dashboard-wide feed query needs `shop_id` in the WHERE clause. Add `appointment_events(shop_id, occurred_at desc)` index — this is the one schema-adjacent change Spike 2 flagged.
- The "appointment created" item is derived from `appointments.createdAt` (immutable), not from an event row. This is explicitly truthful — no pretending there's an event table backing it.
- `message_log.toPhone` is PII — do not render raw phone numbers in log item labels; use `customerName` instead.

**No-gos:**
- No unread/read state
- No payment lifecycle items (`payment_succeeded`, `payment_failed`)
- No slot recovery lifecycle items
- No customer confirmation-reply events
- No destructive row actions inside the log
- No historical pagination beyond 50 items / 7 days

**Schema change required:** One new index only: `appointment_events(shop_id, occurred_at desc)`. No new tables.

---

### Deferred — Could Have (no bet)

| Item | Why deferred |
|---|---|
| Trend delta | Requires `dashboard_metric_snapshots` table; hide delta until first snapshot exists |
| Deposit Retention Rate % | Requires zero-denominator guard; low priority vs correctness fixes |
| Server-backed pagination | Requires URL-backed query params across table; high complexity, low urgency at current scale |
| CSV export | Coupled to pagination; defer together |
| New Clients (30d) count | Valid but lowest priority; one new query, no schema change — pick up in a quiet sprint |

---

## Step 3 — Build: Vertical Slice First

Shape Up's building discipline: start with one small, complete, working slice before expanding.

**Recommended first slice:** Bet 1 (correctness) + Bet 2 (high-risk KPI).

Why this pair:
- Bet 1 fixes existing errors without adding new surface area
- Bet 2 reuses the fix from Bet 1 (`customerId` in query) to unlock the first new feature
- Together they produce a dashboard that is factually correct on all existing cards, with one improved KPI
- The dashboard can be shown to the owner at this point with full confidence in every visible number

Only after Bet 1 + Bet 2 are verified in production should Bets 3 and 4 begin.

**Hill chart position for Bet 1 + 2 at start:**
- `customerId` + `serviceName` join: uphill (known unknowns — mixed-currency rendering edge case)
- High-risk count deduplication: near the top of the hill (solution is clear: Set over customerId)
- Currency formatter: uphill (per-currency breakdown rendering is the unknown)

---

## Key Finding

The 7 spikes have done the Shape Up shaping work already. Every spike produced a pitch: a problem definition, an appetite signal, a solution approach, and a no-go list. The MoSCoW is the betting output. What remains is building — in 4 sequenced bets, starting with correctness (Bet 1) before any new feature (Bets 2, 3, 4). The circuit breaker: if any bet exceeds its appetite, cut scope to preserve the time constraint, not the feature list.
