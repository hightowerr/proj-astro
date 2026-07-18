ALTER TABLE "event_types" ADD CONSTRAINT "event_types_duration_minutes_max" CHECK ("event_types"."duration_minutes" <= 480);
