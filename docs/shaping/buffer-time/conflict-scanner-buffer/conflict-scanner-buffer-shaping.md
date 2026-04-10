# Conflict Scanner Buffer — Shaping Doc

## Frame

### Source

> Gemini finding #2 is a true positive.
>
> Real-time booking validation uses `overlapsWithCalendarConflictBuffer` from
> `src/lib/calendar-conflict-rules.ts`. The background scanner in
> `src/lib/calendar-conflicts.ts` (around line 552) does not use that rule. It
> falls back to raw overlap:
> - `eventStart < appointment.endsAt`
> - `eventEnd > appointment.startsAt`
>
> It also does not account for `effectiveBufferAfterMinutes`.
>
> Fix instruction:
> - Replace the scanner's manual overlap check with shared logic.
> - At minimum, compute the appointment's blocked end as
>   `appointment.endsAt + appointment.effectiveBufferAfterMinutes`.
> - Prefer reusing one helper so real-time validation and background scanning
>   cannot drift again.
> - Add a scanner test for "event overlaps only with post-appointment buffer"
>   and a second one for the existing +/- 5 minute calendar conflict padding.

---

### Problem

- The background conflict scanner (`scanAndDetectConflicts`) uses a raw
  two-interval overlap test: `eventStart < appointment.endsAt && eventEnd >
  appointment.startsAt` (lines 552–555).
- The debug scanner (`debugScanConflictsForShop`) has the identical raw check
  at lines 436–439. **Spike confirmed: same bug, second location.**
- Real-time booking validation (`validateBookingConflict`) uses
  `overlapsWithCalendarConflictBuffer`, which adds ±5 min calendar padding
  **and** extends the appointment end by `effectiveBufferAfterMinutes`.
- Neither scanner query selects `effectiveBufferAfterMinutes`, so the data to
  apply the buffer is not even available.
- Result: a booking can be rejected in real time because of padding or
  post-appointment buffer, yet both scanners later report no conflict for the
  same situation — three code paths, two different answers.

### Outcome

- Real-time validation and both scan paths agree on whether a calendar event
  conflicts with an appointment.
- The single source of overlap truth lives in `calendar-conflict-rules.ts`; no
  second copy of the logic exists in either scanner.
- Both scanners apply the ±5 min calendar padding (`CALENDAR_CONFLICT_BUFFER_MS`)
  and the post-appointment buffer (`effectiveBufferAfterMinutes`) consistently
  with the real-time path.
- New unit tests cover the scanner's buffer behaviour so the paths cannot
  silently drift again.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Both scanners and real-time validator use identical overlap logic | Core goal |
| R1 | Scanners account for `effectiveBufferAfterMinutes` when computing blocked end | Must-have |
| R2 | Scanners apply the ±5 min calendar conflict padding (`CALENDAR_CONFLICT_BUFFER_MS`) | Must-have |
| R3 | Shared overlap logic lives in one place; no duplication across any path | Must-have |
| R4 | Both scanner DB queries select `effectiveBufferAfterMinutes` from appointments | Must-have |
| R5 | Existing `validateBookingConflict` behaviour is unchanged | Must-have |
| R6 | Unit test: scanner detects conflict when event overlaps only the post-appointment buffer | Must-have |
| R7 | Unit test: scanner detects conflict when event overlaps only within the ±5 min calendar padding | Must-have |
| R8 | All-day event handling in both scanners is unchanged (all-day always conflicts) | Must-have |

---

## Shapes

### A: Extend `overlapsWithCalendarConflictBuffer` with optional buffer param

Add an optional `slotBufferAfterMs?: number` (default `0`) to the existing
helper so scanners can pass `effectiveBufferAfterMinutes * 60_000`.

| Part | Mechanism |
|------|-----------|
| **A1** | Extend `overlapsWithCalendarConflictBuffer` — add `slotBufferAfterMs?: number` param (default `0`); effective slot end becomes `slotEndMs + slotBufferAfterMs` before the ±5 min test |
| **A2** | `validateBookingConflict` call site — unchanged (no new arg; slot buffer is irrelevant for candidate slots) |
| **A3** | `scanAndDetectConflicts` query — add `effectiveBufferAfterMinutes: true` to `columns` (lines 503–515) |
| **A4** | `scanAndDetectConflicts` overlap check — call helper with `slotBufferAfterMs: appointment.effectiveBufferAfterMinutes * 60_000` (lines 552–555) |
| **A5** | `debugScanConflictsForShop` query — add `effectiveBufferAfterMinutes: true` to `columns` (lines 365–371) |
| **A6** | `debugScanConflictsForShop` overlap check — same call as A4 (lines 436–439) |
| **A7** | Unit test: event starts inside post-appointment buffer → scanner detects conflict |
| **A8** | Unit test: event ends 3 min before appointment start (inside ±5 min window) → scanner detects conflict |

### B: Add `appointmentBlockedEndMs` helper; keep existing helper signature unchanged

