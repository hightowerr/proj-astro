# Slice 3 — Add DB upper-bound constraint

**Spec**: 05
**Wave**: 1 (safety net)
**Effort**: Small

## Changes

### 1. Schema file

`src/lib/schema.ts` — add `check()` to the `eventTypes` table's constraint array (after the existing `event_types_duration_minutes_positive` check):

```ts
check(
  "event_types_duration_minutes_max",
  sql`${table.durationMinutes} <= 480`
),
```

### 2. Generate migration

Run `pnpm drizzle-kit generate` to produce a migration file. The generated SQL should contain:

```sql
ALTER TABLE event_types
  ADD CONSTRAINT event_types_duration_minutes_max
  CHECK (duration_minutes <= 480);
```

### Pre-migration safety check

Before applying, verify no existing rows violate:

```sql
SELECT id, shop_id, name, duration_minutes
FROM event_types
WHERE duration_minutes > 480;
```

Current app-level max is 240, so this should return 0 rows.

## Files to modify

| File | Change |
|------|--------|
| `src/lib/schema.ts` | Add `check()` constraint to `eventTypes` table |
| `drizzle/XXXX_*.sql` | Generated migration (check latest number in `drizzle/` and increment) |

## Acceptance criteria

1. Migration applies cleanly
2. `INSERT INTO event_types (..., duration_minutes) VALUES (..., 481)` is rejected by the DB
3. `INSERT INTO event_types (..., duration_minutes) VALUES (..., 480)` succeeds
4. Existing rows are unaffected
5. Schema file matches the migration
6. `pnpm check` clean

## Dependencies

- Slice 1 (MAX raised to 480 — DB constraint must match app constant)
