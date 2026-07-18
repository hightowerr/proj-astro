# Spec 05 — Add DB upper-bound constraint on durationMinutes

**Priority**: P2 (defense-in-depth — safety net, not a functional change)
**Type**: Database migration
**Risk**: Low — must verify no existing rows exceed 480

## Change

Create migration file `drizzle/XXXX_duration_max_constraint.sql`:

```sql
ALTER TABLE event_types
  ADD CONSTRAINT event_types_duration_minutes_max
  CHECK (duration_minutes <= 480);
```

### Pre-migration check

Before applying, verify no rows violate:

```sql
SELECT id, shop_id, name, duration_minutes
FROM event_types
WHERE duration_minutes > 480;
```

Current app-level max is 240, so this query should return 0 rows.

### Schema file update

`src/lib/schema.ts` — add a check constraint to the `eventTypes` table definition (after line 356):

```ts
check(
  "event_types_duration_minutes_max",
  sql`${table.durationMinutes} <= 480`
),
```

## Dependencies

- Spec 01 (MAX raised to 480) — the DB constraint must match the app constant. If this ships before Spec 01, the constraint is still valid (240 < 480), but they should use the same ceiling value.

## Acceptance Criteria

1. Migration applies cleanly.
2. `INSERT INTO event_types (..., duration_minutes) VALUES (..., 481)` is rejected by the DB.
3. `INSERT INTO event_types (..., duration_minutes) VALUES (..., 480)` succeeds.
4. Existing rows are unaffected.
5. Schema file matches the migration.
6. `pnpm check` clean.
