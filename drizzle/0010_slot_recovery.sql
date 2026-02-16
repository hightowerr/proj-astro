CREATE TABLE IF NOT EXISTS "slot_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"source_appointment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_openings_unique_slot" UNIQUE("shop_id","starts_at"),
	CONSTRAINT "slot_openings_status_check" CHECK ("status" in ('open', 'filled', 'expired'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "slot_openings" ADD CONSTRAINT "slot_openings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "slot_openings" ADD CONSTRAINT "slot_openings_source_appointment_id_appointments_id_fk" FOREIGN KEY ("source_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_openings_shop_status_idx" ON "slot_openings" USING btree ("shop_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_openings_source_idx" ON "slot_openings" USING btree ("source_appointment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slot_offers" (
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
	CONSTRAINT "slot_offers_unique_customer" UNIQUE("slot_opening_id","customer_id"),
	CONSTRAINT "slot_offers_channel_check" CHECK ("channel" in ('sms')),
	CONSTRAINT "slot_offers_status_check" CHECK ("status" in ('sent', 'accepted', 'expired', 'declined'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_slot_opening_id_slot_openings_id_fk" FOREIGN KEY ("slot_opening_id") REFERENCES "public"."slot_openings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_offers_slot_idx" ON "slot_offers" USING btree ("slot_opening_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_offers_customer_idx" ON "slot_offers" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_offers_expiry_idx" ON "slot_offers" USING btree ("status","expires_at") WHERE "slot_offers"."status" = 'sent';
