CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "processed_polar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "last_webhook_event_at" timestamp with time zone;