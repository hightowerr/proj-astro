import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AtelierDashboard } from "@/components/dashboard/atelier-dashboard";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { auth } from "@/lib/auth";
import { getShopByOwnerId } from "@/lib/queries/shops";

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return <OnboardingFlow />;
  }

  const userName =
    session.user.name?.split(" ")[0] ??
    session.user.email?.split("@")[0] ??
    "there";

  const bookingUrl = `${appOrigin}/book/${shop.slug}`;

  return (
    <AtelierDashboard
      userName={userName}
      shopName={shop.name}
      shopSlug={shop.slug}
      bookingUrl={bookingUrl}
    />
  );
}
