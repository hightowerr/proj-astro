# 02 — Migration: Connect Columns

## Summary
SQL migration to add Stripe Connect columns to the `shops` table.

## Prerequisites
None (can be written independently of the schema.ts change, but must match it).

## Changes

**New file:** `drizzle/0035_stripe_connect.sql`

```sql
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
```

Also update `drizzle/meta/_journal.json` and generate the corresponding snapshot in `drizzle/meta/`.

## Acceptance
- Migration runs cleanly on a fresh DB and on the existing dev DB
- `drizzle-kit push` or `drizzle-kit migrate` succeeds
- Existing shops get `stripe_onboarding_status = 'not_started'` and null for the other two columns
