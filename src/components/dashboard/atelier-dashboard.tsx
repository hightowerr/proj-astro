"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type AtelierDashboardProps = {
  userName: string;
  shopName: string;
  shopSlug: string;
  bookingUrl: string;
};

const primaryLinks = [
  { href: "/app", label: "Home Hub", icon: LayoutDashboard, active: true },
  { href: "/app/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/app/settings/services", label: "Shop Catalog", icon: Package },
  { href: "/app/dashboard", label: "Business Reports", icon: BarChart3 },
];

const settingsLinks = [
  { href: "/app/settings/availability", label: "Shop Profile", icon: Settings },
  { href: "/app/settings/reminders", label: "Help Center", icon: ChevronRight },
];

type KickerStyle = "error" | "emerald" | null;

const essentials: {
  href: string;
  label: string;
  description: string;
  kicker: string | null;
  kickerStyle: KickerStyle;
  icon: React.ElementType;
  tone: "surface" | "tertiary";
}[] = [
  {
    href: "/app/settings/services",
    label: "Shop Stock",
    description:
      "Track professional products, retail stock, and set low-stock alerts.",
    kicker: "12 Items Low",
    kickerStyle: "error",
    icon: Package,
    tone: "surface",
  },
  {
    href: "/app/dashboard",
    label: "Sales & Growth",
    description:
      "Deep dive into daily earnings, popular services, and client retention.",
    kicker: "+14% This Month",
    kickerStyle: "emerald",
    icon: BarChart3,
    tone: "surface",
  },
  {
    href: "/app/customers",
    label: "Team",
    description:
      "Manage barber chairs, staff rotations, and stylist permissions.",
    kicker: null,
    kickerStyle: null,
    icon: Users,
    tone: "tertiary",
  },
];

