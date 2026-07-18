ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "transfer_held" boolean DEFAULT false NOT NULL;
