import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getClientEnv } from "@/lib/env";
import { getMccForBusinessType } from "@/lib/mcc-mapping";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { shops } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { getStripeClient } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return NextResponse.json(
        { error: "No shop found for user" },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;

    // Already onboarded — return Stripe dashboard login link
    if (
      shop.stripeAccountId &&
      shop.stripeOnboardingStatus === "complete"
    ) {
      const loginLink = await stripe.accounts.createLoginLink(
        shop.stripeAccountId
      );
      return NextResponse.json({ url: loginLink.url });
    }

    let accountId = shop.stripeAccountId;

    // No account yet — create a new Express account
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        default_currency: "gbp",
        metadata: { shopId: shop.id, shopSlug: shop.slug },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: getMccForBusinessType(shop.businessType),
          url: `${appUrl}/book/${shop.slug}`,
        },
      });

      accountId = account.id;

      await db
        .update(shops)
        .set({
          stripeAccountId: accountId,
          stripeOnboardingStatus: "pending",
          stripeAccountCreatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shop.id));
    }

    // Create an Account Link for onboarding (new account or resumed pending)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/settings/stripe-connect/refresh`,
      return_url: `${appUrl}/app/settings/stripe-connect?status=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[stripe-connect/create-account] Failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}
