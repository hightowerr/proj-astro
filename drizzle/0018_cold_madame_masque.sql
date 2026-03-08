CREATE TABLE "calendar_conflict_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"calendar_event_id" text NOT NULL,
	"event_summary" text,
	"event_start" timestamp with time zone NOT NULL,
	"event_end" timestamp with time zone NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_conflict_alerts_severity_check" CHECK ("calendar_conflict_alerts"."severity" in ('full', 'high', 'partial', 'all_day')),
	CONSTRAINT "calendar_conflict_alerts_status_check" CHECK ("calendar_conflict_alerts"."status" in ('pending', 'dismissed', 'resolved', 'auto_resolved_past', 'auto_resolved_cancelled')),
	CONSTRAINT "calendar_conflict_alerts_resolved_by_check" CHECK ("calendar_conflict_alerts"."resolved_by" is null or "calendar_conflict_alerts"."resolved_by" in ('user', 'system_cancelled', 'system_past'))
);
--> statement-breakpoint
ALTER TABLE "calendar_conflict_alerts" ADD CONSTRAINT "calendar_conflict_alerts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_conflict_alerts" ADD CONSTRAINT "calendar_conflict_alerts_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_conflict_alerts_appointment_event_unique" ON "calendar_conflict_alerts" USING btree ("appointment_id","calendar_event_id");--> statement-breakpoint
CREATE INDEX "idx_conflict_alerts_shop_status" ON "calendar_conflict_alerts" USING btree ("shop_id","status") WHERE "calendar_conflict_alerts"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_conflict_alerts_created_at" ON "calendar_conflict_alerts" USING btree ("created_at");