# Performance Audit: Customizable Reminder Timing

## Cron Job Execution
- **Job Name**: `send-email-reminders` and `send-reminders`.
- **Frequency**: Every minute (standard).
- **Complexity**: O(N * M), where N is the number of intervals (fixed at 7) and M is the number of appointments per window.
- **SQL Performance**: Each interval query uses an `INDEX` on `startsAt` and checks the snapshot array using `ANY`.
- **Optimization**: The queries include a time window (`startsAt` between `now + interval - 60m` and `now + interval + 60m`), ensuring we only fetch a tiny subset of the database per loop.

## Locking & Concurrency
- **Lock Type**: PostgreSQL Advisory Locks (`pg_try_advisory_lock`).
- **Locks**:
  - `send-reminders`: Lock ID `482178`.
  - `send-email-reminders`: Lock ID `202603171`.
- **Benefit**: Ensures only one instance of the job runs at a time, preventing duplicate sends even if the job takes longer than a minute.

## Database Impact
- **Snapshot Column**: Each appointment row now stores a small array of strings (e.g., `['24h', '1h']`).
- **Impact**: Minimal storage overhead (estimated <50 bytes per row).
- **Indexing**: Currently, the snapshot is filtered with `ANY` in the `WHERE` clause. As volume scales, a GIN index on `reminder_timings_snapshot` may be required.

## External API Dependencies
- **Resend (Email)**: Rate limited at the account level.
- **Twilio (SMS)**: Rate limited by phone number throughput (standard 1 MPS for long codes).
- **Error Handling**: The cron jobs catch individual send errors and report them in the JSON response summary.
