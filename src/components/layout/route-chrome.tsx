"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type RouteChromeProps = {
  children: ReactNode;
};

const APP_ROUTE_PREFIXES = ["/app"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function RouteChrome({ children }: RouteChromeProps) {
  const pathname = usePathname();
  const isAppRoute = pathname
    ? APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    : false;
  const isAuthRoute = pathname ? AUTH_ROUTES.includes(pathname) : false;

  // BOUNDARY: auth-redesign limits auth pages to their dedicated shell and excludes marketing chrome.
  if (isAppRoute || isAuthRoute) {
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
