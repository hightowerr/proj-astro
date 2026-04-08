# Learning Log: /src Code Patterns for PM → Developer

**Audience:** PM learning to code (knows Python, learning JavaScript/TypeScript)
**Date:** 2026-03-22 (Updated)
**Codebase:** Astro Booking System (Next.js 16, TypeScript, PostgreSQL)

---

## 1. Patterns to Memorise

### Pattern 1: The Configuration Snapshot (Immutability)
- **Why it matters:** Users expect that when they book something, the "rules" (like reminder times) are locked in. If a shop owner changes their settings later, it shouldn't retroactively change the behavior of existing bookings.
- **Where it appeared:** `src/lib/queries/appointments.ts` -> `createAppointment()`. We capture `reminderTimingsSnapshot` from the shop's settings at the moment of booking.
- **How to reuse it:** Whenever a requirement says **"Changes apply to new bookings only"** (Requirement R8 in our shaping doc), you must copy the relevant settings into the record itself during creation.

### Pattern 2: The Multi-Interval Cron Loop
- **Why it matters:** Handling reminders at different times (24h, 2h, 10m) usually tempts developers to write a massive, complex SQL query. Instead, looping through a list of intervals and running a simple query for each is much easier to read, test, and debug.
- **Where it appeared:** `src/lib/queries/appointments.ts` -> `findHighRiskAppointments()` and `findAppointmentsForEmailReminder()`.
- **How to reuse it:** When you have a list of relative time offsets (e.g., "send at 1 day, 1 hour, and 10 mins"), don't build one "God Query." Loop through the intervals and handle them one by one.

### Pattern 3: Contextual Deduplication Keys
- **Why it matters:** A generic dedup key like `reminder:email:123` would prevent the 2h reminder if the 24h reminder already sent. By including the *context* (the interval) in the key, you allow the system to send multiple distinct messages for the same event.
- **Where it appeared:** `src/lib/messages.ts` -> `sendAppointmentReminderEmail()`. We used `appointment_reminder_${interval}:email:${id}`.
- **How to reuse it:** If an event (an appointment) can trigger multiple notifications, your "Already Sent" check *must* include the specific reason or interval in its unique ID.

---

## 2. Anti-Pattern to Avoid

### Disparate Deduplication Strategies
- **What happened:** In this bet, Email reminders used the atomic `message_dedup` table (the "Zod Guard" of sending), but SMS reminders used a "Check-then-Write" pattern in `checkReminderAlreadySent`. 
- **Why to avoid it:** This creates a "Race Condition" risk. If two SMS crons ran at the exact same millisecond, they might both see "not sent" and send duplicate texts. Email is safe because the database itself blocks the second insert.
- **What to do instead:** Standardize on a single, atomic deduplication pattern (like the `message_dedup` table) for all communication channels.

---

## 3. Hardest Technical Decision Explained Simply

- **Decision:** Should we add columns to the `appointments` table (Shape A) or create a whole new `appointment_reminders` schedule table (Shape B)?
- **Plain-English explanation:** Imagine you have a calendar and you want to set 3 alarms for a meeting. 
    - **Shape A** is like writing "Alarm at 24h, 2h, 10m" in the notes of the calendar event itself. Every time you look at the event, you check if you should ring an alarm.
    - **Shape B** is like making 3 separate sticky notes and putting them on a "To-Do" wall sorted by time. You just look at the wall and do whatever is at the top.
- **Trade-off:** Shape B is "cleaner" and faster to query, but it requires much more work to set up and keep in sync if an appointment is moved or cancelled. Shape A is slightly slower to query but much simpler to build and keep accurate.
- **What the simpler but worse option would have been:** Just querying the shop's *current* settings every time the cron runs. This would be "worse" because if a shop owner changed their settings, every old appointment would suddenly follow the new rules, breaking the user's expectations.

---

## 4. What to Recognise Earlier Next Time

- **Signal 1: "Apply to new only"**: This is a loud signal for **Snapshotting**. Don't wait until the implementation phase to decide where to store the snapshot; put it in the schema during shaping.
- **Signal 2: "Multiple touchpoints"**: If you hear "send a reminder at X and Y," immediately think **Contextual Dedup**. Your current "one-and-done" messaging system will need to be updated to handle specific intervals.
- **Signal 3: "Relative Time Offsets"**: When a feature depends on "X minutes before Y happens," look for the **Skip Logic** smell. You'll need a helper like `shouldSkipReminder` to handle cases where someone books an appointment *after* a reminder window has already passed.

---

*Note: Content below this line is preserved from previous logs.*

---

## 5. Three Patterns to Memorize for Next Time (March 19)

### Pattern 1: Input Validation at API Boundaries (The Zod Guard)
**Where I saw it:** `src/app/api/bookings/create/route.ts:20-30`
**Why it matters:** Never trust user input. Think of Zod schemas as **"contracts at the gate"**.

### Pattern 2: Message/Template Versioning System (The Time Machine)
**Where I saw it:** `src/lib/messages.ts:14-80`
**Why it matters:** Versioning allows you to change templates without breaking old appointments. This is like **"track changes" for messages**.

### Pattern 3: Database Transactions (The All-or-Nothing Promise)
**Where I saw it:** `src/lib/queries/appointments.ts:630-850`
**Why it matters:** Transactions are like **"undo if anything goes wrong"**. No payment = No appointment.

---

## 6. One Anti-Pattern We Used (That I Should Avoid)

### Anti-Pattern: The "God Function" (Functions That Do Too Much)
**Where I saw it:** `src/lib/queries/appointments.ts` - `createAppointment()` (220 lines).
**Why it's bad:** Impossible to test, hard to debug, and violates the **Single Responsibility Principle**. Break big meetings into focused 30-minute sessions; break big functions into focused helpers.
