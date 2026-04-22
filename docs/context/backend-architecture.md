# Backend Architecture & Systems

## Database Conventions
* **IDs:** Use `uuid().primaryKey().defaultRandom()` for all new tables. (Exception: Better Auth tables use `text("id")`).
* **Timestamps:** * Created: `timestamp("created_at").defaultNow().notNull()`
  * Updated: `timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()`
* **Changes:** Never use `db:push` in production. Always run `pnpm db:generate`, review the SQL, and then `pnpm db:migrate`.

## Background Jobs & Cron
All cron jobs require `x-cron-secret` header authentication. 
* **Key Jobs:** `resolve-outcomes`, `offer-loop`, `expire-offers`, `recompute-scores`, `send-reminders`.
* **Resolver Safety:** The outcomes resolver MUST strictly filter by `eq(appointments.status, "booked")` to avoid overwriting cancelled appointments.
* **Locks:** * Jobs use `pg_try_advisory_lock` to prevent concurrent execution overlapping.
  * Slot recovery uses Upstash Redis locks to prevent duplicate offers.

## Customer Identity & Links
* **Phones:** Primary identifier. Always parsed and validated using `libphonenumber-js`. Mobile is required for SMS.
* **Manage Links:** Uses SHA256-hashed tokens. 90-day expiry. Raw token is displayed ONLY once at the booking confirmation step.

## Calendar Integration
* **Conflict Scanning:** `scan-calendar-conflicts` caches Google Calendar events locally (`calendarEventCache` table) to reduce API calls and flags overlaps for the shop owner.