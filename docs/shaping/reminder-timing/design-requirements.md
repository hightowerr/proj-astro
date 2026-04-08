---
shaping: true
---

# Customizable Reminder Timing — Design Requirements

This document explains the design requirements for the customizable reminder timing feature. It is a companion to the shaping document (`customizable-reminder-timing-shaping.md`) and intended as a readable reference for anyone building or reviewing the feature.

---

## Why These Requirements Exist

The current system sends reminders at a hardcoded 24-hour window before every appointment. This works for some businesses, but it fails for many:

- A **recruiter** scheduling a phone call needs a 10-minute heads-up, not a 24-hour one.
- A **hairstylist** wants to send a same-day "you're coming in today" message at 2 hours out.
- A **therapist** needs 48 hours to prepare case notes before a session.

The requirements below capture what the system must do — and what it must not do — to serve these different workflows without breaking what already works.

---

## Requirements

### R0 — Shop owners can configure when reminders send

**The core goal.** Shop owners should be able to choose the timing of their reminders rather than accepting a hardcoded schedule. This is the feature's fundamental purpose.

---

### R1 — "Max 3" Policy: no more than 3 active reminder intervals

Shop owners may select up to 3 reminder timings. The UI disables the 4th checkbox once 3 are selected. The database also enforces this with a `CHECK` constraint (`array_length <= 3`) so the limit cannot be bypassed via the API.

**Why 3?** More than 3 reminders per appointment risks spamming customers. It also bounds the number of cron queries per job run (7 intervals × 3 max active = manageable load). Three is enough to cover any realistic multi-touch reminder strategy (e.g., 1 week + 24h + 2h).

---

### R2 — Preset intervals optimized for call-based businesses

The available timing options are: `10m`, `1h`, `2h`, `4h`, `24h`, `48h`, `1w`.

`15min` was considered and removed — it adds a preset slot without serving a meaningfully different persona from `10m`. The remaining presets map cleanly to real business types:

| Interval | Typical persona |
|----------|-----------------|
| `10m` | Recruiters, phone calls |
| `1h` | General appointments |
| `2h` | Hairstylists, same-day |
| `4h` | General, half-day prep |
| `24h` | Most common (current default) |
| `48h` | Therapists, case prep |
| `1w` | Therapists, long-lead prep |

These are the only valid values accepted by the database. Any interval not in this list is rejected at the schema level.

---

### R3 — Reminder timing applies uniformly to SMS and email

A shop owner configures one set of timings. Those timings apply to both email reminders and SMS reminders. There is no separate configuration per channel. This keeps the settings model simple and prevents confusion about why a customer receives a 24h email but a 2h SMS (or vice versa).

---

### R4 — Late bookings skip impossible reminders

If a customer books an appointment with less lead time than a configured reminder interval, that reminder is skipped rather than sent retroactively.

**Example:** A shop has `['24h', '2h']` configured. A customer books an appointment 30 minutes from now. Both reminders are skipped — the 24h window has already passed, and the 2h window has also passed. No retroactive sends.

**Why this matters:** Without this check, the cron job would fire reminders for appointments that are already imminent or past, creating a confusing customer experience.

---

### R5 — Reminder timing is captured at booking time and never changes

When a customer books an appointment, the shop's current `reminderTimings` setting is copied into `reminderTimingsSnapshot` on the appointment record. This snapshot is immutable.

If the shop later changes its reminder settings, those changes apply only to new bookings. Existing appointments keep the timing that was in effect when they were booked.

**Why this matters:** A shop owner who changes from `['24h']` to `['2h', '24h']` should not suddenly trigger new 2h reminders for appointments booked weeks ago. Snapshots prevent this.

---

### R6 — Interval-aware logging: dedup tracks `appointment_id` + `interval`

Each `(appointment_id, interval)` pair may trigger a send exactly once. The dedup log must encode both dimensions.

