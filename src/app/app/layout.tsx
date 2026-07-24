import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppNav } from "@/components/app/app-nav";
import { PastDueBanner } from "@/components/past-due-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return children;
  }

  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return children;
  }

  const isPastDue = shop.subscriptionStatus === "past_due";

  const [hasServicesResult, hasAvailabilityResult] = await Promise.all([
    db.query.eventTypes.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.shopId, shop.id), eq(t.isActive, true)),
      columns: { id: true },
    }),
    db.query.shopHours.findFirst({
      where: (t, { eq }) => eq(t.shopId, shop.id),
      columns: { id: true },
    }),
  ]);

  return (
    <>
      <AppNav
        user={session.user}
        shopName={shop.name}
        stripeOnboardingStatus={shop.stripeOnboardingStatus}
        hasServices={!!hasServicesResult}
        hasAvailability={!!hasAvailabilityResult}
      />
      <div className="lg:pl-72 min-h-screen bg-al-surface-low">
        {isPastDue && <PastDueBanner />}
        {children}
      </div>
    </>
  );
}
