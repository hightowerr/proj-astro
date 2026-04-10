---
shaping: true
---

# Slot Recovery Eligibility — Slices

Shape selected: **A** (mirror `createAppointment` semantics in `getEligibleCustomers`)

---

## Slice Overview

| Slice | Name | Demo |
|-------|------|------|
| V1 | Buffer-aware eligibility filter + test | `pnpm test src/lib/__tests__/slot-recovery-tier-sorting.test.ts` passes including new buffer-overlap case |

One slice. A1 (resolve buffer) feeds directly into A2 (overlap query) — no demo-able intermediate state between them. A3 (test) validates both together.

---

## V1: Buffer-aware eligibility filter + test

### Non-UI Affordances

| ID | Name | Type | Description | Change |
|----|------|------|-------------|--------|
| N1 | `slotEffectiveBufferMinutes` | Computed value | Resolved once before candidate loop: `eventType.bufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0` | New |
| N2 | `slotBufferedEndsAt` | Computed value | `slotOpening.endsAt + N1 * 60_000` | New |
| N3 | eventType buffer lookup | DB read | `SELECT bufferMinutes FROM eventTypes WHERE id = slotOpening.eventTypeId`; skipped if no eventTypeId | New |
| N4 | `getBookingSettingsForShop` | DB read | Existing export from `queries/appointments`; called when N3 yields 0 or is skipped | Add to import |
| N5 | Per-candidate overlap query | DB read | Replaces `db.query.appointments.findFirst`; uses SQL buffer arithmetic on both sides | Replace |
| N6 | Buffer-overlap test | Test | Two-candidate test: one excluded by buffer overlap, one included as contrast | New |

### Wiring

**`src/lib/slot-recovery.ts` — `getEligibleCustomers`**

```
enters getEligibleCustomers(slotOpening)
  │
  ├─► [N3] if slotOpening.eventTypeId:
  │         SELECT bufferMinutes FROM eventTypes WHERE id = slotOpening.eventTypeId
  │
  ├─► [N4] if result from N3 is null/0:
  │         getBookingSettingsForShop(slotOpening.shopId) → .defaultBufferMinutes
  │
  ├─► [N1] slotEffectiveBufferMinutes = eventTypeBufferMinutes ?? defaultBufferMinutes ?? 0
  ├─► [N2] slotBufferedEndsAt = new Date(slotOpening.endsAt.getTime() + N1 * 60_000)
  │
  └─► for each candidate:
        └─► [N5] SELECT id FROM appointments WHERE
                   shopId = slotOpening.shopId
                   AND customerId = candidate.id
                   AND status IN ('booked','pending')
                   AND startsAt < slotBufferedEndsAt          ← was: slotOpening.endsAt
                   AND endsAt + effectiveBufferAfterMinutes    ← was: endsAt
                       * interval '1 minute' > slotOpening.startsAt
              ├─ rows > 0 → skip
              └─ rows = 0 → cooldown check → eligible[]
```

**`src/lib/__tests__/slot-recovery-tier-sorting.test.ts`**

```
[N6] new test: "excludes customer whose existing appointment buffer overlaps offered slot"
  │
  ├─► seed candidateA
  │     existing appt: startsAt=10:00, endsAt=10:55, effectiveBufferAfterMinutes=10
  │     buffered end = 11:05 > slotOpening.startsAt (11:00) → EXCLUDED
  │
  ├─► seed candidateB
  │     no conflicting appointment → INCLUDED
  │
  └─► getEligibleCustomers(slotOpening)
        assert candidateA.id ∉ result
        assert candidateB.id ∈ result
```

### Files changed

| File | Change |
|------|--------|
| `src/lib/slot-recovery.ts` | Add N3 + N4 buffer resolution before loop; replace `findFirst` with `db.select` + SQL (N5); add `getBookingSettingsForShop` to import |
| `src/lib/__tests__/slot-recovery-tier-sorting.test.ts` | Add buffer-overlap test case (N6) |
