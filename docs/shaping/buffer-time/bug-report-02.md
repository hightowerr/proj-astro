# Bug Report 02: Buffer Time Functional Issues

**Date:** 2026-04-08
**Status:** Open
**Focus:** Functional logic errors in Calendar Sync, Conflict Scanning, and Slot Recovery.

---

## Executive Summary

While the recent buffer time implementations correctly updated the background scanner and initial sync paths, several "real-time" and "slot recovery" paths still ignore the candidate slot's buffer or bypass validation entirely. This creates inconsistencies where a slot appears available but is actually blocked, or where double-bookings can occur during slot recovery.

---

## 1. Real-time conflict validation ignores candidate buffer

### Description
`validateBookingConflict` in `src/lib/calendar-conflicts.ts` accepts raw `startsAt` and `endsAt`, but does not account for the candidate's `effectiveBufferAfterMinutes`.

### Functional Impact
A customer can book a slot that overlaps with a provider's cleanup window if a Google Calendar event exists in that window. For example, a 10-minute buffer starting at 2:00 PM (blocked until 2:10 PM) will not trigger a conflict with a calendar event starting at 2:06 PM, because the current check only applies a 5-minute padding to the raw 2:00 PM end time.

### Location
`src/lib/calendar-conflicts.ts` — `validateBookingConflict()`

---

## 2. Availability filtering ignores candidate buffer for calendar conflicts

### Description
`filterSlotsForConflicts` (used by `getAvailabilityForDate`) filters slots against Google Calendar events using raw `slotEnd`, ignoring the `effectiveBufferAfterMinutes`.

### Functional Impact
The availability calendar shows slots as "Available" that will later be rejected (or should be rejected) due to calendar conflicts during the buffer window. This creates a "phantom availability" UX bug.

### Location
`src/lib/google-calendar-cache.ts` — `filterSlotsForConflicts()`

---

## 3. Slot Recovery accepts offers without calendar validation [CRITICAL]

### Description
`acceptOffer` in `src/lib/slot-recovery.ts` calls `createAppointment` directly. Unlike the web booking flow in `src/app/api/bookings/create/route.ts`, it does not call `validateBookingConflict` before creating the appointment.

### Functional Impact
**Critical Double-Booking Risk.** If a shop owner adds a calendar event that overlaps with a cancelled slot, the slot recovery system will still allow a customer to "Accept" the offer and create a booked appointment that conflicts with the provider's calendar.

### Location
`src/lib/slot-recovery.ts` — `acceptOffer()`

---

## 4. Slot Recovery sends offers without calendar validation

### Description
`getEligibleCustomers` in `src/lib/slot-recovery.ts` checks for overlaps with existing appointments but does not check for conflicts with the shop owner's Google Calendar.

### Functional Impact
Customers receive SMS offers for slots that are actually blocked by calendar events. When the customer attempts to accept (assuming Bug #3 is fixed), they will receive a "Slot no longer available" error, leading to wasted marketing and poor CX.

### Location
`src/lib/slot-recovery.ts` — `getEligibleCustomers()`

---

## 5. Slot Recovery fallback logic for buffer is broken

### Description
In `getEligibleCustomers`, the fallback to `defaultBufferMinutes` is triggered if `slotEffectiveBufferMinutes === 0`.

### Functional Impact
Since `0` is a valid allowed value in the schema (`check in (0, 5, 10)`), an explicit `0` minute buffer on an Event Type is incorrectly overridden by the Shop's default buffer (e.g., 5 or 10 mins). This makes it impossible to offer buffer-free slot recovery if a shop has a default buffer set.

### Location
`src/lib/slot-recovery.ts` — `getEligibleCustomers()` (Line 131)

```typescript
// Current Buggy Code:
if (slotEffectiveBufferMinutes === 0) {
  const settings = await getBookingSettingsForShop(slotOpening.shopId);
  slotEffectiveBufferMinutes = settings?.defaultBufferMinutes ?? 0;
}

// Correct Logic (should match createAppointment):
// Use ?? to only fall back if null/undefined, allowing 0 to be an override.
```

---

## Recommended Fixes

1.  **Refactor `validateBookingConflict`**: Update signature to `validateBookingConflict(input: { ..., bufferAfterMinutes?: number })`. Apply this buffer to the `slotEndMs` before calling `overlapsWithCalendarConflictBuffer`.
2.  **Unify Availability**: Ensure `getAvailabilityForDate` passes the `effectiveBufferAfterMinutes` into `filterSlotsForConflicts`.
3.  **Secure Slot Recovery**: `acceptOffer` must call `validateBookingConflict` inside the transaction/lock.
4.  **Filter Slot Recovery**: `getEligibleCustomers` should fetch calendar events for the slot date and filter candidates accordingly (or at least check the slot itself once before the candidate loop).
5.  **Fix Fallback semantics**: Use null-coalescing (`??`) instead of falsy checks (`if (=== 0)`) when resolving buffers.
