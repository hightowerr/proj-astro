# Kicksnare Migration — Shape

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R0 | Dashboard unprotected-bookings count must include pre-migration records (where `depositSkipped IS NULL`) | current-issues.md (Kicksnare migration) |
| R1 | Appointments page unprotected-bookings count must include pre-migration records | current-issues.md |
| R2 | No schema changes, no backfill, no migration files | Decision in issue analysis |
| R3 | Zero overcounting risk — only pre-migration records match the fallback | Edge case verification |
| R4 | Self-expiring — fix becomes inert when merchant completes Connect | Design requirement |

## Shape A — Query Fallback (selected)

Add `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')` to the existing `depositSkipped = 'connect_not_complete'` WHERE clause in both dashboard and appointments page queries.

**Why this works**: Post-migration bookings with `depositSkipped IS NULL` always have `paymentStatus = "pending"` or `"paid"` (the `createAppointment()` code at `queries/appointments.ts:918-929` sets `depositSkipped` for every free-booking path). The combination `NULL + unpaid` is exclusively pre-migration records — zero overcounting risk.

**Why this is correct**: Spec 15 (`specs/15-guard-dashboard-warning.md:86-89`) explicitly specced this fallback: "If the `depositSkipped` signal isn't available, fall back to counting all appointments created while `stripeOnboardingStatus !== 'complete'`." The implementation uses a tighter condition (`paymentStatus = 'unpaid'` instead of checking `stripeOnboardingStatus`) which avoids the need for a shop-level join.

## Rejected shapes

| Shape | Why rejected |
|-------|-------------|
| B — Backfill (`UPDATE appointments SET depositSkipped = 'connect_not_complete' WHERE ...`) | Revisionist — modifies historical records, creates semantic debt, semi-irreversible |
| C — Do nothing (accept Tier 1 display) | Self-defeating — withholds the urgency signal that drives Connect completion |
| D — Count all unpaid bookings (no `depositSkipped` check) | Overcounts `policy_none` bookings (payment not required by policy, not by Connect status) |

## Fit check

| Req | Shape A |
|-----|---------|
| R0 | Yes — OR clause captures NULL + unpaid records |
| R1 | Yes — identical clause in both files |
| R2 | Yes — no schema/migration changes |
| R3 | Yes — verified: NULL + unpaid is exclusively pre-migration |
| R4 | Yes — Connect completion hides the entire card/banner |

## Spikes needed

None. All unknowns pre-resolved:
- `createAppointment()` always sets `depositSkipped` for free bookings (verified at `queries/appointments.ts:918-929`)
- `paymentStatus` exists on all appointment records (schema.ts)
- `isNull` is available from drizzle-orm
- Both queries use the same drizzle `and()/eq()` pattern — adding `or()` is mechanical

## Architecture mapping

- No conflicts with invariants 1-15
- Adds invariant 16 (pre-migration fallback pattern) — documented in `architecture-updates.md`

## Analysis source

Mental models report (Map Is Not the Territory, Path Dependence, False Trade-offs — all converge) at `mcp-go/Mental Models/WorkSpace/26-06-30_23-14-47_kicksnare_migration_depositskipped_signal/analysis_report.md`.
