# Implementation Review: Customizable Reminder Timing

## Architecture Overview
The system transition from a hardcoded 24h reminder to a flexible, multi-interval system.

### 1. Settings Persistence
- **Table**: `booking_settings`
- **Column**: `reminder_timings` (`text[]`)
- **Constraint**: Max 3 items. Validated in both the Zod schema (`src/app/app/settings/reminders/actions.ts`) and database check constraints.

### 2. Policy Snapshotting
To prevent behavior changing for existing bookings when a shop owner updates their settings, we capture a snapshot.
- **Table**: `appointments`
- **Column**: `reminder_timings_snapshot` (`text[]`)
- **Logic**: Written during `createAppointment` in `src/lib/queries/appointments.ts`. It defaults to `['24h']` if settings are missing.

### 3. The Multi-Interval Loop
Instead of one query for "24 hours from now", the cron jobs (`send-reminders` and `send-email-reminders`) now iterate over all 7 possible intervals:
```typescript
for (const interval of REMINDER_INTERVALS) {
  // 1. Calculate window for this specific interval
  // 2. Query where interval = ANY(reminder_timings_snapshot)
  // 3. Apply shouldSkipReminder helper
}
```

### 4. Deduplication Strategy
- **Email**: Uses `message_dedup` table with a key: `appointment_reminder_{interval}:email:{appointmentId}`.
- **SMS**: Checks `message_log` for an entry with `purpose = appointment_reminder_{interval}`.
- **Reasoning**: Email uses a "check-and-insert" dedup for high-volume safety; SMS uses the source-of-truth log to ensure idempotency across retries.

## Key Files
- `src/lib/reminders.ts`: Central source of truth for intervals and "skip" logic.
- `src/lib/queries/appointments.ts`: Contains the `find...` queries that power the cron jobs.
- `src/components/settings/reminder-timings-form.tsx`: The max-3 UI logic.
