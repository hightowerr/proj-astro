DO $$ BEGIN
	CREATE TYPE "public"."message_channel" AS ENUM('sms');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."message_purpose" AS ENUM('booking_confirmation');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'failed');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_contact_prefs" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"preferred_channel" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"channel" "message_channel" NOT NULL,
	"body_template" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" "message_channel" NOT NULL,
	"purpose" "message_purpose" NOT NULL,
	"to_phone" text NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"status" "message_status" NOT NULL,
	"body_hash" text NOT NULL,
	"template_id" uuid,
	"template_key" text NOT NULL,
	"template_version" integer NOT NULL,
	"rendered_body" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_dedup" (
	"dedup_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_opt_outs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" "message_channel" NOT NULL,
	"opted_out_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "customer_contact_prefs" ADD CONSTRAINT "customer_contact_prefs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "message_log" ADD CONSTRAINT "message_log_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "message_log" ADD CONSTRAINT "message_log_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "message_log" ADD CONSTRAINT "message_log_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "message_log" ADD CONSTRAINT "message_log_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "message_opt_outs" ADD CONSTRAINT "message_opt_outs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_templates_key_version_unique" ON "message_templates" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_key_idx" ON "message_templates" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_log_shop_id_idx" ON "message_log" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_log_appointment_id_idx" ON "message_log" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_log_customer_id_idx" ON "message_log" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_opt_outs_customer_id_idx" ON "message_opt_outs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_contact_prefs_sms_opt_in_idx" ON "customer_contact_prefs" USING btree ("sms_opt_in");
