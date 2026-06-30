import { NextResponse } from "next/server";
import { getClientEnv } from "@/lib/env";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { getStripeClient } from "@/lib/stripe";

export async function GET() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;

  if (!shop?.stripeAccountId) {
    return NextResponse.redirect(
      new URL("/app/settings/stripe-connect?error=no-account", appUrl)
    );
  }

  try {
    const stripe = getStripeClient();

    const accountLink = await stripe.accountLinks.create({
      account: shop.stripeAccountId,
      refresh_url: `${appUrl}/api/settings/stripe-connect/refresh`,
      return_url: `${appUrl}/app/settings/stripe-connect?status=complete`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch {
    return NextResponse.redirect(
      new URL("/app/settings/stripe-connect?error=refresh-failed", appUrl)
    );
  }
}
