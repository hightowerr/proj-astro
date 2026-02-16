import type { ReactNode } from "react";
import Link from "next/link";

const appNavLinks = [
  { href: "/app", label: "Shop" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/settings/payment-policy", label: "Payment Policy" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b bg-background/95">
        <div className="container mx-auto flex gap-4 overflow-x-auto px-4 py-3">
          {appNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </>
  );
}
