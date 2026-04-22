# Analysis Report — Dashboard UI: Post-Clarification Implementation Scope

**Problem:** All 7 clarifying questions are now answered. Translate resolved contracts into a correctly sequenced, correctly bounded implementation.
**Date:** 2026-04-15
**Models Applied:** Shape Up · Necessity and Sufficiency · Iterative Refinement (Porpoising)
**Job folder:** `26-04-15_07-28-20_dashboard_ui_post_clarification_implementation_scope`
**Prior analyses:** `26-04-14_13-44-14`, `26-04-15_06-42-16`
**Sources:** Spikes 1–7, `moscow-requirements.md`, `problem-statement.md`, live codebase verification

---

## What the 7 Answers Resolved

| Question | Answer |
|---|---|
| Q1: Which features are v1? | 9 Must Have (all defined) + 4 Should Have (search, daily log, high-risk KPI, new clients) + 8 deferred |
| Q2: Customers or appointments on high-risk card? | Distinct customers, `customerId` dedupe, attention-window scoped, `booked` only |
| Q3: Currency rule for deposits? | Payment-led, currency-aware; per-currency breakdown if mixed; no expiry line |
| Q4: Notification bell? | Removed. Won't Have. No notification model exists. |
| Q5: Daily log event types? | 3 sources: `appointments.createdAt` + `appointment_events` (`cancelled` + `outcome_resolved`) + `message_log`. Last 7d / 50 items. |
| Q6: Expiry clock? | None in v1. `Expires in 48h` removed from design. |
| Q7: Search UX? | Quick-find navigator. `GET /api/search`. 2 entity groups. ILIKE partial match. Navigate on select. |

---

## Executive Summary

Three mental models applied to the post-clarification state converge on a clear implementation structure.

**Shape Up** converts the 7 spike documents (which ARE the shaping output) into 4 sequenced bets with explicit appetites, rabbit holes, and no-go lists. The first bet is a correctness sprint fixing existing live errors before any new feature is added.

**Necessity and Sufficiency** maps the gap between "feature visually exists" and "feature is factually correct" for each of the 4 deliverables. The dashboard has already shipped features that satisfied necessary but not sufficient conditions (deposits-at-risk card: number exists ✓, correct currency ✗). The sufficient condition lists are the new definitions of done.

**Iterative Refinement (Porpoising)** shows that the full problem-statement → spikes → implementation journey is a 5-dive cycle. The team is entering Dive 4. The discipline: surface between Bet 1+2 and Bet 3+4 — do not run all 4 bets to completion before validating the first two.

**Overall finding:** The implementation is now unblocked and well-specified. The primary risk is not "building the wrong thing" — that has been resolved. The primary risk is now building in the wrong order (new features on top of unfixed bugs) or declaring features done at the necessary-condition level before sufficient conditions are verified.

---

## The 4 Bets

### Bet 1 — Correctness Sprint
**Appetite:** ~1–2 days  
**Prerequisite:** None  
**Must ship before any other bet**

These are live errors in the currently-shipped dashboard. They require no product decisions, no new routes, no schema changes.

| Fix | File | Change |
|---|---|---|
| Currency-aware deposits query | `dashboard.ts:120-146` | Group by `payments.currency`; return currency-keyed map |
| Currency-aware formatter | `summary-cards.tsx:4` | Use currency from payment data; handle single vs multi-currency rendering |
| Add `customerId` to query select | `dashboard.ts:26-38` | Resolves type drift; prerequisite for Bet 2 |
| Add `serviceName` join to query | `dashboard.ts:26-38` | Join `eventTypes.name` via `appointments.eventTypeId`; resolves type drift |
| Label fix (temporary) | `summary-cards.tsx:32` | Keep `High-Risk Appointments` until Bet 2 ships the customer-level KPI |

**Rabbit hole:** Mixed-currency rendering. Single total when one currency; per-currency breakdown or "Multiple currencies" neutral state when more than one. The component must handle both cases correctly — this is a sufficient condition for the deposits card, not a cosmetic choice.

**No-gos:** Do not redesign card layout. Do not change the attention queue. Do not touch Bet 2 logic until Bet 1 is verified.

---

### Bet 2 — High-Risk Customers KPI
**Appetite:** ~0.5–1 day  
**Prerequisite:** Bet 1 (needs `customerId` in query)

A Set-based deduplication pass over the already-filtered `highRiskAppointments` array inside `getDashboardData()`. No new query. No schema change.

**Sufficient condition set:**
- [ ] `getDashboardData()` returns `highRiskCustomerCount: number` (distinct `customerId` count)
- [ ] `SummaryCards` receives `highRiskCustomerCount` as a dedicated prop (not reusing appointment length)
- [ ] Card label reads `High-Risk Customers`
- [ ] Card sublabel reads `In selected window`
- [ ] Count changes when period selector changes
- [ ] Customer with 2 appointments in window → count 1
- [ ] Cancelled/pending appointments → not counted
- [ ] Risk-tier customer with no appointment in window → not counted

**Test cases required:**
- 1 customer × 3 appointments in window → count = 1
- 1 customer × 1 in-window + 1 out-of-window → count = 1
- Cancelled appointment in window → count = 0
- Risk-tier customer, 0 upcoming bookings → count = 0

---

### Bet 3 — Global Search Quick-Find
**Appetite:** ~2–3 days  
**Prerequisite:** Bet 1 complete (specifically: `serviceName` join confirmed working)

New authenticated API route `GET /api/search?q=`. Client search UI in dashboard shell.

