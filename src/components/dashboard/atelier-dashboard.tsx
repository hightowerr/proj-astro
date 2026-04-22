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
  Package,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";

type AtelierDashboardProps = {
  userName: string;
  shopName: string;
  shopSlug: string;
  bookingUrl: string;
};

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
    description: "Track professional products, retail stock, and set low-stock alerts.",
    kicker: "12 Items Low",
    kickerStyle: "error",
    icon: Package,
    tone: "surface",
  },
  {
    href: "/app/dashboard",
    label: "Sales & Growth",
    description: "Deep dive into daily earnings, popular services, and client retention.",
    kicker: "+14% This Month",
    kickerStyle: "emerald",
    icon: BarChart3,
    tone: "surface",
  },
  {
    href: "/app/customers",
    label: "Team",
    description: "Manage barber chairs, staff rotations, and stylist permissions.",
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
  const handleCopyLink = async () => {
    try {
      await copyToClipboard(bookingUrl);
      toast.success("Booking link copied");
    } catch {
      toast.error("Could not copy booking link");
    }
  };

  return (
    <div className="min-h-screen bg-al-surface-low pb-24 text-foreground lg:pb-0">
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14 lg:px-12 lg:py-16">

        {/* Hero */}
        <section className="mb-16">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-al-on-surface-variant/60">
            Home Hub
          </p>
          <h1 className="mb-5 font-manrope text-5xl font-extrabold tracking-tight text-al-primary md:text-7xl">
            Welcome back,
            <br className="hidden md:block" /> {userName}.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-al-on-surface-variant">
            Your central hub for operations, scheduling, and shop growth. Manage your entire studio from one place.
          </p>
        </section>

        {/* Onboarding & Setup */}
        <section className="mb-16">
          <div className="mb-8 flex items-center justify-between border-b border-al-surface-container-high pb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.28em] text-al-primary">
              Onboarding &amp; Setup
            </h2>
            <span className="rounded-full bg-[#ffdbcf] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2a170f]">
              Step 1 of 2
            </span>
          </div>

          <div className="space-y-4">
            {/* Calendar sync — primary card */}
            <div className="group relative overflow-hidden rounded-2xl border border-al-surface-container-low bg-al-surface-lowest p-8 shadow-[0px_10px_30px_rgba(26,28,27,0.04)] md:p-10">
              <div className="pointer-events-none absolute -right-8 -top-8 text-al-primary opacity-[0.035] transition-opacity group-hover:opacity-[0.065]">
                <CalendarDays className="h-52 w-52" strokeWidth={1} />
              </div>

              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-al-surface-container text-al-primary md:h-20 md:w-20">
                  <CalendarDays className="h-8 w-8 md:h-10 md:w-10" />
                </div>

                <div className="flex-1">
                  <h3 className="mb-3 font-manrope text-2xl font-extrabold tracking-tight text-al-primary md:text-3xl">
                    Sync Google Calendar
                  </h3>
                  <p className="max-w-lg leading-relaxed text-al-on-surface-variant">
                    Centralize studio bookings and personal time to avoid double bookings and manage your day on the go.
                  </p>
                </div>

                <Link
                  href="/app/settings/calendar"
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-al-primary px-7 py-4 text-base font-bold text-white shadow-[0px_8px_24px_rgba(0,30,64,0.28)] transition-transform hover:-translate-y-0.5 md:w-auto"
                >
                  <span>Connect Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Book first client — secondary card */}
            <Link
              href="/app/appointments"
              className="group flex flex-col gap-5 rounded-2xl border border-al-surface-container-low bg-al-surface-container-low/60 p-6 transition-colors hover:bg-al-surface-lowest md:flex-row md:items-center md:justify-between md:p-8"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fdd8cb] text-[#785c53] md:h-14 md:w-14">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-manrope text-lg font-bold text-al-primary md:text-xl">
                    Book Your First Client
                  </h4>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.22em] text-al-on-surface-variant/60">
                    Coming up next
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 font-semibold text-al-primary transition-transform group-hover:translate-x-1">
                <span>View Appointments</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Studio Essentials */}
        <section className="mb-16">
          <div className="mb-8 border-b border-al-surface-container-high pb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.28em] text-al-primary">
              Studio Essentials
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {essentials.map(({ href, label, description, kicker, kickerStyle, icon: Icon, tone }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  "group flex min-h-[17rem] flex-col justify-between rounded-2xl p-6 transition-shadow",
                  tone === "tertiary"
                    ? "border border-[#ffdbcf]/50 bg-[#fff8f5] hover:shadow-[0px_12px_32px_rgba(74,40,20,0.1)]"
                    : "border border-al-surface-container-low bg-al-surface-lowest hover:shadow-[0px_12px_32px_rgba(0,30,64,0.1)]"
                )}
              >
                {tone === "tertiary" ? (
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/60 shadow-sm transition-transform duration-200 group-hover:scale-110">
                      <Icon className="h-6 w-6 text-[#74584f]" />
                    </div>
                    <div className="flex -space-x-2">
                      {["A", "B"].map((init) => (
                        <div
                          key={init}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#fff8f5] bg-[#fdd8cb] text-[10px] font-extrabold text-[#74584f]"
                        >
                          {init}
                        </div>
                      ))}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#fff8f5] bg-[#fdd8cb] text-[10px] font-extrabold text-[#74584f]">
                        +2
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-al-surface-container text-al-primary shadow-sm transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                )}

                <div>
                  <h4
                    className={cn(
                      "mb-2 font-manrope text-xl font-bold",
                      tone === "tertiary" ? "text-[#74584f]" : "text-al-primary"
                    )}
                  >
                    {label}
                  </h4>
                  <p
                    className={cn(
                      "mb-5 text-sm leading-relaxed",
                      tone === "tertiary" ? "text-[#9a6f64]" : "text-al-on-surface-variant"
                    )}
                  >
                    {description}
                  </p>
                  <div className="flex items-center justify-between">
                    {tone !== "tertiary" ? (
                      kickerStyle === "error" ? (
                        <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#93000a]">
                          {kicker}
                        </span>
                      ) : kickerStyle === "emerald" ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
                          {kicker}
                        </span>
                      ) : (
                        <span />
                      )
                    ) : (
                      <span />
                    )}
                    <ExternalLink
                      className={cn(
                        "h-4 w-4 opacity-25 transition-opacity group-hover:opacity-80",
                        tone === "tertiary" ? "text-[#74584f]" : "text-al-primary"
                      )}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Public Booking Link */}
        <section>
          <div className="mb-8 border-b border-al-surface-container-high pb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.28em] text-al-primary">
              Public Booking Link
            </h2>
          </div>

          <div className="rounded-2xl border border-al-surface-container-low bg-al-surface-lowest p-8 shadow-[0px_10px_30px_rgba(26,28,27,0.03)] md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h3 className="font-manrope text-2xl font-extrabold tracking-tight text-al-primary">
                  {shopName}
                </h3>
                <p className="break-all text-sm text-al-on-surface-variant">{bookingUrl}</p>
                <p className="text-sm text-al-on-surface-variant/60">
                  Share{" "}
                  <code className="rounded bg-al-surface-container px-1.5 py-0.5 font-mono text-xs">
                    /book/{shopSlug}
                  </code>{" "}
                  with clients for direct booking.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 md:min-w-56">
                <Link
                  href={`/book/${shopSlug}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-al-primary px-5 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Booking Page</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-al-outline-variant/30 bg-al-surface-container-low px-5 py-3.5 text-sm font-bold text-al-primary transition-colors hover:bg-al-surface-container"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Booking Link</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
