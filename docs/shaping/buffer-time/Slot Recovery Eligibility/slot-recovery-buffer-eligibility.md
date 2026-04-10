---
shaping: true
---

# Slot Recovery Eligibility — Buffer-Aware Overlap Check

## Source

> `getEligibleCustomers()` checks overlap using raw appointment windows in `src/lib/slot-recovery.ts`.
> It does not expand existing appointments by `effectiveBufferAfterMinutes`.
> It also does not consider the recovered slot's own buffer implications.
>
> Customers can receive offers for slots they cannot actually accept.
> The final booking attempt is then rejected by the stricter `createAppointment()` guard,
> wasting offer inventory and producing a bad customer experience.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Customers sent slot recovery offers must be eligible to actually book the offered slot | Core goal |
| R1 | Existing appointments must block through `endsAt + effectiveBufferAfterMinutes`, not raw `endsAt` | Must-have |
| R2 | The offered slot must block through its own effective buffered end, not raw `slotOpening.endsAt` | Must-have |
| R3 | Slot effective buffer resolution must follow the same precedence as `createAppointment`: `eventType.bufferMinutes → bookingSettings.defaultBufferMinutes → 0` | Must-have |
| R4 | A test confirms that a customer with an existing appointment whose buffer window overlaps the offered slot is excluded from eligibility | Must-have |

---

## CURRENT: How the overlap check works today

**Location:** `src/lib/slot-recovery.ts` lines 224–233

```typescript
const overlapping = await db.query.appointments.findFirst({
  where: (table, { and, eq, gt, inArray, lt }) =>
    and(
      eq(table.shopId, slotOpening.shopId),
      eq(table.customerId, candidate.id),
      inArray(table.status, ["booked", "pending"]),
      lt(table.startsAt, slotOpening.endsAt),       // ← raw slot end
      gt(table.endsAt, slotOpening.startsAt)         // ← raw existing end
    ),
});
```

**What `createAppointment` does (the stricter guard):**

Located at `src/lib/queries/appointments.ts` lines 866–884:

```typescript
const blockedEndsAt = new Date(endsAt.getTime() + effectiveBufferAfterMinutes * 60_000);
const overlapping = await tx.select({ id: appointments.id })
  .from(appointments)
  .where(and(
    eq(appointments.shopId, input.shopId),
    inArray(appointments.status, ["booked", "pending"]),
    lt(appointments.startsAt, blockedEndsAt),                                        // slot's buffered end
    sql`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${input.startsAt}` // existing's buffered end
  ));
```

**The two gaps:**

| Gap | What's missing | Where it bites |
|-----|---------------|----------------|
| G1 | Existing appointment's buffer is ignored | Customer with appt ending at T−1m and buffer of 10m can receive an offer starting at T — but will be rejected at booking |
| G2 | Slot's own effective buffer is ignored | Customer with appt starting right after raw `slotOpening.endsAt` can receive an offer — but will be rejected at booking |

---

## Shape A: Mirror `createAppointment` semantics in `getEligibleCustomers`

### A: Mirror createAppointment semantics in getEligibleCustomers

| Part | Mechanism |
|------|-----------|
| **A1** | **Resolve slot effective buffer once, before the candidate loop** |
| A1.1 | If `slotOpening.eventTypeId` is set: query `eventTypes.bufferMinutes` (same query already in `acceptOffer`) |
| A1.2 | Fallback chain: `eventTypeBufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0` — matches `createAppointment` line 742–743. Use `getBookingSettingsForShop` (already importable from `queries/appointments`) |
| A1.3 | Store as `slotEffectiveBufferMs = slotEffectiveBufferMinutes * 60_000` for use in the loop |
| **A2** | **Replace per-candidate `findFirst` with buffer-aware SQL** |
| A2.1 | Switch to `db.select({ id: appointments.id }).from(appointments).where(...)` — needed because `db.query.findFirst` typed builder cannot compose SQL arithmetic expressions |
| A2.2 | Existing-appointment buffered end: `sql\`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${slotOpening.startsAt}\`` (mirrors `createAppointment` exactly) |
| A2.3 | Slot buffered end: `lt(appointments.startsAt, new Date(slotOpening.endsAt.getTime() + slotEffectiveBufferMs))` — uses pre-computed value from A1 |
| A2.4 | Retain existing filters: `eq(shopId)`, `eq(customerId)`, `inArray(status, ["booked","pending"])` |
| **A3** | **Add buffer-overlap integration test** |
| A3.1 | In `src/lib/__tests__/slot-recovery-tier-sorting.test.ts`, add a test case that seeds a candidate with an existing appointment whose raw `endsAt` is before `slotOpening.startsAt` but whose `endsAt + effectiveBufferAfterMinutes` overlaps it |
| A3.2 | Assert the candidate is absent from `getEligibleCustomers` result |
| A3.3 | Assert a sibling candidate without the buffer conflict is still returned (contrast case) |

---

## Fit Check

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Customers sent slot recovery offers must be eligible to actually book the offered slot | Core goal | ✅ |
| R1 | Existing appointments must block through `endsAt + effectiveBufferAfterMinutes` | Must-have | ✅ |
| R2 | The offered slot must block through its own effective buffered end | Must-have | ✅ |
| R3 | Slot effective buffer resolution must follow same precedence as `createAppointment` | Must-have | ✅ |
| R4 | Test confirms buffer-overlap customer is excluded from eligibility | Must-have | ✅ |

**Notes:**
- A satisfies R1 via A2.2 (SQL expression mirrors `createAppointment` line 878 exactly)
- A satisfies R2 via A2.3 (pre-computed `slotEffectiveBufferMs` applied to `slotOpening.endsAt`)
- A satisfies R3 via A1.1–A1.2 (same eventType → settings fallback chain)
- A satisfies R4 via A3.1–A3.3

**Selected shape: A**

---

## Implementation Notes

### Why switch from `db.query.findFirst` to `db.select`

The typed relational query builder (`db.query.*.findFirst`) does not support `sql` template expressions in its `where` callback. The arithmetic `endsAt + effectiveBufferAfterMinutes * interval '1 minute'` requires raw SQL, which means switching to `db.select().from().where()`. This is the same pattern already used in `createAppointment`.

### Where to import `getBookingSettingsForShop`

Already exported from `src/lib/queries/appointments.ts`. The function is already imported in `slot-recovery.ts` (`createAppointment` comes from the same file), so no new import path is needed — just add `getBookingSettingsForShop` to the existing named import.

### Slot effective buffer resolution (full precedence)

```typescript
// Before the candidate loop in getEligibleCustomers:
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

### Replacement overlap query (per-candidate)

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

if (overlapping.length > 0) { ... }
```

### Test scenario

```
slot:    [11:00 → 12:00]  (slotOpening)
buffer:  10 minutes on the eventType

candidate A existing appt: [10:00 → 10:55]  effectiveBufferAfterMinutes=10
  raw endsAt (10:55) < slot startsAt (11:00)   → passes old check  ← BUG
  buffered end (11:05) > slot startsAt (11:00) → fails new check   ← FIXED

candidate B has no conflicting appointment → still eligible
```
