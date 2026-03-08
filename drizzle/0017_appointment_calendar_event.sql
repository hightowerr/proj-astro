ALTER TABLE "appointments"
  ADD COLUMN "calendar_event_id" text;

CREATE INDEX "idx_appointments_calendar_event_id"
  ON "appointments" ("calendar_event_id")
  WHERE "calendar_event_id" IS NOT NULL;

COMMENT ON COLUMN "appointments"."calendar_event_id" IS
  'Google Calendar event ID (from V2). Used for event updates and deletions.';
