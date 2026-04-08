---
shaping: true
---

# Conflict Scanner Buffer — Breadboard (Shape B)

**Shape:** B1 + B2 + B3 + B4 + B5 + B6 + B7  
**Date:** 2026-04-08

---

## Non-UI Affordances

| ID | Name | What it does |
|----|------|-------------|
| B1 | `appointmentBlockedEndMs(endsAt, bufferMinutes)` | New export from `calendar-conflict-rules.ts`. Returns `endsAt.getTime() + bufferMinutes * 60_000`. Encodes the rule: "the appointment owns time until `endsAt + buffer`." |
| B2 | `scanAndDetectConflicts` query | Adds `effectiveBufferAfterMinutes: true` to `columns` (lines 509–514). Makes the buffer value available to the overlap check. |
| B3 | `scanAndDetectConflicts` overlap check | Replaces raw `eventStart < endsAt && eventEnd > startsAt` (lines 552–555) with `overlapsWithCalendarConflictBuffer({ slotStartMs, slotEndMs: appointmentBlockedEndMs(...), eventStartMs, eventEndMs })`. |
| B4 | `debugScanConflictsForShop` query | Same column addition as B2 (lines 365–370). |
| B5 | `debugScanConflictsForShop` overlap check | Same replacement as B3 (lines 436–439). |
| B6 | Test: buffer-only conflict | Scanner creates alert when event falls inside post-appointment buffer window. |
| B7 | Test: calendar-padding-only conflict | Scanner creates alert when event falls within ±5 min calendar padding but outside raw appointment window. |

**`overlapsWithCalendarConflictBuffer` is unchanged.** Its signature and behaviour are unmodified — B1 shifts responsibility for computing the correct `slotEndMs` to the call site.

---

## Wiring

### Path: Background scanner job → `scanAndDetectConflicts`

```
POST /api/jobs/scan-calendar-conflicts
  └──► scanAndDetectConflicts(shopId)
         └──► B2: query appointments
                SELECT id, startsAt, endsAt, calendarEventId,
                       effectiveBufferAfterMinutes        ← added
                WHERE shopId = ? AND status = 'booked' AND startsAt >= now
         └──► group appointments by date
         └──► for each date:
                └──► fetchCalendarEventsWithCache(shopId, dateStr, timezone)
                └──► for each appointment × event:
                       if same event ID → skip (unchanged)
                       if invalid event time → skip (unchanged)
                       if allDay → hasOverlap = true (unchanged)
                       else:
                         └──► B1: appointmentBlockedEndMs(
                                    appointment.endsAt,
                                    appointment.effectiveBufferAfterMinutes
                                  )
                                  → blockedEndMs
                         └──► B3: overlapsWithCalendarConflictBuffer({
                                    slotStartMs:  appointment.startsAt.getTime(),
                                    slotEndMs:    blockedEndMs,
                                    eventStartMs: eventStart.getTime(),
                                    eventEndMs:   eventEnd.getTime()
                                  })
                                  → hasOverlap
                       if hasOverlap → INSERT calendarConflictAlerts (unchanged)
```

### Path: Debug endpoint → `debugScanConflictsForShop`

Identical overlap path; additionally populates `ConflictDecision[]` with `reason` tags for observability.

```
GET /api/jobs/scan-calendar-conflicts/debug?shopId=x
  └──► debugScanConflictsForShop(shopId, ...)
         └──► B4: query appointments (same column addition as B2)
         └──► for each appointment × event:
                (same structure as above)
                └──► B1 + B5: same overlap call as B3
                └──► pushDecision("overlap" | "skip_no_overlap" | ...) (unchanged)
```

### Path: Real-time booking validation (unchanged)

```
POST /api/bookings/create
  └──► validateBookingConflict({ slotStartMs, slotEndMs, ... })
         └──► overlapsWithCalendarConflictBuffer(...)   ← no change, B1 not used
```

`slotEndMs` here is the raw candidate slot end — the slot buffer is irrelevant for real-time validation, consistent with existing behaviour.

---

## Mermaid Diagram

```mermaid
graph TD
  subgraph "calendar-conflict-rules.ts"
    HELPER["overlapsWithCalendarConflictBuffer\n(unchanged)"]
    B1["appointmentBlockedEndMs\nendsAt + bufferMinutes * 60_000\n(new export — B1)"]
  end

  subgraph "scanAndDetectConflicts"
    B2_q["query appointments\n+ effectiveBufferAfterMinutes (B2)"]
    B3_check["overlap check (B3)\nslotEndMs = B1(endsAt, buffer)\n→ overlapsWithCalendarConflictBuffer"]
    ALERT[(calendarConflictAlerts\nINSERT)]
    B2_q --> B3_check
    B1 --> B3_check
    B3_check --> HELPER
    HELPER --> ALERT
  end

  subgraph "debugScanConflictsForShop"
    B4_q["query appointments\n+ effectiveBufferAfterMinutes (B4)"]
    B5_check["overlap check (B5)\nsame call as B3"]
    DECISIONS[(ConflictDecision[]\nlogged for observability)]
    B4_q --> B5_check
    B1 --> B5_check
    B5_check --> HELPER
    HELPER --> DECISIONS
  end

  subgraph "validateBookingConflict (real-time)"
    RT_check["overlapsWithCalendarConflictBuffer\n(no change — B1 not used)"]
    RT_check --> HELPER
  end
```

---

## Invariants After Shape B

| Invariant | Before | After |
|-----------|--------|-------|
| Real-time and scanner agree on buffer-only conflicts | No — scanner missed them | Yes |
| Real-time and scanner agree on calendar-padding-only conflicts | No — scanner missed them | Yes |
| `overlapsWithCalendarConflictBuffer` signature | `{ slotStartMs, slotEndMs, eventStartMs, eventEndMs }` | Unchanged |
| All-day events always conflict | Yes | Yes (unchanged) |
| Same-event-ID skip | Yes | Yes (unchanged) |

---

## Test Scenarios

**B6 — Buffer-only conflict**

```
Appointment: 13:00–14:00, effectiveBufferAfterMinutes = 15
  → blockedEndMs = 14:15

Event: 14:05–14:30

Raw check:   14:05 < 14:00 → false  (bug: scanner skips)
With B1+B3:  slotEndMs = 14:15
             eventStartMs(14:05) < 14:15 + 5 min(14:20) → true
             → scanner creates alert ✓
```

**B7 — Calendar-padding-only conflict**

```
Appointment: 13:00–14:00, effectiveBufferAfterMinutes = 0
  → blockedEndMs = 14:00

Event: 11:57–13:00

Raw check:   eventEnd(13:00) > startsAt(13:00) → false  (bug: scanner skips)
With B3:     eventEndMs(13:00) > slotStartMs(13:00) - 5 min(12:55) → true
             → scanner creates alert ✓
```
