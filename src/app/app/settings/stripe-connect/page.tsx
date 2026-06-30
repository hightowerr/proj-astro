import { redirect } from "next/navigation";
import { StripeConnectCard } from "@/components/settings/stripe-connect-card";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function StripeConnectPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen font-manrope">
      <main className="mx-auto max-w-7xl px-12 py-8">
        <p className="al-eyebrow mb-4">Settings / Payments</p>

        <header className="mb-12 animate-fade-up">
          <h1 className="al-page-title mb-4">Payments</h1>
          <p className="al-lede max-w-2xl">
            Manage how you receive booking deposits.
          </p>
        </header>

        <StripeConnectCard
          initialStatus={shop.stripeOnboardingStatus}
          stripeAccountId={shop.stripeAccountId}
        />
      </main>
    </div>
  );
}
