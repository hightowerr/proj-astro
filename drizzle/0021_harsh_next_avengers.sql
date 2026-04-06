ALTER TYPE "public"."message_channel" ADD VALUE 'email';--> statement-breakpoint
DROP INDEX "message_templates_key_version_unique";--> statement-breakpoint
DROP INDEX "message_templates_key_idx";--> statement-breakpoint
ALTER TABLE "customer_contact_prefs" ADD COLUMN "email_opt_in" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "message_templates" ADD COLUMN "subject_template" text;--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_key_channel_version_unique" ON "message_templates" USING btree ("key","channel","version");--> statement-breakpoint
CREATE INDEX "message_templates_key_channel_idx" ON "message_templates" USING btree ("key","channel");