- Email dedup key format: `appointment_reminder_{interval}:email:{appointmentId}`
  - e.g., `appointment_reminder_24h:email:abc123`
  - e.g., `appointment_reminder_10m:email:abc123`
- SMS: `messageLog` purpose field: `appointment_reminder_{interval}`

Without interval-awareness, a shop with `['10m', '24h']` configured would send the 10-minute reminder and then be blocked from sending the 24h reminder (or vice versa), because the dedup check would see "already sent for this appointment."

The 24h key format (`appointment_reminder_24h:email:{id}`) is identical to the current system's format, so existing sent records remain valid.

---

### R7 — All time calculations use shop timezone

"24 hours before" means 24 hours before the appointment in the **shop's timezone**, not UTC or the customer's timezone. Reminder windows are computed using `bookingSettings.timezone`.

This follows the existing pattern already established in the codebase. All appointment times are stored as UTC internally and converted to shop timezone for all business-logic calculations.

---

### R8 — Shop setting changes affect only new bookings

Changing the `reminderTimings` in settings never retroactively modifies existing appointments. The snapshot (R5) enforces this by design — the settings table and the appointments table are decoupled at booking time.

---

### R9 — UI enforces the max-3 limit with clear feedback

The settings form:
1. Disables any unchecked preset once 3 are selected (prevents a 4th selection)
2. Shows a "max 3 reached" banner when all 3 slots are full

This gives shop owners clear, immediate feedback rather than a silent failure or an error after submitting.

---

### R10 — Backward compatible with existing dedup keys and message logs

The system must not break reminders that have already been sent or are in-flight. Specifically:

- Existing `messageDedup` rows with keys like `appointment_reminder_24h:email:{id}` must remain valid. The new key format for 24h is identical, so no migration is needed for dedup records.
- Existing `messageLog` rows remain untouched. The new purpose field pattern is additive.

No existing appointment should receive a duplicate reminder as a result of this change.

---

### R11 — Fits within 1-2 week appetite

This feature must be deliverable within a 1-2 week cycle. Shapes that require new infrastructure (job queues, new tables with complex lifecycle management) are out of scope. Shape A was selected specifically because it extends the existing system in place rather than replacing it.

---

### R12 — System prevents reminder spam

The combination of R1 (max 3 intervals) and R6 (once-per-interval dedup) ensures a customer can receive at most 3 reminders per appointment and never receives the same reminder twice. No additional spam-prevention mechanism is needed beyond these two constraints.

---

### R13 — "Default-to-24h" Migration: existing shops must be backfilled

When the schema change is deployed, all existing shops that do not yet have `reminderTimings` set must be migrated to `['24h']`. Likewise, all existing booked appointments must have `reminderTimingsSnapshot` backfilled to `['24h']`.

**Why this is non-negotiable:** If existing shops are left with `NULL` or an empty array, the cron query `WHERE interval = ANY(reminderTimingsSnapshot)` will match nothing — silently dropping all reminders for those appointments. There is no error, no alert, customers just stop receiving reminders.

The migration SQL must include explicit `UPDATE` statements (not just column `DEFAULT`s) to cover all rows created before the migration:

```sql
UPDATE booking_settings SET reminder_timings = ARRAY['24h'] WHERE reminder_timings IS NULL;
UPDATE appointments SET reminder_timings_snapshot = ARRAY['24h']
  WHERE reminder_timings_snapshot IS NULL AND status = 'booked';
```

---

## What Is Explicitly Out of Scope

These were considered and deliberately excluded from this shape:

- **Per-event-type timing** — requires the Multiple Event Types feature first
- **Per-customer timing preferences** — requires customer segmentation
- **Time-of-day restrictions** — e.g., "only send between 9am–5pm"
- **Custom interval input** — e.g., "3.5 days before"
- **Different timing for SMS vs email** — one config, both channels
- **Analytics on reminder effectiveness** — separate feature
