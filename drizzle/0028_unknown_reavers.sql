CREATE TABLE "event_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"deposit_amount_cents" integer,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_types_buffer_minutes_valid" CHECK ("event_types"."buffer_minutes" in (0, 5, 10)),
	CONSTRAINT "event_types_duration_minutes_positive" CHECK ("event_types"."duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "event_type_id" uuid;--> statement-breakpoint
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_types_shop_id_idx" ON "event_types" USING btree ("shop_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_event_type_id_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_event_type_id_idx" ON "appointments" USING btree ("event_type_id");