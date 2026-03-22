ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_settings_reminder_timings_max";--> statement-breakpoint
ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_settings_reminder_timings_min";--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_max" CHECK (cardinality("booking_settings"."reminder_timings") <= 3);--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_reminder_timings_min" CHECK (cardinality("booking_settings"."reminder_timings") >= 1);
