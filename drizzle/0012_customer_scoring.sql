DO $$ BEGIN
  CREATE TYPE "tier" AS ENUM ('top', 'neutral', 'risk');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "risk_payment_mode" "payment_mode";
--> statement-breakpoint

ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "risk_deposit_amount_cents" integer;
--> statement-breakpoint

ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "top_deposit_waived" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "top_deposit_amount_cents" integer;
--> statement-breakpoint

ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "exclude_risk_from_offers" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "customer_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL,
  "shop_id" uuid NOT NULL,
  "score" integer NOT NULL,
  "tier" "tier" NOT NULL,
  "window_days" integer DEFAULT 180 NOT NULL,
  "stats" jsonb NOT NULL,
  "computed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "customer_scores"
    ADD CONSTRAINT "customer_scores_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "customer_scores"
    ADD CONSTRAINT "customer_scores_shop_id_shops_id_fk"
    FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "customer_scores_customer_shop_idx"
  ON "customer_scores" USING btree ("customer_id", "shop_id");
