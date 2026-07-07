import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { shops } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { getStripeClient } from "@/lib/stripe";

export async function GET() {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return NextResponse.json(
        { error: "No shop found for user" },
        { status: 404 }
      );
    }

    if (!shop.stripeAccountId) {
      return NextResponse.json({ status: "not_started" });
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(shop.stripeAccountId);

    // Promote local status from pending to complete if Stripe confirms
    let currentStatus = shop.stripeOnboardingStatus;
    if (
      account.details_submitted &&
      account.charges_enabled &&
      currentStatus === "pending"
    ) {
      currentStatus = "complete";
      await db
        .update(shops)
        .set({
          stripeOnboardingStatus: "complete",
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shop.id));
    }

    return NextResponse.json({
      status: currentStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error("[stripe-connect/status] Failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to retrieve Stripe Connect status" },
      { status: 500 }
    );
  }
}
