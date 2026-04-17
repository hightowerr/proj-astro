# Questionnaire — Dashboard UI: Post-Clarification Implementation Scope

## Purpose
This analysis runs after all 7 clarifying questions from the problem statement have been answered through spikes 1–7 and the MoSCoW requirements document. The questions below orient the analysis toward the new phase: implementation planning.

---

**Q1. What is the full answer to each of the 7 clarifying questions?**

| # | Question | Answer (source) |
|---|----------|-----------------|
| Q1 (B1) | Which features are hard requirements for v1? | **Must Have (9):** attention queue, upcoming count, deposits at risk (currency-aware), tier distribution, total clients, all appointments table, service names, row actions, owner auth. **Should Have (4):** high-risk customers KPI, global search, daily log tab, new clients count. **Could Have (deferred):** trend delta, deposit retention rate %, server pagination, CSV export. **Won't Have:** notification bell, internal new-appointment, combined monthly retention %, payment/slot/confirmation-reply events in daily log, fuzzy search. *(MoSCoW)* |
| Q2 (B4) | Customers or appointments for high-risk card? | **Distinct customers** — dedupe by `customerId`, scoped to selected attention window, `booked` status only. Label: `High-Risk Customers`. *(Spike 4)* |
| Q3 (B3) | Multi-currency display rule? | **Payment-led, currency-aware.** Single total if one currency; per-currency breakdown (or neutral "Multiple currencies") if mixed. No hardcoded USD. No `Expires in 48h` expiry line. *(Spike 5)* |
| Q4 (B2) | Is the notification bell in scope? | **No.** Removed from design. No notification model, no unread state. *(Won't Have #19)* |
| Q5 (B5) | Which event types in daily log at launch? | **Three sources:** `appointments.createdAt` (synthetic "created" item), `appointment_events` (`cancelled`, `outcome_resolved` only — the two currently emitted), `message_log` (all channel/purpose combos). **Excluded:** payment lifecycle, slot recovery lifecycle, confirmation-reply events. Last 7 days / max 50 items / grouped by calendar day. *(Spike 2)* |
| Q6 (B6) | Which expiry clock? | **None for v1.** No single truthful clock applies to the deposits-at-risk aggregate. Remove `Expires in 48h`. Future path requires choosing cutoff-based OR confirmation-deadline-based exposure, each with a separate query shape. *(Spike 5)* |
| Q7 (B7) | Search: filter tables or navigate? | **Quick-find navigator.** `GET /api/search?q=`. Two groups: customers + appointments. Deterministic partial match (ILIKE). Results navigate to existing detail routes. No schema change. No fuzzy search in v1. *(Spike 1)* |

---

**Q2. What type of problem has this now become?**

**A2:** The problem has shifted phases. It was a *product definition problem* (knowledge gaps blocking implementation). It is now an *implementation sequencing problem* — all clarifying questions are answered, all barriers are resolved, and the work is to translate those answers into a correctly sequenced, correctly bounded implementation.

---

**Q3. Are there any new ambiguities or risks introduced by the answers?**

**A3 (identified for analysis):**

1. **`DashboardAppointment` type drift** — `src/types/dashboard.ts` declares `customerId` and `serviceName` fields that are not selected by the current query. Spike 4 requires `customerId` to compute distinct-customer count; Spike 7 mentioned service names. The type and the query need to be brought into alignment before the high-risk customer KPI can be implemented.

2. **Currency-aware formatting boundary** — Spike 5 says "per-currency breakdown if mixed." The current dashboard query groups no data by currency. The query contract for `getDepositsAtRisk` must change, and the `SummaryCards` component's formatter must handle multiple currencies without assuming a single total.

3. **Daily log query requires a new `shopId`-scoped index on `appointment_events`** — Spike 2 explicitly calls this out (`appointment_events(shop_id, occurred_at desc)`). Without it, the dashboard-wide feed query will be a full-table scan per appointment's shop ID.

4. **Search route is net-new** — `GET /api/search` does not exist. The search bar is a client component; it will require a server route, not just a query function. The route must derive `shopId` from session (not client).

5. **MoSCoW Should Have items (search, daily log, high-risk customers KPI) are in the "consider" zone** — They are not Must Have. If the sprint appetite is tight, all three can be deferred. But if any one of them ships, the others should be assessed for dependency (e.g., does shipping search require the service-name join that also helps the daily log?).

---

*Note: All answers sourced from spike documents 1–7 and `docs/shaping/dashboard-ui/moscow-requirements.md`.*
