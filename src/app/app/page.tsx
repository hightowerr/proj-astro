import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BookingManagementChoice } from "@/components/dashboard/booking-management-choice";
import { ShopOverviewCard } from "@/components/dashboard/shop-overview-card";
import { SuccessBanner } from "@/components/dashboard/success-banner";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { auth } from "@/lib/auth";
import { getBusinessTypeInfo } from "@/lib/business-types";
import { getShopByOwnerId } from "@/lib/queries/shops";

export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return <OnboardingFlow />;
  }

  const { label: businessTypeLabel } = getBusinessTypeInfo(shop.businessType);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        <SuccessBanner businessTypeName={businessTypeLabel} shopId={shop.id} />

        <div className="space-y-6">
          <BookingManagementChoice />
          <ShopOverviewCard shopName={shop.name} shopSlug={shop.slug} businessType={shop.businessType} />
        </div>
      </div>
    </div>
  );
}
