# Wave 1 Plan — Query Fallbacks

## Slice 1: Dashboard query fallback (spec 01)

**File:** `src/app/app/dashboard/page.tsx`

### Steps

1. Add `isNull` and `or` to the drizzle-orm import (line 2)
2. Replace the WHERE clause in the `unprotectedCountResult` query (lines 71-76):
   - Move `eq(appointments.status, "booked")` before the deposit condition
   - Wrap the deposit condition in `or()`:
     - `eq(appointments.depositSkipped, "connect_not_complete")` (existing)
     - `and(isNull(appointments.depositSkipped), eq(appointments.paymentStatus, "unpaid"))` (new)
3. Add comment above the `or()`: "Pre-migration fallback: depositSkipped IS NULL + paymentStatus = 'unpaid' captures bookings created before the column existed. Becomes inert once all pre-migration merchants complete Connect."

### Acceptance criteria

- [ ] `isNull` and `or` imported from drizzle-orm
- [ ] WHERE clause includes `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')`
- [ ] Comment explains the fallback
- [ ] `pnpm check` passes

---

## Slice 2: Appointments query fallback (spec 02)

**File:** `src/app/app/appointments/page.tsx`

### Steps

1. Add `isNull` and `or` to the drizzle-orm import
2. Replace the WHERE clause in the `unprotectedResult` query (lines 119-124):
   - Same pattern as slice 1
3. Add the same comment

### Acceptance criteria

- [ ] `isNull` and `or` imported from drizzle-orm
- [ ] WHERE clause includes `OR (depositSkipped IS NULL AND paymentStatus = 'unpaid')`
- [ ] Comment explains the fallback
- [ ] `pnpm check` passes
