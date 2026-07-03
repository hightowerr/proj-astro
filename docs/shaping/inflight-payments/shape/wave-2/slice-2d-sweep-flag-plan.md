# Slice 2d: Suspension Sweep — Flag Recently-Succeeded Payments

**Spec**: 08 | **Priority**: P3 | **File**: `src/app/api/stripe/connect-webhook/route.ts`

## Work

### 1. Add flag logic after PI cancellation sweep (from slice 1c)
- **Where**: `account.updated` handler, after the cancellation logic added in Wave 1 (spec 07)
- **Trigger**: Same as spec 07 — `charges_enabled` transitions to false

### 2. Query recently-succeeded payments
- Find appointments for this shop where:
  - `paymentStatus === "paid"`
  - `updatedAt > (now - 1 hour)`
  - `transferHeld === false` (not already flagged)
  ```typescript
  const recentPaid = await tx.query.appointments.findMany({
    where: (table, { and, eq, gt }) => and(
      eq(table.shopId, shop.id),
      eq(table.paymentStatus, "paid"),
      eq(table.transferHeld, false),
      gt(table.updatedAt, new Date(Date.now() - 60 * 60 * 1000)),
    ),
  });
  ```

### 3. Batch update transferHeld
- For each matching appointment: update `transferHeld: true`
- Can use batch update (single query) if drizzle supports it, otherwise loop
- `console.warn` with shop ID and count of flagged payments

## Acceptance criteria
- [ ] Recently-paid appointments (1h window) flagged with `transferHeld: true`
- [ ] Only unflagged appointments touched (no double-update)
- [ ] Old payments (>1h) not affected
- [ ] Logging uses `console.warn`
- [ ] Co-located with spec 07 sweep in same handler (sequential: cancel pending, then flag recent)
- [ ] lint + type-check pass

## Dependencies
- **Requires**: Slice 1b (transferHeld column exists)
