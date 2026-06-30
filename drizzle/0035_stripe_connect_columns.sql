DO $$ BEGIN
  CREATE TYPE "stripe_onboarding_status" AS ENUM ('not_started', 'pending', 'complete');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "shops"
  ADD COLUMN "stripe_account_id" text,
  ADD COLUMN "stripe_onboarding_status" "stripe_onboarding_status" DEFAULT 'not_started' NOT NULL,
  ADD COLUMN "stripe_account_created_at" timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS "shops_stripe_account_id_unique"
  ON "shops" ("stripe_account_id")
  WHERE "stripe_account_id" IS NOT NULL;
