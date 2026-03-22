ALTER TABLE "booking_settings" ADD COLUMN "reminder_timings" text[] DEFAULT ARRAY['24h']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_max" CHECK (array_length("booking_settings"."reminder_timings", 1) <= 3);--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_min" CHECK (array_length("booking_settings"."reminder_timings", 1) >= 1);--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_valid" CHECK ("booking_settings"."reminder_timings" <@ ARRAY['10m','1h','2h','4h','24h','48h','1w']::text[]);--> statement-breakpoint
UPDATE "booking_settings" SET "reminder_timings" = ARRAY['24h']::text[] WHERE "reminder_timings" IS NULL;
