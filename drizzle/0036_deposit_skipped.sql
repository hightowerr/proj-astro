ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_skipped" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_deposit_skipped_check" CHECK ("deposit_skipped" IN ('connect_not_complete', 'policy_none'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
