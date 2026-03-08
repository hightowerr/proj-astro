import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppNav } from "@/components/app/app-nav";
import { auth } from "@/lib/auth";
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

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
