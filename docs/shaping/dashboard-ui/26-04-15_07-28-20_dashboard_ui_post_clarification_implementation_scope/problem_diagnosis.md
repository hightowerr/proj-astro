# Problem Diagnosis

## Problem Statement

All 7 clarifying questions from the dashboard problem statement have now been answered through 7 spike investigations and a MoSCoW requirements document. The implementation blockage caused by undefined product contracts has been resolved. The new problem is: **how to translate those answers into a correctly sequenced, correctly bounded implementation** without introducing new errors, new scope creep, or new metric trust failures.

## Core Tension (shifted)

Previously: design ahead of data contracts → undefined features blocked implementation.
Now: resolved contracts → multiple interdependent implementation tracks must be sequenced correctly.

The risk is no longer "building the wrong thing" — it is:
1. **Building in the wrong order** (e.g., shipping the search UI before the route, or shipping the high-risk label before fixing the query)
2. **Shipping a partial feature** that looks complete but is missing a correctness condition (e.g., currency-aware formatting without the mixed-currency guard)
3. **Leaving existing errors in production** while focusing on new features (the USD hardcode and label mismatch are confirmed wrong and are already live)

## Resolved Answers Summary

| Barrier | Was | Now |
|---------|-----|-----|
| B1 — undefined feature scope | 7 features undefined | Fully classified: Must/Should/Could/Won't Have |
| B2 — notification bell | No product workflow | Won't Have. Removed from design |
| B3 — hardcoded USD | No currency contract | Payment-led, currency-aware, mixed-currency guard required |
| B4 — label/metric mismatch | Appointment count vs customer label | Distinct customers by `customerId`, attention-window scoped |
| B5 — no unified event model | No shared activity contract | Three source merge: `appointments.createdAt` + 2 `appointment_events` types + `message_log` |
| B6 — no expiry clock | Three clocks, none universal | No expiry line in v1; future requires explicit exposure model choice |
| B7 — no search | No route or contract | Quick-find navigator, `GET /api/search`, deterministic ILIKE, 2 entity groups |

## New Problem Dimensions

| # | Dimension | Description |
|---|-----------|-------------|
| 1 | Type drift | `DashboardAppointment.customerId` and `.serviceName` declared in `src/types/dashboard.ts` but not selected in `dashboard.ts` queries — must fix before high-risk KPI implementation |
| 2 | Query scope expansion | Currency-aware deposits-at-risk requires grouping by `payments.currency`, not a scalar sum |
| 3 | Index gap | Daily log feed requires `appointment_events(shop_id, occurred_at desc)` index; current index is appointment-scoped only |
| 4 | Net-new route | Search requires a new authenticated API route; the client component cannot call a query function directly |
| 5 | Sequencing risk | Existing production errors (USD formatter, label) must be fixed before new features add new surface area over them |

## Problem Name

`dashboard_ui_post_clarification_implementation_scope`
