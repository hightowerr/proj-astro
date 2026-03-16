CREATE TYPE "public"."appointment_confirmation_status" AS ENUM('none', 'pending', 'confirmed', 'expired');--> statement-breakpoint
ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_confirmation_request';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmation_status" "appointment_confirmation_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmation_deadline" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "appointments_confirmation_pending_idx" ON "appointments" USING btree ("confirmation_status","confirmation_deadline") WHERE "appointments"."confirmation_status" = 'pending';--> statement-breakpoint
CREATE INDEX "appointments_confirmation_none_idx" ON "appointments" USING btree ("shop_id","confirmation_status","starts_at") WHERE "appointments"."confirmation_status" = 'none';