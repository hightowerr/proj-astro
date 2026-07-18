DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_types_duration_minutes_max'
  ) THEN
    ALTER TABLE "event_types" ADD CONSTRAINT "event_types_duration_minutes_max" CHECK ("event_types"."duration_minutes" <= 480);
  END IF;
END $$;
