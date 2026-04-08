DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_10m';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_1h';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_2h';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_4h';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_48h';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."message_purpose" ADD VALUE 'appointment_reminder_1w';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
