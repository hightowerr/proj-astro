ALTER TABLE "shop_policies"
  ADD COLUMN IF NOT EXISTS "exclude_high_no_show_from_offers" boolean DEFAULT false NOT NULL;
