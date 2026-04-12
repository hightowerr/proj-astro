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
  { href: "/app/settings/services", label: "Services" },
  { href: "/app/settings/payment-policy", label: "Payment Policy" },
  { href: "/app/settings/calendar", label: "Calendar" },
  { href: "/app/settings/reminders", label: "Reminders" },
];

export function AppNav() {
  const pathname = usePathname();

  if (pathname === "/app") {
    return null;
  }

  return (
    <div
      className="border-b"
      style={{
        background: "var(--al-surface-container-lowest)",
        borderColor: "var(--al-outline-variant)",
      }}
    >
      <nav className="container mx-auto flex gap-4 overflow-x-auto px-4 py-3" aria-label="App navigation">
        {appNavLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-md whitespace-nowrap px-2 py-1 text-sm font-medium underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:underline",
                isActive ? "font-bold underline" : "",
              )}
              style={{
                color: isActive ? "var(--al-primary)" : "var(--al-on-surface-variant)",
                textDecorationColor: isActive ? "var(--al-primary)" : undefined,
                outlineColor: "var(--al-primary)",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
