"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type RouteChromeProps = {
  children: ReactNode;
};

const APP_ROUTE_PREFIXES = ["/app"];

export function RouteChrome({ children }: RouteChromeProps) {
  const pathname = usePathname();
  const isAppRoute = pathname
    ? APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    : false;

  if (isAppRoute) {
    return <main id="main-content">{children}</main>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="pt-16">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
