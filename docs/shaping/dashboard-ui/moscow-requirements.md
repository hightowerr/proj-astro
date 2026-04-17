# Dashboard UI — MoSCoW Requirements

Date: 2026-04-14

Source: synthesised from `requirements-audit.md` and spikes 1–7.

---

## Must Have

These are backed by current code and essential for a functional operational dashboard.

1. **Attention Required queue** — time-windowed (24 / 72 / 168 / 336 h), scoped to `booked` appointments, with high-risk filter (tier `risk`, score `< 40`, or `voidedLast90Days >= 2`)
2. **Upcoming Appointments count** — live count of `booked` appointments with `startsAt` in the next 30 days; neutral sublabel only (e.g. `Next 30 days`); no trend delta
3. **Deposits at Risk amount** — sum of `payments.amountCents` for high-risk booked appointments in the selected window; must be currency-aware (per-currency total, not a hardcoded USD sum)
4. **Tier distribution chart** — Top / Neutral / Risk counts and percentages from `customers` + `customerScores`
5. **Total Clients count** — sum of all tier buckets; no schema change needed
6. **All Upcoming Appointments table** — shop-scoped, next 30 days, with tier filter and sort by time / score / tier; client-side filter is acceptable at current scale
7. **Service name on appointment rows** — resolved via `eventTypeId → eventTypes.name`; no schema change
8. **Operational row actions** — View, Contact, Remind, Confirm (sends confirmation request), Cancel (routes to manage link); owner-auth enforced on all actions
9. **Owner-scoped authentication** — all dashboard data derived from session → shop; no client-supplied `shopId`

---

## Should Have

Clearly valuable, feasible with modest work, and defined well enough to implement without a follow-up spike.

10. **New Clients (30d) count** — count of `customers.createdAt` within 30 days; requires only a new query, no schema change
11. **High-Risk Customers KPI** — distinct-customer count (dedupe by `customerId`) with at least one booked high-risk appointment inside the selected attention window; must follow the window selector; label must not be backed by raw appointment count
12. **Global search as quick-find navigator** — `GET /api/search?q=`, two groups (customers + appointments), deterministic partial matching, results navigate to existing detail routes; no schema change or full-text engine in v1; shop derived from session
13. **Daily Log tab** — passive read-only operational timeline; merge `appointments.createdAt` (synthetic item), emitted `appointment_events` (`cancelled`, `outcome_resolved`), and `message_log`; default last 7 days / max 50 items; grouped by calendar day, link-out to appointment detail

---

## Could Have

Valid concepts, but the implementation path either requires new backend infrastructure or a product decision that has not been locked.

14. **Upcoming Appointments trend delta** — only truthful as a daily metric snapshot (`dashboard_metric_snapshots` table per shop per local day); hide if no prior snapshot exists; do not ship a delta backed by mutable row state
15. **Deposit Retention Rate percentage** — narrow cash metric only: `retained ÷ (retained + refunded)`, derived from current monthly money query; labels must stay `Retained` / `Refunded`; requires zero-denominator guard
16. **Server-backed pagination on the appointments table** — extend `getAllUpcomingAppointments()` with `page`, fixed `pageSize`, `totalCount`; URL-backed state (`period`, `tier`, `sort`, `direction`, `page`); client-only pagination must not ship as an interim
17. **Filtered CSV export** — owner-authenticated endpoint, exports full filtered result set (not just visible page), sanitizes formula injection prefixes, explicit timezone handling; excludes `bookingUrl` and action columns

---

## Won't Have (now)

Either not feasible without new product workflows, or explicitly deferred because shipping them would be misleading.

18. **Internal "New Appointment" creation from dashboard** — no owner-side booking flow exists; current creation path is the public customer self-service booking journey; simplify to "Open booking page" or "Copy booking link" instead
19. **In-app notification bell / notification center** — no user-scoped notification model, no unread/read state; existing `appointment_events` and `message_log` are operational records, not a notification system
20. **Combined Monthly Retention % with `Recovered / Refunded` breakdown** — cannot be backed truthfully without a new retention-case model that links financial outcomes to slot recovery; `recovered` already means slot recovery in this codebase, not a retained payment
21. **Payment lifecycle events in Daily Log** (`payment_succeeded` / `payment_failed`) — Stripe webhook mutates state without writing `appointment_events` rows; `payments.updatedAt` is mutable and not a reliable timeline source
22. **Slot recovery lifecycle in Daily Log** (offer sent / accepted / expired) — no append-only event stream; offer state is current-state only; transitions can reverse on payment failure
23. **Customer confirmation-reply events in Daily Log** — `processConfirmationReply()` updates status in place; no append-only record of when confirmation occurred
24. **Trend delta on the Upcoming Appointments card (v1)** — current model cannot reconstruct historical future-load baselines; ship count-only card until snapshots exist
25. **Fuzzy / semantic / cross-shop search** — out of scope for v1 search; deterministic partial matching is sufficient at current per-shop dataset size
