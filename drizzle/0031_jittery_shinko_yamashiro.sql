ALTER TABLE "event_types" ALTER COLUMN "buffer_minutes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "event_types" ALTER COLUMN "buffer_minutes" DROP NOT NULL;