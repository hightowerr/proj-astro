UPDATE "customers"
SET
	"phone" = COALESCE(
		"phone",
		'+1' || right(lpad(regexp_replace("id"::text, '[^0-9]', '', 'g'), 10, '0'), 10)
	),
	"email" = COALESCE(
		"email",
		'unknown+' || replace("id"::text, '-', '') || '@example.invalid'
	)
WHERE "phone" IS NULL OR "email" IS NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_slot_minutes_valid" CHECK ("booking_settings"."slot_minutes" in (15, 30, 45, 60, 90, 120));--> statement-breakpoint
ALTER TABLE "shop_hours" ADD CONSTRAINT "shop_hours_open_before_close" CHECK ("shop_hours"."open_time" < "shop_hours"."close_time");
