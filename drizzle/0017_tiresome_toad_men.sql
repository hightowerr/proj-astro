CREATE TYPE "public"."appointment_event_type" AS ENUM('created', 'payment_succeeded', 'payment_failed', 'outcome_resolved', 'cancelled', 'refund_issued', 'refund_failed', 'dispute_opened');--> statement-breakpoint
CREATE TYPE "public"."appointment_financial_outcome" AS ENUM('unresolved', 'settled', 'voided', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('sms');--> statement-breakpoint
CREATE TYPE "public"."message_purpose" AS ENUM('booking_confirmation', 'cancellation_confirmation', 'slot_recovery_offer', 'appointment_reminder_24h');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."no_show_risk" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('top', 'neutral', 'risk');--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'ended';--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"type" "appointment_event_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "booking_manage_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_manage_tokens_appointment_id_unique" UNIQUE("appointment_id"),
	CONSTRAINT "booking_manage_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"calendar_id" text NOT NULL,
	"calendar_name" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"encryption_key_id" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_contact_prefs" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"preferred_channel" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_no_show_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"total_appointments" integer DEFAULT 0 NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"late_cancel_count" integer DEFAULT 0 NOT NULL,
	"on_time_cancel_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"last_no_show_at" timestamp with time zone,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"tier" "tier" NOT NULL,
	"window_days" integer DEFAULT 180 NOT NULL,
	"stats" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_dedup" (
	"dedup_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_log" (
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
CREATE TABLE "message_opt_outs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" "message_channel" NOT NULL,
	"opted_out_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"channel" "message_channel" NOT NULL,
	"body_template" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_opening_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_offers_channel_check" CHECK ("slot_offers"."channel" in ('sms')),
	CONSTRAINT "slot_offers_status_check" CHECK ("slot_offers"."status" in ('sent', 'accepted', 'expired', 'declined'))
);
--> statement-breakpoint
CREATE TABLE "slot_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"source_appointment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_openings_status_check" CHECK ("slot_openings"."status" in ('open', 'filled', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_source" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "financial_outcome" "appointment_financial_outcome" DEFAULT 'unresolved' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_score" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_risk" "no_show_risk";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_computed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "resolution_reason" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "last_event_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "source_slot_opening_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "booking_url" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD COLUMN "cancel_cutoff_minutes" integer DEFAULT 1440 NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD COLUMN "refund_before_cutoff" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "risk_payment_mode" "payment_mode";--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "risk_deposit_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "top_deposit_waived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "top_deposit_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "exclude_risk_from_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "exclude_high_no_show_from_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "resolution_grace_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "business_type" text;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_manage_tokens" ADD CONSTRAINT "booking_manage_tokens_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact_prefs" ADD CONSTRAINT "customer_contact_prefs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_no_show_stats" ADD CONSTRAINT "customer_no_show_stats_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_no_show_stats" ADD CONSTRAINT "customer_no_show_stats_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_scores" ADD CONSTRAINT "customer_scores_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_scores" ADD CONSTRAINT "customer_scores_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_opt_outs" ADD CONSTRAINT "message_opt_outs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_slot_opening_id_slot_openings_id_fk" FOREIGN KEY ("slot_opening_id") REFERENCES "public"."slot_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_openings" ADD CONSTRAINT "slot_openings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_openings" ADD CONSTRAINT "slot_openings_source_appointment_id_appointments_id_fk" FOREIGN KEY ("source_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_events_appointment_id_idx" ON "appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointment_events_appointment_occurred_idx" ON "appointment_events" USING btree ("appointment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_events_type_time_unique" ON "appointment_events" USING btree ("appointment_id","type","occurred_at");--> statement-breakpoint
CREATE INDEX "booking_manage_tokens_token_hash_idx" ON "booking_manage_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_one_active_per_shop" ON "calendar_connections" USING btree ("shop_id") WHERE "calendar_connections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_calendar_connections_shop_id" ON "calendar_connections" USING btree ("shop_id") WHERE "calendar_connections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_calendar_connections_deleted" ON "calendar_connections" USING btree ("deleted_at") WHERE "calendar_connections"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "customer_contact_prefs_sms_opt_in_idx" ON "customer_contact_prefs" USING btree ("sms_opt_in");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_no_show_stats_customer_shop_idx" ON "customer_no_show_stats" USING btree ("customer_id","shop_id");--> statement-breakpoint
CREATE INDEX "customer_no_show_stats_shop_id_idx" ON "customer_no_show_stats" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "customer_no_show_stats_customer_id_idx" ON "customer_no_show_stats" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_scores_customer_shop_idx" ON "customer_scores" USING btree ("customer_id","shop_id");--> statement-breakpoint
CREATE INDEX "message_log_shop_id_idx" ON "message_log" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "message_log_appointment_id_idx" ON "message_log" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "message_log_customer_id_idx" ON "message_log" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "message_opt_outs_customer_id_idx" ON "message_opt_outs" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_key_version_unique" ON "message_templates" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "message_templates_key_idx" ON "message_templates" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_offers_unique_customer" ON "slot_offers" USING btree ("slot_opening_id","customer_id");--> statement-breakpoint
CREATE INDEX "slot_offers_slot_idx" ON "slot_offers" USING btree ("slot_opening_id");--> statement-breakpoint
CREATE INDEX "slot_offers_customer_idx" ON "slot_offers" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "slot_offers_expiry_idx" ON "slot_offers" USING btree ("status","expires_at") WHERE "slot_offers"."status" = 'sent';--> statement-breakpoint
CREATE UNIQUE INDEX "slot_openings_unique_slot" ON "slot_openings" USING btree ("shop_id","starts_at");--> statement-breakpoint
CREATE INDEX "slot_openings_shop_status_idx" ON "slot_openings" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "slot_openings_source_idx" ON "slot_openings" USING btree ("source_appointment_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_last_event_id_appointment_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."appointment_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_source_slot_opening_id_slot_openings_id_fk" FOREIGN KEY ("source_slot_opening_id") REFERENCES "public"."slot_openings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_shop_ends_idx" ON "appointments" USING btree ("shop_id","ends_at");--> statement-breakpoint
CREATE INDEX "appointments_financial_outcome_idx" ON "appointments" USING btree ("financial_outcome");--> statement-breakpoint
CREATE INDEX "appointments_no_show_risk_idx" ON "appointments" USING btree ("no_show_risk");--> statement-breakpoint
CREATE INDEX "appointments_source_slot_opening_id_idx" ON "appointments" USING btree ("source_slot_opening_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_calendar_event_id" ON "appointments" USING btree ("calendar_event_id") WHERE "appointments"."calendar_event_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancellation_source_check" CHECK ("appointments"."cancellation_source" in ('customer', 'system', 'admin'));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_source_check" CHECK ("appointments"."source" in ('web', 'slot_recovery'));