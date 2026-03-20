ALTER TABLE "policy_versions" ADD COLUMN "resolution_grace_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "cancel_cutoff_minutes" integer DEFAULT 1440 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_policies" ADD COLUMN "refund_before_cutoff" boolean DEFAULT true NOT NULL;