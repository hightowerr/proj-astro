# Problem Diagnosis
**Job:** Appointments Page Implementation Analysis
**Date:** 2026-04-22
**Route:** `/app/appointments`

---

## Problem Statement

The Appointments page at `/app/appointments` already exists and is functional. The implementation problem is not "build from scratch" — it is a **quality and completeness gap** between the current implementation and the stated specification. The page must serve as the full transaction record and slot recovery log, combining historical and live data, with clear visual hierarchy between two conceptually distinct tables.

## Confirmed Existence vs. Gap Map

| Spec Requirement | Status | Gap Type |
|---|---|---|
| 3 outcome cards (Settled/Voided/Unresolved, last 7d) | ✅ Exists | None |
| Conflict alert banner (conditional) | ✅ Exists | None |
| Appointments table — time, customer, service | ✅ Exists | None |
| Appointments table — payment status & amount | ✅ Exists | None |
| Appointments table — financial outcome | ⚠️ Partial | No badge hierarchy — plain capitalized text |
| Appointments table — no-show risk badge | ✅ Exists | None (`NoShowRiskBadge` component) |
| Appointments table — resolved/created dates | ✅ Exists | None |
| Appointments table — "View" link | ✅ Exists | None |
| Slot Recovery table — time, status, recovery link | ✅ Exists | None |
| Slot Recovery table — link to recovered booking | ✅ Exists | None |
| Visual separation between two tables | ⚠️ Partial | No section header for appointments table; only `<section>` wrapper for slot recovery |
| Empty states (designed) | ⚠️ Partial | Exists but plain text (`<p>` tags only) |
| Outcome badge hierarchy | ❌ Missing | `financialOutcome` and `paymentStatus` are unstyled text |
| Design system compliance (no-line rule) | ❌ Missing | 1px solid borders used on cards, table wrapper, and row dividers — violates DESIGN.md |

## Root Cause

The implementation was built for function, not for the design specification. The structural scaffolding is correct. The data layer is complete. The gaps are entirely in the **visual/presentation layer**:

1. **Badge hierarchy is absent** — the spec explicitly calls out "outcome badge hierarchy" as a designer focus. Currently `financialOutcome` renders as `<span className="capitalize">settled</span>` with zero visual differentiation between outcomes of different severity.

2. **Design system violations** — DESIGN.md mandates the "No-Line Rule": *"Standard 1px solid borders are strictly prohibited for sectioning. Boundaries are created through background shifts."* The current page uses `border: "1px solid var(--color-border-default)"` on every card and table wrapper, and `borderTop: "1px solid var(--color-border-hairline)"` on every table row.

3. **Empty states are unstyled** — the spec calls out "empty states for each section" as a designer focus. Current empty states are bare `<p>` tags.

4. **No structural header for Appointments section** — the Slot Recovery section has an `<h2>` + description. The Appointments table has no equivalent section header, making the page feel like the table just appears raw after the stat cards.

## What Is NOT a Gap

- The data queries (`listAppointmentsForShop`, `listSlotOpeningsForShop`, `getOutcomeSummaryForShop`) are correctly structured and sufficient.
- The `NoShowRiskBadge` and `SlotStatusBadge` components are correct and need no changes.
- The `ConflictAlertBanner` integration is correct.
- The `ReconcilePaymentsButton` in the header is an existing decision and should remain.
- Excluding `cancelled` status from the appointments table is intentional — cancelled appointments that generated a slot opening appear in the Slot Recovery table. This is correct domain modeling.
