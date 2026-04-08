ALTER TABLE "booking_settings" ADD COLUMN IF NOT EXISTS "default_buffer_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_settings_default_buffer_minutes_valid'
  ) THEN
    ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_default_buffer_minutes_valid" CHECK ("booking_settings"."default_buffer_minutes" in (0, 5, 10));
  END IF;
END $$;