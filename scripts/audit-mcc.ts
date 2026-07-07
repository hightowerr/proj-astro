#!/usr/bin/env tsx

/**
 * One-time audit: compare each shop's Stripe-assigned MCC against the
 * platform's expected MCC from getMccForBusinessType().
 *
 * Read-only — no data is modified.
 *
 * Usage: npx tsx scripts/audit-mcc.ts
 */

import "dotenv/config";

import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { getMccForBusinessType } from "@/lib/mcc-mapping";
import { shops } from "@/lib/schema";
import { getStripeClient } from "@/lib/stripe";

async function main() {
  const stripe = getStripeClient();

  const shopsWithStripe = await db
    .select({
      id: shops.id,
      slug: shops.slug,
      businessType: shops.businessType,
      stripeAccountId: shops.stripeAccountId,
    })
    .from(shops)
    .where(isNotNull(shops.stripeAccountId));

  if (shopsWithStripe.length === 0) {
    console.warn("[MCC Audit] No shops with Stripe accounts found.");
    return;
  }

  let matches = 0;
  let mismatches = 0;

  for (const shop of shopsWithStripe) {
    const expectedMcc = getMccForBusinessType(shop.businessType);

    try {
      const account = await stripe.accounts.retrieve(shop.stripeAccountId!);
      const stripeMcc = account.business_profile?.mcc ?? "unknown";
      const isMatch = stripeMcc === expectedMcc;

      if (isMatch) {
        matches++;
      } else {
        mismatches++;
      }

      console.warn(
        `[MCC Audit] Shop: ${shop.slug} (${shop.businessType ?? "null"}) — expected: ${expectedMcc}, stripe: ${stripeMcc}, match: ${isMatch ? "\u2713" : "\u2717 MISMATCH"}`
      );
    } catch (err) {
      console.error(
        `[MCC Audit] Failed to retrieve Stripe account for ${shop.slug} (${shop.stripeAccountId}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.warn(
    `[MCC Audit] Summary: ${shopsWithStripe.length} checked, ${matches} match, ${mismatches} mismatch`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("[MCC Audit] Fatal error:", err);
  process.exit(1);
});
