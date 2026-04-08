---
shaping: true
---

# Conflict Scanner Buffer — Slices

**Shape:** B (B1–B7)  
**Breadboard:** `conflict-scanner-buffer-breadboard.md`  
**Date:** 2026-04-08

---

## Slice Overview

| Slice | Name | Affordances | Demo |
|-------|------|-------------|------|
| V1 | Scanner buffer fix + tests | B1, B2, B3, B4, B5, B6, B7 | Event inside post-appointment buffer → scanner creates alert |

One slice. B1–B5 are tightly coupled (helper → query → call site × 2 scanners). Tests ship with the fix.

---

## V1 — Scanner Buffer Fix + Tests

**What ships:** Both conflict scanners (`scanAndDetectConflicts` and `debugScanConflictsForShop`) use the same overlap rule as real-time validation. Events that fall only inside the post-appointment buffer or the ±5 min calendar padding are now detected.

**Demo:** Appointment 13:00–14:00 with 15 min buffer. Calendar event 14:05–14:30. Scanner creates a `calendarConflictAlerts` row. Before this fix it skipped it.

### Affordances

| ID | Affordance | Type |
|----|------------|------|
| B1 | `appointmentBlockedEndMs(endsAt, bufferMinutes)` exported from `calendar-conflict-rules.ts` | Logic |
| B2 | `scanAndDetectConflicts` query — `effectiveBufferAfterMinutes: true` added to `columns` | Data |
| B3 | `scanAndDetectConflicts` overlap check — replaced with `overlapsWithCalendarConflictBuffer` using `slotEndMs = appointmentBlockedEndMs(...)` | Logic |
| B4 | `debugScanConflictsForShop` query — same column addition as B2 | Data |
| B5 | `debugScanConflictsForShop` overlap check — same replacement as B3 | Logic |
| B6 | Test: event overlaps only post-appointment buffer → scanner creates alert | Test |
| B7 | Test: event overlaps only within ±5 min calendar padding → scanner creates alert | Test |

### Wiring

```
src/lib/calendar-conflict-rules.ts
  └──► export appointmentBlockedEndMs(endsAt: Date, bufferMinutes: number): number
         return endsAt.getTime() + bufferMinutes * 60_000

src/lib/calendar-conflicts.ts — scanAndDetectConflicts (lines ~503–555)
  └──► columns: add effectiveBufferAfterMinutes: true
  └──► overlap check:
         const blockedEndMs = appointmentBlockedEndMs(
           appointment.endsAt,
           appointment.effectiveBufferAfterMinutes
         )
         const hasOverlap = allDay
           ? true
           : overlapsWithCalendarConflictBuffer({
               slotStartMs:  appointment.startsAt.getTime(),
               slotEndMs:    blockedEndMs,
               eventStartMs: eventStart.getTime(),
               eventEndMs:   eventEnd.getTime(),
             })

src/lib/calendar-conflicts.ts — debugScanConflictsForShop (lines ~365–439)
  └──► columns: add effectiveBufferAfterMinutes: true
  └──► overlap check: identical to above
```

### Tasks

1. **`calendar-conflict-rules.ts`** — export `appointmentBlockedEndMs`
   - Add after existing exports:
     ```ts
     export function appointmentBlockedEndMs(endsAt: Date, bufferMinutes: number): number {
       return endsAt.getTime() + bufferMinutes * 60_000;
     }
     ```

2. **`scanAndDetectConflicts` query** (`calendar-conflicts.ts` ~line 509)
   - Add `effectiveBufferAfterMinutes: true` to `columns`

3. **`scanAndDetectConflicts` overlap check** (~line 552)
   - Import `appointmentBlockedEndMs` from `calendar-conflict-rules.ts`
   - Replace the raw `eventStart.getTime() < appointment.endsAt.getTime() && eventEnd.getTime() > appointment.startsAt.getTime()` with the `overlapsWithCalendarConflictBuffer` call using `appointmentBlockedEndMs`

4. **`debugScanConflictsForShop` query** (~line 365)
   - Same column addition as task 2

5. **`debugScanConflictsForShop` overlap check** (~line 436)
   - Same replacement as task 3

6. **Tests** (`src/lib/__tests__/calendar-conflicts.test.ts`)
   - B6: appointment 13:00–14:00 buffer=15, event 14:05–14:30 → alert created
   - B7: appointment 13:00–14:00 buffer=0, event 11:57–13:00 → alert created

### Verification

```bash
pnpm typecheck
pnpm test src/lib/__tests__/calendar-conflicts
```
