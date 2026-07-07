# Kicksnare Migration — Architecture Updates Needed

Record these in `docs/context/` after the feature loop closes (not before).

## Updates to `docs/context/architecture-context.md`

### Section 10 (Invariants) — add new invariant

Add after invariant 15:

> **16. Pre-migration `depositSkipped` fallback** — Queries counting unprotected bookings must use `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')` alongside `depositSkipped = 'connect_not_complete'`. The fallback captures pre-migration records created before the `depositSkipped` column existed. Self-expiring: becomes inert when all pre-migration merchants complete Connect. `dashboard/page.tsx`, `appointments/page.tsx`.

### Section 7 (Key Flows) — no changes

The booking creation flow already documents the `depositSkipped` signal. The fallback is a read-path concern, not a write-path concern.

## Updates to `docs/context/progress-tracker.md`

Add to Completed section:

> - **Kicksnare Migration** — 2 specs, 1 wave. Query fallback for pre-migration `depositSkipped = null` records. Dashboard shows correct Tier 2 amber card; appointments page shows correct unprotected count. No schema changes, no backfill. Self-expiring when Kicksnare completes Connect. Loop COMPLETE.

## Updates to `docs/context/current-issues.md`

Move the "Kicksnare migration: pre-Connect appointments have no `depositSkipped` signal" item from **Open > Critical** to **Resolved** with:

> - **Kicksnare migration: pre-Connect appointments have no `depositSkipped` signal** — **RESOLVED [date].** Query fallback approach: `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')` added to both `dashboard/page.tsx` and `appointments/page.tsx`. No schema changes, no backfill. Self-expiring when Kicksnare completes Connect. **Loop artifacts**: `docs/shaping/ks-migration/`.
