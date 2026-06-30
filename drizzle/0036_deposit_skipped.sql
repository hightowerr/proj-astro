ALTER TABLE "appointments" ADD COLUMN "deposit_skipped" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_deposit_skipped_check" CHECK ("deposit_skipped" IN ('connect_not_complete', 'policy_none'));
