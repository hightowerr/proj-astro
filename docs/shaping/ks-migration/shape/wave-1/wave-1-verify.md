# Wave 1 Verification Report — KS Migration Query Fallbacks

**Date:** 2026-07-07  
**Verifier:** fresh session, read-only  
**Files inspected:** `src/app/app/dashboard/page.tsx`, `src/app/app/appointments/page.tsx`, `src/lib/queries/appointments.ts`  
**`pnpm check` result:** PASS (zero lint or type errors)

---

## Results

| Spec | Criterion | Status | Evidence |
|------|-----------|--------|----------|
| 01 | `isNull` and `or` imported from drizzle-orm | PASS | `dashboard/page.tsx:3` — `import { and, eq, isNull, ne, or, sql } from "drizzle-orm";` |
| 01 | WHERE clause includes `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')` | PASS | `dashboard/page.tsx:77-83` — `or(eq(appointments.depositSkipped, "connect_not_complete"), and(isNull(appointments.depositSkipped), eq(appointments.paymentStatus, "unpaid")))` |
| 01 | Comment above `or()` explains the fallback | PASS | `dashboard/page.tsx:74-76` — 3-line comment: "Pre-migration fallback: depositSkipped IS NULL + paymentStatus = 'unpaid' captures bookings created before the column existed. Becomes inert once all pre-migration merchants complete Connect." |
| 01 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 01 | No schema changes, no migration files | PASS | Grep confirms `depositSkipped` referenced only in `page.tsx` files (changed), `schema.ts` (unchanged), and `queries/appointments.ts` (unchanged) |
| 02 | `isNull` and `or` imported from drizzle-orm | PASS | `appointments/page.tsx:2` — `import { and, eq, isNull, or, sql } from "drizzle-orm";` |
| 02 | WHERE clause includes `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')` | PASS | `appointments/page.tsx:126-132` — identical `or()` pattern to spec 01 |
| 02 | Comment above `or()` explains the fallback | PASS | `appointments/page.tsx:123-125` — same 3-line comment as dashboard |
| 02 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 02 | No schema changes, no migration files | PASS | Same as spec 01 — only `page.tsx` files changed |

---

## Edge Case Safety

### `createAppointment()` always sets `depositSkipped` for post-migration free bookings

Inspected `src/lib/queries/appointments.ts:918-929`. Three paths analysed:

| Path | `paymentsEnabled` | `paymentRequired` | `depositSkipped` | `paymentStatus` | NULL + unpaid? |
|------|------------------|------------------|-----------------|----------------|---------------|
| Connect not complete | `false` | — | `"connect_not_complete"` | `"unpaid"` | No — not NULL |
| Connect complete, policy-free | `true` | `false` | `"policy_none"` | `"unpaid"` | No — not NULL |
| Paid booking | `true` | `true` | `null` | `"pending"` | No — not unpaid |

The combination `depositSkipped IS NULL AND paymentStatus = 'unpaid'` cannot occur via any post-migration call path. The spec's safety argument is confirmed. **PASS.**

### Other `depositSkipped` queries that might need the same fallback

Grepped `src/` for all `depositSkipped` references. Only one other file uses it as a filter:

- `src/app/app/appointments/[id]/page.tsx:56` — selects `depositSkipped` as a column read, not a count/filter query. No fallback needed.
- `src/lib/schema.ts:645` — check constraint definition, not a query.
- Test fixtures use `depositSkipped: null` as mock data, not in live count queries.

**No other queries need the pre-migration fallback. PASS.**

---

## Summary

**10 / 10 criteria PASS. 0 FAIL. 0 BLOCKED.**

No fix issues created.

---

## Note

The open issue **"Kicksnare migration: pre-Connect appointments have no `depositSkipped` signal"** in `docs/context/current-issues.md` is now fully resolved by this wave. Both the dashboard count query and the appointments page count query have the fallback. The issue can be moved to the Resolved section.
