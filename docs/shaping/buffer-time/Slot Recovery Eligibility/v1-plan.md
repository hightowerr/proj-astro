---
shaping: true
---

# V1 Plan: Buffer-Aware Eligibility Filter + Test

Slice: V1 (the only slice)
Shape: A
Files changed: 2

---

## Step 1 — Update imports in `src/lib/slot-recovery.ts`

**1a.** Add `inArray` and `lt` to the drizzle-orm import (currently used only inside the typed query builder callbacks; needed as standalone operators for the replacement `db.select` query).

Before:
```typescript
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
```

After:
```typescript
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
```

**1b.** Add `getBookingSettingsForShop` to the existing `queries/appointments` import.

Before:
```typescript
import { createAppointment } from "@/lib/queries/appointments";
```

After:
```typescript
import { createAppointment, getBookingSettingsForShop } from "@/lib/queries/appointments";
```

---

## Step 2 — Resolve slot effective buffer before the candidate loop

In `getEligibleCustomers`, directly after the `shopPolicy` fetch (line ~159) and before the `candidates` query, insert:

```typescript
// Resolve the slot's effective buffer using the same precedence as createAppointment:
// eventType.bufferMinutes → bookingSettings.defaultBufferMinutes → 0
let slotEffectiveBufferMinutes = 0;
if (slotOpening.eventTypeId) {
  const [et] = await db
    .select({ bufferMinutes: eventTypes.bufferMinutes })
    .from(eventTypes)
    .where(eq(eventTypes.id, slotOpening.eventTypeId))
    .limit(1);
  slotEffectiveBufferMinutes = et?.bufferMinutes ?? 0;
}
if (slotEffectiveBufferMinutes === 0) {
  const settings = await getBookingSettingsForShop(slotOpening.shopId);
  slotEffectiveBufferMinutes = settings?.defaultBufferMinutes ?? 0;
}
const slotBufferedEndsAt = new Date(
  slotOpening.endsAt.getTime() + slotEffectiveBufferMinutes * 60_000
);
```

---

## Step 3 — Replace the per-candidate overlap query

Replace the existing `db.query.appointments.findFirst` block (lines 224–233) with:

```typescript
const overlapping = await db
  .select({ id: appointments.id })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, slotOpening.shopId),
      eq(appointments.customerId, candidate.id),
      inArray(appointments.status, ["booked", "pending"]),
      lt(appointments.startsAt, slotBufferedEndsAt),
      sql`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${slotOpening.startsAt}`
    )
  )
  .limit(1);

if (overlapping.length > 0) {
```

The downstream `continue` and cooldown logic are unchanged — only the overlap detection itself changes.

---

## Step 4 — Add the buffer-overlap integration test

Append a new `it` block inside the existing `describeIf("getEligibleCustomers tier prioritization", ...)` block in `src/lib/__tests__/slot-recovery-tier-sorting.test.ts` (after line 473, before the closing `}`):

```typescript
it("excludes a customer whose existing appointment buffer overlaps the offered slot", async () => {
  const slotOpening = await db.query.slotOpenings.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.id, slotOpeningId),
  });

  if (!slotOpening) {
    throw new Error("Slot opening not found");
  }

  // candidateA: existing appt ends 5 min before the slot starts, but has a 10-min buffer.
  // Raw endsAt < slotOpening.startsAt → would pass the old check.
  // Buffered end (endsAt + 10 min) > slotOpening.startsAt → must fail the new check.
  const bufferConflictId = await seedCandidate({
    shopId,
    fullName: "Buffer Conflict Customer",
    phone: "+12025550191",
    email: `buffer-conflict-${randomUUID()}@example.com`,
  });
  await db.insert(appointments).values({
    shopId,
    customerId: bufferConflictId,
    startsAt: new Date(slotOpening.startsAt.getTime() - 65 * 60_000), // 65 min before slot
    endsAt: new Date(slotOpening.startsAt.getTime() - 5 * 60_000),   // 5 min before slot
    effectiveBufferAfterMinutes: 10,                                   // buffer spills 5 min into slot
    status: "booked",
  });

  // candidateB: no conflicting appointment — should still be included as contrast.
  const cleanId = await seedCandidate({
    shopId,
    fullName: "Clean Customer",
    phone: "+12025550192",
    email: `clean-${randomUUID()}@example.com`,
  });

  const eligible = await getEligibleCustomers(slotOpening);
  const ids = eligible.map((c) => c.id);

  expect(ids).not.toContain(bufferConflictId);
  expect(ids).toContain(cleanId);
});
```

---

## Self-verification

### 1. Type-check and lint
```bash
pnpm typecheck && pnpm lint
```
Both must pass clean. The drizzle-orm import change (Step 1) and the new query shape (Step 3) are the most likely sources of type errors.

### 2. Run the unit/integration test suite
```bash
pnpm test src/lib/__tests__/slot-recovery-tier-sorting.test.ts
```
Expected: all existing tests still pass + the new buffer-overlap test passes.

If `POSTGRES_URL` is not set, the integration tests are skipped via `describeIf` — the new test will also be skipped, which is fine for type-checking but not for functional verification. Confirm `POSTGRES_URL` is set before treating the run as a pass.

### 3. Confirm the old behaviour would have been a false negative

The test seeds an appointment that ends 5 minutes before the slot starts with a 10-minute buffer. Manually verify the arithmetic:
- `endsAt` = `slotOpening.startsAt − 5 min`
- `endsAt + 10 min` = `slotOpening.startsAt + 5 min` → overlaps
- Old query: `endsAt > slotOpening.startsAt` → `(T−5) > T` → **false** → customer passed (bug)
- New query: `endsAt + 10 min > slotOpening.startsAt` → `(T+5) > T` → **true** → customer blocked (fix)

### 4. Confirm existing tests are unaffected

The existing tests use `effectiveBufferAfterMinutes: 0` (default) on all seeded appointments, so the buffer term adds 0 ms and the overlap condition is identical to the old raw check. No regressions expected.

---

## Definition of done

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] All pre-existing tests in `slot-recovery-tier-sorting.test.ts` pass
- [ ] New buffer-overlap test passes with `POSTGRES_URL` set
- [ ] No changes outside the two named files
