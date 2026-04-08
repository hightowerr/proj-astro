UPDATE "booking_settings"
SET "reminder_timings" = ARRAY['24h']::text[]
WHERE cardinality("reminder_timings") = 0;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'booking_settings'::regclass
      AND conname = 'booking_settings_reminder_timings_max'
  ) THEN
    ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_settings_reminder_timings_max";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'booking_settings'::regclass
      AND conname = 'booking_settings_reminder_timings_min'
  ) THEN
    ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_settings_reminder_timings_min";
  END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_max" CHECK (cardinality("booking_settings"."reminder_timings") <= 3);--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_min" CHECK (cardinality("booking_settings"."reminder_timings") >= 1);
