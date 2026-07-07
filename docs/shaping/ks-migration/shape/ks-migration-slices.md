# Kicksnare Migration — Slices

## Wave 1 (the only wave) — Query Fallbacks

Both slices are **fully independent** — different files, identical pattern, zero shared state. Can run in parallel.

| Slice | Spec | File | Change |
|-------|------|------|--------|
| 1 | 01 | `src/app/app/dashboard/page.tsx` | Add `or(eq(depositSkipped, "connect_not_complete"), and(isNull(depositSkipped), eq(paymentStatus, "unpaid")))` to unprotected count query. Import `isNull`, `or` from drizzle-orm. |
| 2 | 02 | `src/app/app/appointments/page.tsx` | Identical change to the appointments unprotected count query. |

## Critical path

```
Spec 01 (or 02)
```

Length: **1 step**. Both specs are leaves. The entire feature is a single wave.

## Implementation notes

- Single agent is sufficient (2 files, ~8 lines each, no file contention)
- No worktrees needed — sequential edits to different files
- `pnpm check` after both slices (no intermediate checkpoint needed — changes are atomic per file)
