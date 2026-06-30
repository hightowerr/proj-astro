import { NextResponse } from "next/server";
import { getShopByOwnerId } from "@/lib/queries/shops";
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

    if (
      !shop.stripeAccountId ||
      (shop.stripeOnboardingStatus !== "complete" &&
        shop.stripeOnboardingStatus !== "suspended")
    ) {
      return NextResponse.json(
        { error: "Stripe Connect onboarding is not complete" },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(
      shop.stripeAccountId
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("[stripe-connect/dashboard] Failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create Stripe dashboard link" },
      { status: 500 }
    );
  }
}
