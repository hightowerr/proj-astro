CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shop_id" uuid NOT NULL REFERENCES "shops"("id") ON DELETE cascade,
  "calendar_id" text NOT NULL,
  "calendar_name" text NOT NULL,
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text NOT NULL,
  "token_expires_at" timestamp with time zone NOT NULL,
  "encryption_key_id" text DEFAULT 'default' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_one_active_per_shop"
  ON "calendar_connections" ("shop_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_calendar_connections_shop_id"
  ON "calendar_connections" ("shop_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_calendar_connections_deleted"
  ON "calendar_connections" ("deleted_at")
  WHERE "deleted_at" IS NOT NULL;