Leave `overlapsWithCalendarConflictBuffer` exactly as-is. Export a thin
`appointmentBlockedEndMs` helper and pass its output as `slotEndMs`.

| Part | Mechanism |
|------|-----------|
| **B1** | Export `appointmentBlockedEndMs(endsAt: Date, bufferMinutes: number): number` from `calendar-conflict-rules.ts` — returns `endsAt.getTime() + bufferMinutes * 60_000` |
| **B2** | `scanAndDetectConflicts` query — add `effectiveBufferAfterMinutes: true` to `columns` (lines 503–515) |
| **B3** | `scanAndDetectConflicts` overlap check — replace manual test with `overlapsWithCalendarConflictBuffer({ slotStartMs: appointment.startsAt.getTime(), slotEndMs: appointmentBlockedEndMs(appointment.endsAt, appointment.effectiveBufferAfterMinutes), eventStartMs, eventEndMs })` (lines 552–555) |
| **B4** | `debugScanConflictsForShop` query — add `effectiveBufferAfterMinutes: true` to `columns` (lines 365–371) |
| **B5** | `debugScanConflictsForShop` overlap check — same call as B3 (lines 436–439) |
| **B6** | Unit test: event starts inside post-appointment buffer → scanner detects conflict |
| **B7** | Unit test: event ends 3 min before appointment start (inside ±5 min window) → scanner detects conflict |

---

## Fit Check

| Req | Requirement | Status | A | B |
|-----|-------------|--------|---|---|
| R0 | Both scanners and real-time validator use identical overlap logic | Core goal | ✅ | ✅ |
| R1 | Scanners account for `effectiveBufferAfterMinutes` when computing blocked end | Must-have | ✅ | ✅ |
| R2 | Scanners apply the ±5 min calendar conflict padding | Must-have | ✅ | ✅ |
| R3 | Shared overlap logic lives in one place; no duplication | Must-have | ✅ | ✅ |
| R4 | Both scanner DB queries select `effectiveBufferAfterMinutes` | Must-have | ✅ | ✅ |
| R5 | Existing `validateBookingConflict` behaviour is unchanged | Must-have | ✅ | ✅ |
| R6 | Unit test: scanner detects conflict — event overlaps only post-appointment buffer | Must-have | ✅ | ✅ |
| R7 | Unit test: scanner detects conflict — event overlaps only within ±5 min padding | Must-have | ✅ | ✅ |
| R8 | All-day event handling in both scanners is unchanged | Must-have | ✅ | ✅ |

**Notes:**
- Both shapes satisfy all requirements. A modifies the existing helper's
  signature; B leaves it untouched and adds a second small helper.
- **Selected: B** — keeps `overlapsWithCalendarConflictBuffer`'s call signature
  stable (no risk of breaking other callers), and `appointmentBlockedEndMs` is
  self-documenting at the call site.

---

## Selected Shape: B

### Parts

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | Export `appointmentBlockedEndMs(endsAt, bufferMinutes)` from `calendar-conflict-rules.ts` | |
| **B2** | `scanAndDetectConflicts` query: add `effectiveBufferAfterMinutes: true` to `columns` | |
| **B3** | `scanAndDetectConflicts` overlap: replace manual check with `overlapsWithCalendarConflictBuffer` using `slotEndMs = appointmentBlockedEndMs(...)` | |
| **B4** | `debugScanConflictsForShop` query: add `effectiveBufferAfterMinutes: true` to `columns` | |
| **B5** | `debugScanConflictsForShop` overlap: same fix as B3 | |
| **B6** | Test: event starts inside post-appointment buffer → scanner creates alert | |
| **B7** | Test: event ends 3 min before appointment start (inside ±5 min padding) → scanner creates alert | |

### Key Files

| File | Change |
|------|--------|
| `src/lib/calendar-conflict-rules.ts` | Add `appointmentBlockedEndMs` export |
| `src/lib/calendar-conflicts.ts` | Lines 365–371, 503–515 (columns); lines 436–439, 552–555 (overlap checks) |
| `src/lib/__tests__/calendar-conflicts.test.ts` | Two new `scanAndDetectConflicts` test cases |

### Test Scenarios

**B6 — Buffer-only conflict:**
- Appointment: 13:00–14:00, `effectiveBufferAfterMinutes = 15` → blocked end 14:15
- Event: 14:05–14:30 (starts after raw `endsAt`, inside buffer window)
- Raw check: `14:05 < 14:00` = false → scanner skips (bug)
- With helper: `slotEndMs = 14:15`, `14:05 < 14:15 + 5 min` = true → detected
- Expected: scanner creates alert

**B7 — Calendar-padding-only conflict:**
- Appointment: 13:00–14:00, `effectiveBufferAfterMinutes = 0`
- Event: 11:57–13:00 (ends exactly at appointment start)
- Raw check: `eventEnd(13:00) > startsAt(13:00)` = false → scanner skips (bug)
- With helper: `eventEnd(13:00) > slotStart(13:00) - 5 min(12:55)` = true → detected
- Expected: scanner creates alert
