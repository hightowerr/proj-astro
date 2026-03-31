CREATE UNIQUE INDEX "event_types_one_default_per_shop_idx" ON "event_types" USING btree ("shop_id") WHERE "is_default" = true;