**Sufficient condition set:**
- [ ] Route authenticated; `shopId` derived from session, never from client
- [ ] Customer search: `fullName`, `email`, `phone` — case-insensitive partial match
- [ ] Phone: normalize query digits, suffix-match against stored normalized phone
- [ ] Appointment search: customer fields + `eventTypes.name`, bounded window (`endsAt >= now() - 7 days`, `status IN ('pending','booked','ended')`)
- [ ] Minimum guard: reject text < 2 chars, phone < 4 digits without DB call
- [ ] Max 5 results per group
- [ ] Navigate-on-select to `/app/customers/[id]` or `/app/appointments/[id]`
- [ ] Empty state handled; no error on zero results
- [ ] 401 on unauthenticated request

**No-gos:** No fuzzy match. No cross-shop search. No full history. No service destination. No `pg_trgm` in v1.

---

### Bet 4 — Daily Log Tab
**Appetite:** ~2–3 days  
**Prerequisite:** Bet 1 complete; migration for `appointment_events` index required

New `?view=log` query param on dashboard route. New `getDashboardDailyLog(shopId, { limit: 50, days: 7 })` query.

**Sufficient condition set:**
- [ ] Tab switch via `?view=log` / `?view=quick` query params
- [ ] Three sources merged: `appointments.createdAt`, `appointment_events (cancelled + outcome_resolved)`, `message_log`
- [ ] No payment lifecycle items rendered (even though enum supports them)
- [ ] No slot recovery items
- [ ] No confirmation-reply items
- [ ] Last 7 days / max 50 items
- [ ] Sorted descending by `occurredAt`
- [ ] Grouped by calendar day in UI
- [ ] Each item with `appointmentId` links to `/app/appointments/[id]`
- [ ] No raw phone numbers in labels — use customer name
- [ ] No unread/read state, no row-level actions
- [ ] New index `appointment_events(shop_id, occurred_at desc)` applied via migration

**Schema change:** One index only. No new tables.

---

## Deferred Items

| Item | Why | When |
|---|---|---|
| Trend delta | Needs `dashboard_metric_snapshots` table; hide until snapshots exist | After snapshot infrastructure is built |
| Deposit Retention Rate % | Valid but low urgency; zero-denominator guard needed | Quiet sprint after correctness verified |
| New Clients (30d) | One new query; no schema change | Same quiet sprint |
| Server-backed pagination | High complexity; not needed at current scale | When table size justifies it |
| CSV export | Coupled to pagination; defer together | Same as pagination |

---

## The Sequencing Rule

**Fix before build. Verify before expand.**

```
Bet 1 (correctness) ──► SURFACE: verify currency + type fixes ──► Bet 2 (high-risk KPI)
                                                                         │
                                                                         ▼
                                                               SURFACE: verify KPI ──► Bets 3+4
```

The temptation is to start Bet 3 while Bet 1 is in review. The risk: Bet 3's search UI uses the service name that Bet 1's query join provides. Starting Bet 3 before Bet 1's `serviceName` join is confirmed creates integration conflicts. Hold the sequence.

---

## Sufficient Condition Summary

The prior analysis (Goodhart's Law) established that dashboard metrics become management targets the moment they appear on the surface — correct or not. The sufficient condition lists above are the new definitions of done. A feature is not done when it renders; it is done when every item on its sufficient condition list is met and verified.

**Red flag for code review:** Any PR that changes a card label without also changing the backing query, or any PR that adds a new metric without a test case for the most dangerous edge case, is satisfying necessary conditions only.

---

## What the Porpoising Cycle Looks Like From Here

```
[Dive 3 complete] ──► Design mock → problem statement → 7 spikes → MoSCoW → resolved
[Dive 4] ──► Bet 1 + Bet 2 implementation
[Surface 1] ──► Correctness verified in review environment
               Questions: currency rendering correct? Type errors resolved? KPI count deduplicated?
[Dive 5] ──► Bet 3 (search) + Bet 4 (daily log)
[Surface 2] ──► Both features end-to-end working
               Questions: search 401 enforced? Daily log exclusions holding? Index applied?
[Dive 6] ──► Could Have items (deposit retention rate, new clients count) — if appetite remains
[Surface 3] ──► Sprint retrospective
               Output: refined problem statement for the NEXT design iteration
               (applies the Contract Before Design gate to prevent recurrence)
```

Surface 3 is where the full cycle closes. The output is not just a shipped dashboard — it is a refined process that gates the next design iteration on data contracts being complete before visual design begins. That process change is the highest-leverage outcome of the full 3-analysis cycle.

---

## Three Net-New Findings from This Analysis

**1. The spikes are already the Shape Up shaping output.** Each spike produced a pitch: problem definition, appetite signal, solution approach, no-go list. The team does not need to do more shaping — they need to bet and build.

**2. Necessary condition ≠ done.** Every feature has a sufficient condition set that must be explicitly verified. The dashboard has already shipped two features with necessary conditions met but sufficient conditions violated. The sufficient condition lists in this report are the new definitions of done for all 4 bets.

**3. The porpoising discipline applies inside implementation, not just at design time.** Surface between Bet 1+2 and Bet 3+4. Do not run all 4 bets to completion before checking. The original error (design-before-contract) can recur at the implementation level as implementation-before-validation.

---

*Analysis complete. Models applied: Shape Up · Necessity and Sufficiency · Iterative Refinement (Porpoising).*
*Sources: `docs/shaping/dashboard-ui/spike-1` through `spike-7`, `moscow-requirements.md`, `problem-statement.md`*
*Codebase: `src/lib/queries/dashboard.ts`, `src/components/dashboard/summary-cards.tsx`, `src/app/app/dashboard/page.tsx`, `src/types/dashboard.ts`*
