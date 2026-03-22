# Sanity Guidelines: Reminders Troubleshooting

## "Why didn't this customer get a reminder?"
Use this checklist to diagnose:
1.  **Appointment Status**: Is the appointment `booked`? (Reminders skip `pending` or `cancelled`).
2.  **Contact Prefs**: Does the customer have `emailOptIn` or `smsOptIn` set to `true`?
3.  **Lead Time**: Was the appointment booked *after* the reminder window? (e.g., booking at 10 AM for 2 PM won't send a 24h reminder).
4.  **Settings Snapshot**: Check the `reminder_timings_snapshot` column on the `appointments` row. Does it include the expected interval?
5.  **Dedup/Logs**:
    - Check the `message_log` table for the `appointmentId`.
    - Check `message_dedup` for `appointment_reminder_{interval}:email:{appointmentId}`.
6.  **SMS Risk**: High-risk customers get SMS reminders at *all* selected intervals. Neutral or Top tier customers only get emails.

## How to add a new interval (Developer)
1.  **Schema**: Add the new interval to the `reminderIntervalEnum` in `src/lib/schema.ts` and run `pnpm db:generate && pnpm db:migrate`.
2.  **Logic**: Add the new interval to the `parseReminderInterval` switch statement in `src/lib/reminders.ts`.
3.  **UI**: Add the new interval to the `PRESETS` array in `src/components/settings/reminder-timings-form.tsx`.

## Testing Changes
To test a new interval locally:
1.  Set the shop's reminder settings to include the new interval.
2.  Create a booking that starts at `now + interval`.
3.  Manually trigger the cron job via `curl` (requires `CRON_SECRET` header).
4.  Verify the `message_log` table.

## Warning: Advisory Locks
If a cron job is consistently returning `{ "skipped": true, "reason": "locked" }`, an advisory lock might be stuck.
- **Check**: `SELECT * FROM pg_locks WHERE locktype = 'advisory';`
- **Fix**: `SELECT pg_advisory_unlock(LOCK_ID);` (use the lock IDs from `IMPLEMENTATION_REVIEW.md`).
