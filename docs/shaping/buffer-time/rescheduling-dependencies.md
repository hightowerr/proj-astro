---
shaping: true
---

# Rescheduling — Dependencies & Constraints for Future Implementation

**Captured during:** Buffer Time shaping (2026-04-01)
**Status:** Not yet shaped or prioritised — recorded here for future reference
**Priority in gap analysis:** Not listed as P0 or P1

---

## Context

Rescheduling does not exist in the codebase. The manage page (`/manage/[token]`) currently supports two customer actions only:

- `POST /api/manage/[token]/cancel`
- `POST /api/manage/[token]/update-preferences`

During buffer time shaping, two decisions were made that directly constrain how rescheduling must be built. They are recorded here so the team shaping rescheduling has the full context.

---

## Constraints

### D2: Rescheduling must be implemented as cancel + create new — not an in-place update

**Decision:** When a customer reschedules, the system cancels the original appointment and creates a new one. It does not update `startsAt`/`endsAt` in place on the existing appointment row.

**Why:**
- The `appointments` table stores policy snapshots at booking time — including `effectiveBufferAfterMinutes` (added by buffer time), `policyVersionId`, `reminderTimingsSnapshot`, and potentially others in future.
- An in-place update to `startsAt`/`endsAt` would leave these snapshots at their original values, which reflects the conditions at the original booking time — not the conditions at reschedule time.
- The customer choosing a new time is making a new booking decision. They should see current availability (buffer-enforced, current policy) and their new appointment should be bound by current terms.
- This matches industry standard: Calendly and Cal.com both treat reschedule as cancel + new booking.

**What this means in practice:**
- The original appointment is cancelled (`status = 'cancelled'`, `cancelledAt` set)
- A new appointment is created via `createAppointment()` with the new `startsAt`
- The new appointment captures current policy snapshot, current buffer, current reminder timings
- The manage token should transfer to the new appointment (or a new token issued)
- Refund/payment logic: if the original booking had a payment, that payment should transfer to the new appointment rather than triggering a refund + new charge — this needs explicit design when rescheduling is shaped

**What this rules out:**
- `UPDATE appointments SET startsAt = ?, endsAt = ? WHERE id = ?` — this would preserve stale snapshots
- Any pattern that mutates the existing appointment row's timing without refreshing its policy columns

---

### D1 (related): Buffer policy changes do not retroactively affect existing appointments

Existing booked appointments keep their `effectiveBufferAfterMinutes` snapshot from booking time. Changing the shop's buffer setting does not close gaps around already-committed appointments.

This interacts with D2 as follows: if appointments A and B are booked back-to-back under buffer=0, the shop owner then changes buffer to 15 min, and B reschedules:

- A remains grandfathered at `effectiveBufferAfterMinutes = 0` — its surrounding availability is unchanged
- B's new appointment gets `effectiveBufferAfterMinutes = 15` (current policy, captured at create time via D2)
- The gap immediately after A is not protected from A's side — a new booking could land there
- This asymmetry is bounded and resolves as A completes over time

This is the correct and expected behaviour. The alternative (retroactively updating A when B reschedules) would mean B's reschedule has a silent side effect on A's availability, which is incorrect.

---

## Other Considerations to Resolve When Shaping Rescheduling

| # | Question |
|---|----------|
| RQ1 | Does the manage token carry over to the new appointment, or is a new token issued? |
| RQ2 | How is payment handled — transfer the existing payment intent to the new appointment, or refund + new charge? |
| RQ3 | Is rescheduling subject to the same cancellation cutoff as cancellation (i.e. cannot reschedule within X hours of original appointment)? |
| RQ4 | Does rescheduling count as a cancellation for tier scoring purposes if the customer reschedules late? |
| RQ5 | Should slot recovery be triggered on reschedule (the original slot opens up)? |
| RQ6 | What is the notice period for rescheduling — same as booking minimum notice, or different? |
| RQ7 | Should the shop owner be notified of reschedules separately from cancellations? |

---

## Dependencies on Buffer Time

Rescheduling depends on the buffer time feature being built correctly (Option X — snapshot on appointment) to function as intended. Specifically:

- `appointments.effectiveBufferAfterMinutes` must exist before rescheduling ships, or the new appointment created by the cancel + create flow will not have a buffer snapshot to enforce
- If rescheduling ships before buffer time: the column won't exist yet, and `createAppointment()` won't write it. This is safe — the column can be added later with a default of 0. No data integrity issue.
- If buffer time ships before rescheduling (recommended): the new appointment created by reschedule will correctly capture `effectiveBufferAfterMinutes` via `createAppointment()`, which already handles this by the time rescheduling is built.

**Recommended order: buffer time first, rescheduling second.**
