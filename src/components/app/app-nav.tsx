"use client";

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
  { href: "/app/settings/payment-policy", label: "Payment Policy", icon: "payments" },
  { href: "/app/settings/calendar", label: "Calendar", icon: "calendar_today" },
  { href: "/app/settings/reminders", label: "Reminders", icon: "notifications" },
];

type AppNavProps = {
  user: {
    name: string;
    image?: string | null | undefined;
  };
  shopName: string;
};

export function AppNav({ user, shopName }: AppNavProps) {
  const pathname = usePathname();

  if (pathname === "/app") {
    return null;
  }

  const userImage = user.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuCa_trS9Ine5HoCiQQCIww3vhRLofOztZcc96P7wLZgtKZoK2AR59ciNVf-WfI8QiSqdwvhuw2UVcBkuVvWxaRsYcGyoyN0Bezb3OLgIZwdgHDzyynNLqZl387E5y6FUT3BNYYYMQvbDcFXu0UFNSdvvUnPxCtsR0IWHU8i3ziKO3fumlJpvhYp0ZCHT8Gjp90MbRpwP8KlzVVhkFTqVfdasEuFH6PqX_LSTTrjHV2PiSGekDJ2MMW5ULlBSd1FwhMz8k0pS09KmibE";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-background hidden lg:flex flex-col z-40">
        <div className="p-8">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">dashboard_customize</span>
            <span className="text-xl font-extrabold tracking-widest uppercase font-manrope">
              {shopName}
            </span>
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
                  "flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
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
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
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
              </Link>
            );
          })}
        </nav>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Image
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-al-surface-container"
              src={userImage}
              width={40}
              height={40}
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{user.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Professional Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-background/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-al-primary" aria-hidden="true">menu</span>
          <h1 className="text-xl font-extrabold tracking-widest text-primary uppercase font-manrope">
            {shopName}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/10">
          <Image
            alt="User profile"
            className="w-full h-full object-cover"
            src={userImage}
            width={40}
            height={40}
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

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
