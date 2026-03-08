"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const appNavLinks = [
  { href: "/app", label: "Shop" },
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
              className="whitespace-nowrap text-sm font-medium text-text-light-muted underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
