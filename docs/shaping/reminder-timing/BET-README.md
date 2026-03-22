# Bet: Customizable Reminder Timing

This feature allows shop owners to configure up to 3 different reminder intervals for their appointments. It ensures that customers receive timely reminders, improving attendance and reducing no-shows.

## Problem
Previously, reminders were hardcoded to a single 24-hour window. This didn't suit all business types (e.g., therapists might want 48h, while phone-based services might want 10m).

## Solution
1.  **Customizable Settings**: Shop owners can choose up to 3 intervals from a preset list (`10m`, `1h`, `2h`, `4h`, `24h`, `48h`, `1w`).
2.  **Snapshotting**: The selected reminder intervals are "snapshotted" at the time of booking. This ensures that even if the shop owner changes their settings later, existing appointments follow the policy they were booked under.
3.  **Multi-Interval Cron**: The reminder cron jobs now iterate through all possible intervals and send reminders to eligible appointments.
4.  **Deduplication**: Multi-interval sending is guarded by a robust deduplication mechanism to prevent sending the same reminder multiple times for the same interval.

## Key Components

### UI
- **Settings Page**: `/app/settings/reminders` - Managed by `ReminderTimingsForm`.
- **Form Component**: `src/components/settings/reminder-timings-form.tsx`.

### Backend
- **Database Schema**:
    - `bookingSettings.reminderTimings`: Stores the shop's preferred intervals.
    - `appointments.reminderTimingsSnapshot`: Stores the intervals for a specific appointment.
- **Queries**:
    - `findAppointmentsForEmailReminder`: Queries appointments needing email reminders for any of the 7 preset intervals.
    - `findHighRiskAppointments`: Similar query for SMS reminders (restricted to high-risk customers).
- **Cron Jobs**:
    - `/api/jobs/send-email-reminders`: Sends emails.
    - `/api/jobs/send-reminders`: Sends SMS for high-risk customers.

### Logic
- **`shouldSkipReminder`**: A helper in `src/lib/reminders.ts` that prevents sending "future" reminders for appointments booked very close to their start time (e.g., booking 2 hours before shouldn't trigger a 24h reminder).
- **Dedup Keys**:
    - Email: `appointment_reminder_{interval}:email:{appointmentId}` in `message_dedup`.
    - SMS: Checks `message_log` for `purpose = appointment_reminder_{interval}`.

## Setup & Maintenance
- **Intervals**: The list of valid intervals is defined in `src/lib/reminders.ts`. Adding new intervals requires a schema migration and updating the UI presets.
- **Monitoring**: Check the `message_log` table to verify reminder delivery. The cron jobs return a summary of total, sent, and skipped messages.
