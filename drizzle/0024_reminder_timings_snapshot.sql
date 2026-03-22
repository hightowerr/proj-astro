ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_timings_snapshot" text[] NOT NULL DEFAULT ARRAY['24h']::text[];--> statement-breakpoint
UPDATE "appointments"
SET "reminder_timings_snapshot" = ARRAY['24h']::text[]
WHERE "reminder_timings_snapshot" IS NULL
  AND "status" = 'booked';
