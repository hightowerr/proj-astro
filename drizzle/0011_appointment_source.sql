ALTER TABLE "appointments" ADD COLUMN "source" text;
ALTER TABLE "appointments" ADD COLUMN "source_slot_opening_id" uuid;

DO $$ BEGIN
  ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_source_slot_opening_id_slot_openings_id_fk"
    FOREIGN KEY ("source_slot_opening_id") REFERENCES "public"."slot_openings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "appointments_source_slot_opening_id_idx"
  ON "appointments" USING btree ("source_slot_opening_id");
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_source_check"
    CHECK ("source" in ('web', 'slot_recovery'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
