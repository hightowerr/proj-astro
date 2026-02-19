DO $$ BEGIN
  CREATE TYPE "public"."no_show_risk" AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "public"."message_purpose" ADD VALUE IF NOT EXISTS 'cancellation_confirmation';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "public"."message_purpose" ADD VALUE IF NOT EXISTS 'slot_recovery_offer';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "public"."message_purpose" ADD VALUE IF NOT EXISTS 'appointment_reminder_24h';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "customer_no_show_stats" (
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

DO $$ BEGIN
  ALTER TABLE "customer_no_show_stats"
    ADD CONSTRAINT "customer_no_show_stats_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "customer_no_show_stats"
    ADD CONSTRAINT "customer_no_show_stats_shop_id_shops_id_fk"
    FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "customer_no_show_stats_customer_shop_idx"
  ON "customer_no_show_stats" USING btree ("customer_id", "shop_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "customer_no_show_stats_shop_id_idx"
  ON "customer_no_show_stats" USING btree ("shop_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "customer_no_show_stats_customer_id_idx"
  ON "customer_no_show_stats" USING btree ("customer_id");
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "no_show_score" integer;
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "no_show_risk" "no_show_risk";
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "no_show_computed_at" timestamp with time zone;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "appointments_no_show_risk_idx"
  ON "appointments" USING btree ("no_show_risk");
