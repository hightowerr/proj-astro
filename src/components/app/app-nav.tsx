"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const appNavLinks = [
  { href: "/app", label: "Shop" },
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/conflicts", label: "Conflicts" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/settings/availability", label: "Availability" },
  { href: "/app/settings/payment-policy", label: "Payment Policy" },
  { href: "/app/settings/calendar", label: "Calendar" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-white/10 bg-bg-dark-secondary/90">
      <nav className="container mx-auto flex gap-4 overflow-x-auto px-4 py-3" aria-label="App navigation">
        {appNavLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-md whitespace-nowrap px-2 py-1 text-sm font-medium underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark hover:text-white hover:underline",
                isActive
                  ? "text-white underline decoration-primary"
                  : "text-text-light-muted",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
