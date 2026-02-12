ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "booking_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;
