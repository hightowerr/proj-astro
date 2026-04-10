# Conflict Scanner Buffer — V1 Implementation Plan

**Slice:** V1 of 1  
**Status:** PENDING  
**Goal:** Both conflict scanners apply the same overlap rule as real-time validation — including post-appointment buffer and ±5 min calendar padding.

---

## What This Slice Does

- Exports `appointmentBlockedEndMs` from `calendar-conflict-rules.ts`
- Adds `effectiveBufferAfterMinutes` to both scanner DB queries
- Replaces the raw overlap check in both scanners with `overlapsWithCalendarConflictBuffer` using `appointmentBlockedEndMs` as `slotEndMs`
- Adds two new tests: buffer-only conflict (B6) and calendar-padding-only conflict (B7)
- Updates three existing test fixtures to include `effectiveBufferAfterMinutes: 0` (required after the query change; without it `appointmentBlockedEndMs` receives `undefined` and the overlap check silently breaks)

## What This Slice Does NOT Do

- No schema migration — `effectiveBufferAfterMinutes` already exists on the `appointments` table (landed in the buffer-time V1 slice)
- No changes to `validateBookingConflict` (real-time path)
- No changes to `calculateOverlapSeverity`, `cleanupOldAlerts`, or any other function in `calendar-conflicts.ts`

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/calendar-conflict-rules.ts` | Export `appointmentBlockedEndMs` |
| `src/lib/calendar-conflicts.ts` | B2–B5: column additions + overlap replacements in both scanners |
| `src/lib/__tests__/calendar-conflicts.test.ts` | B6 + B7 new tests; update 3 existing fixtures |

---

## Implementation Steps

### Step 1 — Export `appointmentBlockedEndMs` from `calendar-conflict-rules.ts`

**File:** `src/lib/calendar-conflict-rules.ts`

Append after the existing exports:

```typescript
export function appointmentBlockedEndMs(endsAt: Date, bufferMinutes: number): number {
  return endsAt.getTime() + bufferMinutes * 60_000;
}
```

No other changes to this file. `overlapsWithCalendarConflictBuffer` signature is untouched.

---

### Step 2 — Import `appointmentBlockedEndMs` in `calendar-conflicts.ts`

**File:** `src/lib/calendar-conflicts.ts` (top of file, line 3)

Extend the existing import:

```typescript
// Before
import { overlapsWithCalendarConflictBuffer } from "@/lib/calendar-conflict-rules";

// After
import {
  appointmentBlockedEndMs,
  overlapsWithCalendarConflictBuffer,
} from "@/lib/calendar-conflict-rules";
```

---

### Step 3 — `scanAndDetectConflicts`: add column to query (B2)

**File:** `src/lib/calendar-conflicts.ts` (~lines 509–514)

```typescript
// Before
columns: {
  id: true,
  startsAt: true,
  endsAt: true,
  calendarEventId: true,
},

// After
columns: {
  id: true,
  startsAt: true,
  endsAt: true,
  calendarEventId: true,
  effectiveBufferAfterMinutes: true,
},
```

---

### Step 4 — `scanAndDetectConflicts`: replace overlap check (B3)

**File:** `src/lib/calendar-conflicts.ts` (~lines 552–555)

```typescript
// Before
const hasOverlap = allDay
  ? true
  : eventStart.getTime() < appointment.endsAt.getTime() &&
    eventEnd.getTime() > appointment.startsAt.getTime();

// After
const hasOverlap = allDay
  ? true
  : overlapsWithCalendarConflictBuffer({
      slotStartMs: appointment.startsAt.getTime(),
      slotEndMs: appointmentBlockedEndMs(
        appointment.endsAt,
        appointment.effectiveBufferAfterMinutes
      ),
      eventStartMs: eventStart.getTime(),
      eventEndMs: eventEnd.getTime(),
    });
```

---

### Step 5 — `debugScanConflictsForShop`: add column to query (B4)

**File:** `src/lib/calendar-conflicts.ts` (~lines 365–370)

Same addition as Step 3:

```typescript
columns: {
  id: true,
  startsAt: true,
  endsAt: true,
  calendarEventId: true,
  effectiveBufferAfterMinutes: true,   // add this
},
```

---

### Step 6 — `debugScanConflictsForShop`: replace overlap check (B5)

**File:** `src/lib/calendar-conflicts.ts` (~lines 436–439)

Same replacement as Step 4:

```typescript
const hasOverlap = allDay
  ? true
  : overlapsWithCalendarConflictBuffer({
      slotStartMs: appointment.startsAt.getTime(),
      slotEndMs: appointmentBlockedEndMs(
        appointment.endsAt,
        appointment.effectiveBufferAfterMinutes
      ),
      eventStartMs: eventStart.getTime(),
      eventEndMs: eventEnd.getTime(),
    });
