-- NOTE:
-- This migration originally contained a duplicated full-schema snapshot that
-- re-created types/tables introduced by earlier migrations, which caused
-- production failures (e.g. "type ... already exists"). Keep this migration
-- narrowly scoped and idempotent.

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "calendar_event_id" text;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_appointments_calendar_event_id"
  ON "appointments" ("calendar_event_id")
  WHERE "calendar_event_id" IS NOT NULL;
--> statement-breakpoint

COMMENT ON COLUMN "appointments"."calendar_event_id" IS
  'Google Calendar event ID. Used for event updates and deletions.';