export function AtelierDashboard({
  userName,
  shopName,
  shopSlug,
  bookingUrl,
}: AtelierDashboardProps) {
  const initials = shopName
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(bookingUrl);
      toast.success("Booking link copied");
    } catch {
      toast.error("Could not copy booking link");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-black/5 bg-white lg:flex">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 text-primary">
            <LayoutDashboard className="h-8 w-8" strokeWidth={2.2} />
            <span className="text-xl font-extrabold uppercase tracking-[0.28em]">
              Atelier
            </span>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4" aria-label="Primary">
          {primaryLinks.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? "flex items-center gap-4 rounded-[1.25rem] bg-primary px-4 py-4 font-bold text-primary-foreground shadow-[0_18px_40px_-20px_rgba(0,30,64,0.55)]"
                  : "flex items-center gap-4 rounded-[1.25rem] px-4 py-4 font-medium text-muted-foreground transition-colors hover:bg-black/[0.035] hover:text-primary"
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}

          <div className="px-4 pb-4 pt-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground/60">
              Settings
            </span>
          </div>

          {settingsLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-[1.25rem] px-4 py-4 font-medium text-muted-foreground transition-colors hover:bg-black/[0.035] hover:text-primary"
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-black/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--al-primary-fixed)] text-sm font-extrabold text-primary ring-2 ring-black/5">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{shopName}</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Studio Plan
              </p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/85 px-6 py-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-primary/5 p-2 text-primary">
            <Menu className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-[0.28em] text-primary">
            Atelier
          </h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/10 bg-[var(--al-primary-fixed)] text-xs font-extrabold text-primary">
          {initials}
        </div>
      </header>

      <main className="min-h-screen px-6 py-6 md:px-10 md:py-10 lg:ml-72 lg:px-16 lg:py-16">
        <section className="mx-auto mb-12 max-w-5xl md:mb-16">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
              Home Hub
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary md:text-6xl">
            Welcome back,
            <br className="md:hidden" /> {userName}.
          </h1>
          <p className="max-w-2xl text-lg font-medium text-muted-foreground md:text-xl">
            Your central hub for operations, scheduling, and shop growth. Manage
            your entire studio from one place.
          </p>
        </section>

        <section className="mx-auto mb-16 max-w-5xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.28em] text-primary">
              Onboarding & Setup
            </h2>
            <span className="rounded-full bg-secondary px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--al-on-secondary-container)]">
              Step 1 of 2
            </span>
          </div>

          <div className="space-y-6">
            <section className="group relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_30px_60px_-20px_rgba(0,30,64,0.08)] md:p-12">
              <div className="absolute -right-10 -top-10 hidden text-primary/[0.04] transition-opacity group-hover:text-primary/[0.06] md:block">
                <CalendarDays className="h-60 w-60" strokeWidth={1.2} />
              </div>

              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-[var(--al-primary-fixed)]/40 md:h-24 md:w-24">
                  <CalendarDays className="h-10 w-10 text-primary md:h-12 md:w-12" />
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
                    Sync Google Calendar
                  </h3>
                  <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    Most important: centralize studio bookings and personal time
                    to avoid double bookings and manage your day on the go.
                  </p>
                </div>

                <Link
                  href="/app/settings/calendar"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_20px_40px_-18px_rgba(0,30,64,0.45)] transition-transform hover:-translate-y-0.5 md:w-auto md:px-10 md:py-5"
                >
                  <span>Connect Now</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </section>

            <Link
              href="/app/appointments"
              className="group flex flex-col gap-6 rounded-[2rem] border border-black/5 bg-[var(--al-surface-container-low)]/70 p-6 transition-colors hover:bg-white md:flex-row md:items-center md:justify-between md:p-10"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-secondary text-[var(--al-on-secondary-container)] md:h-16 md:w-16">
                  <UserPlus className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-primary md:text-2xl">
                    Book Your First Client
                  </h4>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground/65">
                    Coming up next
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 font-bold text-primary transition-transform group-hover:translate-x-1">
                <span>View Appointments</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          </div>
        </section>

        <section className="mx-auto mb-16 max-w-5xl">
          <h2 className="mb-8 text-sm font-extrabold uppercase tracking-[0.28em] text-primary">
            Studio Essentials
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {essentials.map(({ href, label, description, kicker, kickerStyle, icon: Icon, tone }) => (
              <Link
                key={label}
                href={href}
                className={
                  tone === "tertiary"
                    ? "group flex min-h-[18rem] flex-col justify-between rounded-[2rem] border border-[var(--al-tertiary)]/8 bg-[var(--al-tertiary-fixed)] p-8 transition-shadow hover:shadow-[0_20px_44px_-28px_rgba(59,16,2,0.32)]"
                    : "group flex min-h-[18rem] flex-col justify-between rounded-[2rem] border border-black/5 bg-[var(--al-surface-container-low)] p-8 transition-shadow hover:shadow-[0_20px_44px_-28px_rgba(0,30,64,0.22)]"
                }
              >
                {/* Top section — icon + avatar stack for Team card */}
                {tone === "tertiary" ? (
                  <div className="mb-8 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white/40 shadow-sm transition-transform duration-200 group-hover:scale-110">
                      <Icon className="h-7 w-7 text-[var(--al-tertiary)]" />
                    </div>
                    <div className="flex -space-x-3">
                      {["A", "B"].map((init) => (
                        <div
                          key={init}
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--al-tertiary-fixed)] bg-white/40 text-[10px] font-extrabold text-[var(--al-tertiary)]"
                        >
                          {init}
                        </div>
                      ))}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--al-tertiary-fixed)] bg-white/40 text-[10px] font-extrabold text-[var(--al-tertiary)]">
                        +2
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-12 flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                )}

                <div>
                  <h4
                    className={
                      tone === "tertiary"
                        ? "mb-2 text-2xl font-bold text-[var(--al-tertiary)]"
                        : "mb-2 text-2xl font-bold text-primary"
                    }
                  >
                    {label}
                  </h4>
                  <p
                    className={
                      tone === "tertiary"
                        ? "mb-6 text-sm leading-relaxed text-[var(--al-on-tertiary-fixed-variant)]"
                        : "mb-6 text-sm leading-relaxed text-muted-foreground"
                    }
                  >
                    {description}
                  </p>
                  <div className="flex items-center justify-between">
                    {tone === "tertiary" ? (
                      <span />
                    ) : kickerStyle === "error" ? (
                      <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#93000a]">
                        {kicker}
                      </span>
                    ) : kickerStyle === "emerald" ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">
                        {kicker}
                      </span>
                    ) : null}
                    {tone === "tertiary" ? (
                      <ChevronRight className="h-5 w-5 text-[var(--al-tertiary)] opacity-30 transition-opacity group-hover:opacity-100" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-primary opacity-30 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mb-12 max-w-5xl">
          <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_24px_50px_-28px_rgba(0,30,64,0.16)] md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground/70">
                  Public Booking Link
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight text-primary">
                  {shopName}
                </h3>
                <p className="break-all text-sm text-muted-foreground">{bookingUrl}</p>
                <p className="text-sm text-muted-foreground">
                  Share `/book/{shopSlug}` with clients for direct booking.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:min-w-72">
                <Link
                  href={`/book/${shopSlug}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-primary px-5 py-3.5 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Booking Page</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-black/8 bg-[var(--al-surface-container-low)] px-5 py-3.5 font-bold text-primary transition-colors hover:bg-[var(--al-surface-container)]"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Booking Link</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-xl border-t border-black/5 py-12">
          <blockquote className="text-center text-lg font-medium italic text-muted-foreground/60">
            "Quality is not an act, it is a habit."
          </blockquote>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-black/5 bg-background/92 px-4 pb-8 pt-3 backdrop-blur-2xl lg:hidden">
        <Link
          href="/app"
          className="flex flex-col items-center justify-center rounded-full bg-[var(--al-tertiary-fixed)] px-6 py-2.5 text-[var(--al-on-tertiary-fixed)] transition-transform active:scale-95"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em]">
            Hub
          </span>
        </Link>
        <Link
          href="/app/appointments"
          className="flex flex-col items-center justify-center px-6 py-2.5 text-muted-foreground/70"
        >
          <CalendarDays className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em]">
            Book
          </span>
        </Link>
        <Link
          href="/app/settings/availability"
          className="flex flex-col items-center justify-center px-6 py-2.5 text-muted-foreground/70"
        >
          <Settings className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em]">
            Shop
          </span>
        </Link>
      </nav>
    </div>
  );
}