```

---

### Step 7 — Update existing test fixtures

**File:** `src/lib/__tests__/calendar-conflicts.test.ts`

Three existing `appointmentsFindManyMock` fixtures omit `effectiveBufferAfterMinutes`. After Step 3/5, TypeScript requires it on appointment objects returned from the query. Without it, `appointmentBlockedEndMs(endsAt, undefined)` returns `NaN`, silently breaking overlap detection.

Add `effectiveBufferAfterMinutes: 0` to each:

**"creates alerts for overlapping external events"** (~line 339):
```typescript
{
  id: "appt-1",
  startsAt: new Date("2026-03-15T10:00:00.000Z"),
  endsAt: new Date("2026-03-15T11:00:00.000Z"),
  calendarEventId: "evt-own",
  effectiveBufferAfterMinutes: 0,   // add
}
```

**"de-duplicates when alert already exists"** (~line 380):
```typescript
{
  id: "appt-1",
  startsAt: new Date("2026-03-15T10:00:00.000Z"),
  endsAt: new Date("2026-03-15T11:00:00.000Z"),
  calendarEventId: null,
  effectiveBufferAfterMinutes: 0,   // add
}
```

**"skips the appointment's own calendar event"** (~line 408):
```typescript
{
  id: "appt-1",
  startsAt: new Date("2026-03-15T10:00:00.000Z"),
  endsAt: new Date("2026-03-15T11:00:00.000Z"),
  calendarEventId: "evt-own",
  effectiveBufferAfterMinutes: 0,   // add
}
```

`effectiveBufferAfterMinutes: 0` preserves the existing test intent (no buffer, raw overlap equivalent).

---

### Step 8 — Add new tests (B6 + B7)

**File:** `src/lib/__tests__/calendar-conflicts.test.ts`

Append inside the `describe("calendar-conflicts", ...)` block, after the existing `scanAndDetectConflicts` tests.

**B6 — buffer-only conflict:**

```typescript
it("scanAndDetectConflicts detects conflict when event overlaps only the post-appointment buffer", async () => {
  bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
  appointmentsFindManyMock
    .mockResolvedValueOnce([
      {
        id: "appt-buf",
        startsAt: new Date("2026-03-15T13:00:00.000Z"),
        endsAt: new Date("2026-03-15T14:00:00.000Z"),
        calendarEventId: null,
        effectiveBufferAfterMinutes: 15,
      },
    ])
    .mockResolvedValueOnce([]);

  // Event starts after raw endsAt (14:00) but inside the 15-min buffer window (14:15)
  mockFetchCalendarEventsWithCache.mockResolvedValue([
    {
      id: "evt-in-buffer",
      summary: "Buffer Overlap",
      start: { dateTime: "2026-03-15T14:05:00.000Z" },
      end: { dateTime: "2026-03-15T14:30:00.000Z" },
    },
  ]);
  insertReturningMock.mockResolvedValue([{ id: "alert-buf" }]);

  const result = await scanAndDetectConflicts("shop-1");

  expect(result.conflictsDetected).toBe(1);
  expect(result.alertsCreated).toBe(1);
  expect(dbMock.insert).toHaveBeenCalledTimes(1);
});
```

**B7 — calendar-padding-only conflict:**

```typescript
it("scanAndDetectConflicts detects conflict when event overlaps only within the +/- 5 min calendar padding", async () => {
  bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
  appointmentsFindManyMock
    .mockResolvedValueOnce([
      {
        id: "appt-pad",
        startsAt: new Date("2026-03-15T13:00:00.000Z"),
        endsAt: new Date("2026-03-15T14:00:00.000Z"),
        calendarEventId: null,
        effectiveBufferAfterMinutes: 0,
      },
    ])
    .mockResolvedValueOnce([]);

  // Event ends exactly at appointment start (13:00) — raw check misses it,
  // but it falls within the 5-min pre-appointment padding window (12:55–13:00)
  mockFetchCalendarEventsWithCache.mockResolvedValue([
    {
      id: "evt-padding",
      summary: "Padding Overlap",
      start: { dateTime: "2026-03-15T11:57:00.000Z" },
      end: { dateTime: "2026-03-15T13:00:00.000Z" },
    },
  ]);
  insertReturningMock.mockResolvedValue([{ id: "alert-pad" }]);

  const result = await scanAndDetectConflicts("shop-1");

  expect(result.conflictsDetected).toBe(1);
  expect(result.alertsCreated).toBe(1);
  expect(dbMock.insert).toHaveBeenCalledTimes(1);
});
```

---

## How I Will Test This

### 1. Type check

```bash
pnpm typecheck
```

Catches: missing `effectiveBufferAfterMinutes` in columns selector, wrong return type on `appointmentBlockedEndMs`, broken import path.

### 2. Existing tests — no regressions

```bash
pnpm test src/lib/__tests__/calendar-conflicts.test.ts
```

All 12 existing tests must pass. Any failure here means the fixture updates in Step 7 are wrong or the overlap replacement changed behaviour for zero-buffer appointments.

### 3. New tests pass (B6 + B7)

Same command as above. Both new tests must go green:
- B6 confirms the scanner now catches buffer-window events that the raw check would miss
- B7 confirms the ±5 min calendar padding is applied (this was also missing before)

### 4. Full lint + typecheck

```bash
pnpm check
```

### 5. Full test suite — no cross-feature regressions

```bash
pnpm test
```

---

## Acceptance Criteria

- [ ] `pnpm typecheck` passes
- [ ] `pnpm check` passes
- [ ] All 12 existing `calendar-conflicts` tests still pass
- [ ] B6: scanner creates alert for event at 14:05 when appointment ends 14:00 with 15-min buffer
- [ ] B7: scanner creates alert for event ending exactly at appointment start (13:00, no buffer)
- [ ] `appointmentBlockedEndMs` is exported from `calendar-conflict-rules.ts` and importable
- [ ] Neither `scanAndDetectConflicts` nor `debugScanConflictsForShop` contains a raw interval overlap test
