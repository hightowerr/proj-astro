"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const appNavLinks = [
  { href: "/app", label: "Shop" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/settings/availability", label: "Availability" },
  { href: "/app/settings/payment-policy", label: "Payment Policy" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b bg-background/95">
        <nav
          className="container mx-auto flex gap-4 overflow-x-auto px-4 py-3"
          aria-label="App navigation"
        >
          {appNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="whitespace-nowrap text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
