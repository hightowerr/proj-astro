"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const appNavLinks = [
  { href: "/app", label: "Home Hub", icon: "home" },
  { href: "/app/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/app/appointments", label: "Appointments", icon: "calendar_month" },
  { href: "/app/settings/services", label: "Shop Catalog", icon: "inventory_2", fill: true },
  { href: "/app/conflicts", label: "Conflicts", icon: "warning" },
  { href: "/app/customers", label: "Customers", icon: "group" },
  { href: "/app/settings/availability", label: "Availability", icon: "schedule" },
];

const settingsLinks = [
  { href: "/app/settings/payment-policy", label: "Payment Policy", icon: "receipt_long" },
  { href: "/app/settings/calendar", label: "Calendar", icon: "calendar_today" },
  { href: "/app/settings/reminders", label: "Reminders", icon: "notifications" },
  { href: "/app/settings/billing", label: "Billing", icon: "payments" },
  { href: "/app/settings/stripe-connect", label: "Payments", icon: "credit_card" },
];

type AppNavProps = {
  user: {
    name: string;
    image?: string | null | undefined;
  };
  shopName: string;
  stripeOnboardingStatus?: string | null;
  hasServices?: boolean;
  hasAvailability?: boolean;
};

export function AppNav({ user, shopName, stripeOnboardingStatus, hasServices, hasAvailability }: AppNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showConnectDot = stripeOnboardingStatus !== "complete" && stripeOnboardingStatus !== "suspended" && hasServices && hasAvailability;

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const userImage = user.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuCa_trS9Ine5HoCiQQCIww3vhRLofOztZcc96P7wLZgtKZoK2AR59ciNVf-WfI8QiSqdwvhuw2UVcBkuVvWxaRsYcGyoyN0Bezb3OLgIZwdgHDzyynNLqZl387E5y6FUT3BNYYYMQvbDcFXu0UFNSdvvUnPxCtsR0IWHU8i3ziKO3fumlJpvhYp0ZCHT8Gjp90MbRpwP8KlzVVhkFTqVfdasEuFH6PqX_LSTTrjHV2PiSGekDJ2MMW5ULlBSd1FwhMz8k0pS09KmibE";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-background hidden lg:flex flex-col z-40">
        <div className="p-8">
          <div>
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">dashboard_customize</span>
              <span className="text-2xl font-extrabold tracking-widest uppercase font-manrope">
                {shopName}
              </span>
            </div>
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest opacity-70 mt-1">Studio Management</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {appNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[#003366] text-on-primary shadow-lg shadow-primary/10"
                    : "text-on-surface-variant hover:bg-al-surface-low"
                )}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontVariationSettings: isActive || link.fill ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {link.icon}
                </span>
                <span className={cn("font-medium", isActive && "font-bold")}>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-10 pb-4 px-4">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
              Settings
            </span>
          </div>

          {settingsLinks.map((link) => {
            const isActive = pathname === link.href;
            const isDotLink = link.href === "/app/settings/stripe-connect" && showConnectDot;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={isDotLink ? `${link.label} (setup required)` : link.label}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[#003366] text-on-primary shadow-lg shadow-primary/10"
                    : "text-on-surface-variant hover:bg-al-surface-low"
                )}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {link.icon}
                </span>
                <span className={cn("font-medium", isActive && "font-bold")}>{link.label}</span>
                {isDotLink && (
                  <span className="ml-auto relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-amber-500/30" style={{ padding: "4px", margin: "-4px" }} />
                    <span className="relative h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-al-outline-variant/10">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-4 rounded-xl p-2 -m-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              pathname === "/profile"
                ? "bg-[#003366] text-on-primary"
                : "hover:bg-al-surface-low"
            )}
          >
            <Image
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-al-surface-container"
              src={userImage}
              width={40}
              height={40}
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className={cn("text-sm font-bold truncate", pathname === "/profile" ? "text-on-primary" : "text-primary")}>{user.name}</p>
              <p className={cn("text-[10px] uppercase tracking-tighter", pathname === "/profile" ? "text-on-primary/70" : "text-on-surface-variant")}>Account & Profile</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-background/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="material-symbols-outlined text-al-primary" aria-hidden="true">menu</span>
            {showConnectDot && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-amber-500/30" style={{ padding: "2.5px", margin: "-2.5px" }} />
                <span className="relative h-2 w-2 rounded-full bg-amber-500" />
              </span>
            )}
          </button>
          <h1 className="text-xl font-extrabold tracking-widest text-primary uppercase font-manrope">
            {shopName}
          </h1>
        </div>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Your profile"
        >
          <Image
            alt="User profile"
            className="w-full h-full object-cover"
            src={userImage}
            width={40}
            height={40}
            referrerPolicy="no-referrer"
          />
        </Link>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="lg:hidden fixed left-0 top-0 h-full w-72 bg-background z-50 flex flex-col shadow-2xl"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-6 border-b border-al-outline-variant/20">
              <div className="flex items-center gap-3 text-primary">
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">dashboard_customize</span>
                <span className="text-lg font-extrabold tracking-widest uppercase font-manrope">{shopName}</span>
              </div>
              <button
                type="button"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label="Close navigation menu"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="material-symbols-outlined text-al-on-surface-variant" aria-hidden="true">close</span>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {appNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "bg-[#003366] text-on-primary shadow-lg shadow-primary/10"
                        : "text-on-surface-variant hover:bg-al-surface-low"
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                      style={{ fontVariationSettings: isActive || link.fill ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {link.icon}
                    </span>
                    <span className={cn("font-medium", isActive && "font-bold")}>{link.label}</span>
                  </Link>
                );
              })}

              <div className="pt-6 pb-2 px-4">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
                  Settings
                </span>
              </div>

              {settingsLinks.map((link) => {
                const isActive = pathname === link.href;
                const isDotLink = link.href === "/app/settings/stripe-connect" && showConnectDot;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-label={isDotLink ? `${link.label} (setup required)` : link.label}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "bg-[#003366] text-on-primary shadow-lg shadow-primary/10"
                        : "text-on-surface-variant hover:bg-al-surface-low"
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {link.icon}
                    </span>
                    <span className={cn("font-medium", isActive && "font-bold")}>{link.label}</span>
                    {isDotLink && (
                      <span className="ml-auto relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inset-0 rounded-full bg-amber-500/30" style={{ padding: "4px", margin: "-4px" }} />
                        <span className="relative h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Profile footer */}
            <div className="p-4 border-t border-al-outline-variant/10">
              <Link
                href="/profile"
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2 -m-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  pathname === "/profile" ? "bg-[#003366] text-on-primary" : "hover:bg-al-surface-low"
                )}
              >
                <Image
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-al-surface-container"
                  src={userImage}
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold truncate", pathname === "/profile" ? "text-on-primary" : "text-primary")}>{user.name}</p>
                  <p className={cn("text-[10px] uppercase tracking-tighter", pathname === "/profile" ? "text-on-primary/70" : "text-on-surface-variant")}>Account & Profile</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden bg-background/90 backdrop-blur-2xl fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0px_-10px_40px_rgba(0,0,0,0.05)]">
        <Link className="flex flex-col items-center justify-center text-on-surface-variant/60 px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg" href="/app">
          <span aria-hidden="true" className={cn("material-symbols-outlined", pathname === "/app" && "text-primary")}>home</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Hub</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant/60 px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg" href="/app/appointments">
          <span aria-hidden="true" className={cn("material-symbols-outlined", pathname === "/app/appointments" && "text-primary")}>calendar_today</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Book</span>
        </Link>
        <Link className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-6 py-2.5 transition-colors motion-safe:active:scale-90 shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="/app/settings/services">
          <span aria-hidden="true" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Catalog</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant/60 px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg" href="/app/settings/availability">
          <span aria-hidden="true" className={cn("material-symbols-outlined", pathname === "/app/settings/availability" && "text-primary")}>settings</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Shop</span>
        </Link>
      </nav>
    </>
  );
}
