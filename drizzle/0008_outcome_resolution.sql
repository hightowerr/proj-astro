DO $$ BEGIN
	CREATE TYPE "public"."appointment_financial_outcome" AS ENUM('unresolved', 'settled', 'voided', 'refunded', 'disputed');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."appointment_event_type" AS ENUM('created', 'payment_succeeded', 'payment_failed', 'outcome_resolved', 'cancelled', 'refund_issued', 'refund_failed', 'dispute_opened');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN IF NOT EXISTS "resolution_grace_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "financial_outcome" "appointment_financial_outcome" DEFAULT 'unresolved' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "resolution_reason" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "last_event_id" uuid;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"type" "appointment_event_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "appointments" ADD CONSTRAINT "appointments_last_event_id_appointment_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."appointment_events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_shop_ends_idx" ON "appointments" USING btree ("shop_id","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_financial_outcome_idx" ON "appointments" USING btree ("financial_outcome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_events_appointment_id_idx" ON "appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_events_appointment_occurred_idx" ON "appointment_events" USING btree ("appointment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_events_type_time_unique" ON "appointment_events" USING btree ("appointment_id","type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_events_outcome_unique" ON "appointment_events" USING btree ("appointment_id") WHERE "type" = 'outcome_resolved';
