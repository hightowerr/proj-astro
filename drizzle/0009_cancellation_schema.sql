DO $$ BEGIN
	ALTER TYPE "public"."appointment_status" ADD VALUE IF NOT EXISTS 'ended';
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD COLUMN IF NOT EXISTS "cancel_cutoff_minutes" integer DEFAULT 1440 NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD COLUMN IF NOT EXISTS "refund_before_cutoff" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancellation_source" text;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancellation_source_check" CHECK ("cancellation_source" IN ('customer', 'system', 'admin'));
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_manage_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_manage_tokens_appointment_id_unique" UNIQUE("appointment_id"),
	CONSTRAINT "booking_manage_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "booking_manage_tokens" ADD CONSTRAINT "booking_manage_tokens_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_manage_tokens_token_hash_idx" ON "booking_manage_tokens" USING btree ("token_hash");
