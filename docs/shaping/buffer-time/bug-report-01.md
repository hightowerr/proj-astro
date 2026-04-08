# Bug Report 01 — Buffer Time Deviations

This report documents 3 specific bugs/deviations identified during the review of the "Buffer Time" feature implementation against the requirements in `docs/shaping/buffer-time/buffer-time-slices.md`.

## 1. Calendar Sync Ignores Buffer Time (High Severity) — Shaped: `docs/shaping/buffer-time/calendar-sync-buffer-fix.md`
**Location:** `src/lib/queries/appointments.ts` (L657-661, L760-L764)

**Description:** When an appointment is synced to Google Calendar (both during initial creation and manual sync), the synced event's end time is set to the raw `endsAt`. It fails to include the `effectiveBufferAfterMinutes`, which is stored on the appointment.

**Most Likely Source:** Oversight during the buffer time "wire-up". The buffer was integrated into the availability logic and creation guard but omitted from external synchronization logic.

**Impact:** The shop owner's Google Calendar shows them as "available" immediately after an appointment ends, even if they have a 10-minute cleanup buffer. This can lead to manual double-booking or other scheduling conflicts outside the app.

**Suggested Fix:** Update the `endsAt` value passed to `createCalendarEvent` to be `new Date(appointment.endsAt.getTime() + appointment.effectiveBufferAfterMinutes * 60_000)`.

---

## 2. Background Conflict Scanner Ignores Buffer/Padding (Medium Severity)
**Location:** `src/lib/calendar-conflicts.ts` (L361-365)

**Description:** The background conflict scanner (`scanAndDetectConflicts`) uses a simplified overlap check `eventStart < appointment.endsAt && eventEnd > appointment.startsAt`. This ignores the appointment's `effectiveBufferAfterMinutes` and the hardcoded `CALENDAR_CONFLICT_BUFFER_MS` (5 min) used by the real-time validator.

**Most Likely Source:** Inconsistency between the real-time validator (which uses `overlapsWithCalendarConflictBuffer`) and the background scanner (which was implemented with a manual overlap check).

**Impact:** The background scanner will fail to detect and alert on conflicts where a Google Calendar event overlaps only with the appointment's buffer window. This creates a "false sense of security" compared to the real-time validation.

**Suggested Fix:** Update the `hasOverlap` logic in `scanAndDetectConflicts` to use `overlapsWithCalendarConflictBuffer` or a logic that includes `appointment.effectiveBufferAfterMinutes`.

---

## 3. Slot Recovery Overlap Check Ignores Buffers (Medium Severity)
**Location:** `src/lib/slot-recovery.ts` (L134-144)

**Description:** The `getEligibleCustomers` function, which determines who receives SMS offers for recovered slots, uses a raw `startsAt`/`endsAt` overlap check against the customer's existing appointments. It does not account for the `effectiveBufferAfterMinutes` of those existing appointments or the buffer that would be created by the new slot.

**Most Likely Source:** The manual SQL/Drizzle query in `getEligibleCustomers` was not updated when buffer logic was added to the primary `getAvailabilityForDate` query.

**Impact:** Customers are sent "A slot opened!" SMS offers for times that actually conflict with their existing appointments' buffers. When they try to accept the offer, the `createAppointment` guard will correctly reject it (as a `SlotTakenError`), leading to customer frustration and lost recovery opportunities.

**Suggested Fix:** Update the `where` clause in the `overlapping` query within `getEligibleCustomers` to expand the blocked window using `effectiveBufferAfterMinutes`, mirroring the logic in `getAvailabilityForDate`.

---

## Verification Logs
Internal assumptions were validated by cross-referencing:
- `src/lib/queries/appointments.ts`: Confirmed `endsAt` is used directly in calendar sync calls.
- `src/lib/calendar-conflicts.ts`: Confirmed `scanAndDetectConflicts` does not call `overlapsWithCalendarConflictBuffer`.
- `src/lib/slot-recovery.ts`: Confirmed `getEligibleCustomers` overlap query uses `startsAt/endsAt` without adding `effectiveBufferAfterMinutes`.
