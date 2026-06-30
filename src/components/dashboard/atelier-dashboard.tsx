"use client";

import Link from "next/link";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";

function MsIcon({ name, size = 20, fill = false }: { name: string; size?: number; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: "inline-flex",
      }}
    >
      {name}
    </span>
  );
}

type AtelierDashboardProps = {
  userName: string;
  shopName: string;
  shopSlug: string;
  bookingUrl: string;
};

type KickerStyle = "error" | "positive" | null;

const essentials: {
  href: string;
  label: string;
  description: string;
  kicker: string | null;
  kickerStyle: KickerStyle;
  icon: string;
  tone: "surface" | "tertiary";
}[] = [
  {
    href: "/app/settings/services",
    label: "Shop Stock",
    description: "Track professional products, retail stock, and set low-stock alerts.",
    kicker: "12 Items Low",
    kickerStyle: "error",
    icon: "inventory_2",
    tone: "surface",
  },
  {
    href: "/app/dashboard",
    label: "Sales & Growth",
    description: "Deep dive into daily earnings, popular services, and client retention.",
    kicker: "+14% This Month",
    kickerStyle: "positive",
    icon: "bar_chart",
    tone: "surface",
  },
  {
    href: "/app/customers",
    label: "Team",
    description: "Manage barber chairs, staff rotations, and stylist permissions.",
    kicker: null,
    kickerStyle: null,
    icon: "group",
    tone: "tertiary",
  },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,30,64,0.12)] focus-visible:ring-offset-2";

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
    <div className="pb-24 text-foreground lg:pb-0">
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14 lg:px-12 lg:py-16">

        {/* Hero */}
        <section className="mb-16">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-al-on-surface-variant/60">
            Home Hub
          </p>
          <h1 className="mb-5 font-manrope font-extrabold text-al-primary" style={{ fontSize: 'var(--al-display-lg)', letterSpacing: '-0.02em' }}>
            Welcome back,
            <br className="hidden md:block" /> {userName}.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-al-on-surface-variant">
            Your central hub for operations, scheduling, and shop growth. Manage your entire studio from one place.
          </p>
        </section>

        {/* Onboarding & Setup */}
        <section className="mb-16">
          <div className="mb-8 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--al-hairline)' }}>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-al-primary">
              Onboarding &amp; Setup
            </h2>
            <span className="rounded-full bg-al-secondary-fixed px-4 py-1.5 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-al-on-secondary-fixed">
              Step 1 of 2
            </span>
          </div>

          <div className="space-y-4">
            {/* Calendar sync — primary card */}
            <div className="group relative overflow-hidden rounded-3xl border border-al-surface-container-low bg-al-surface-lowest p-8 shadow-[var(--al-shadow-float)] md:p-10">
              <div className="pointer-events-none absolute -right-8 -top-8 text-al-primary opacity-[0.035]">
                <MsIcon name="calendar_month" size={208} />
              </div>

              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-al-surface-container text-al-primary md:h-20 md:w-20">
                  <MsIcon name="calendar_month" size={32} />
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
                  className={cn("inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-bold text-white md:w-auto", focusRing)}
                  style={{ background: 'var(--al-gradient-cta)', boxShadow: 'var(--al-shadow-cta)' }}
                >
                  <span>Connect Now</span>
                  <MsIcon name="arrow_forward" size={16} />
                </Link>
              </div>
            </div>

            {/* Book first client — secondary card */}
            <Link
              href="/app/appointments"
              className={cn("group flex flex-col gap-5 rounded-3xl border border-al-surface-container-low bg-al-surface-container-low/60 p-6 transition-colors hover:bg-al-surface-lowest md:flex-row md:items-center md:justify-between md:p-8", focusRing)}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-al-secondary-container text-al-on-secondary-container md:h-14 md:w-14">
                  <MsIcon name="person_add" size={24} />
                </div>
                <div>
                  <h4 className="font-manrope text-lg font-bold text-al-primary md:text-xl">
                    Book Your First Client
                  </h4>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.2em] text-al-on-surface-variant/60">
                    Coming up next
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 font-semibold text-al-primary">
                <span>View Appointments</span>
                <MsIcon name="chevron_right" size={16} />
              </div>
            </Link>
          </div>
        </section>

        {/* Studio Essentials */}
        <section className="mb-16">
          <div className="mb-8 border-b pb-4" style={{ borderColor: 'var(--al-hairline)' }}>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-al-primary">
              Studio Essentials
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {essentials.map(({ href, label, description, kicker, kickerStyle, icon: iconName, tone }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  "group flex min-h-[17rem] flex-col justify-between rounded-3xl border border-al-surface-container-low bg-al-surface-lowest p-6 transition-colors hover:bg-al-surface-container",
                  focusRing
                )}
              >
                {tone === "tertiary" ? (
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-al-surface-container text-al-primary shadow-sm">
                      <MsIcon name={iconName} size={24} />
                    </div>
                    <div className="flex -space-x-2">
                      {["A", "B"].map((init) => (
                        <div
                          key={init}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-al-secondary-container text-[10px] font-extrabold text-al-secondary"
                        >
                          {init}
                        </div>
                      ))}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-al-secondary-container text-[10px] font-extrabold text-al-secondary">
                        +2
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-al-surface-container text-al-primary shadow-sm">
                    <MsIcon name={iconName} size={24} />
                  </div>
                )}

                <div>
                  <h4 className="mb-2 font-manrope text-xl font-bold text-al-primary">
                    {label}
                  </h4>
                  <p className="mb-5 text-sm leading-relaxed text-al-on-surface-variant">
                    {description}
                  </p>
                  <div className="flex items-center justify-between">
                    {tone !== "tertiary" ? (
                      kickerStyle === "error" ? (
                        <span className="rounded-full bg-al-error-container px-3 py-1 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-al-on-error-container">
                          {kicker}
                        </span>
                      ) : kickerStyle === "positive" ? (
                        <span
                          className="rounded-full px-3 py-1 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em]"
                          style={{ background: 'var(--al-status-positive-bg)', color: 'var(--al-status-positive)' }}
                        >
                          {kicker}
                        </span>
                      ) : (
                        <span />
                      )
                    ) : (
                      <span />
                    )}
                    <span className="text-al-primary opacity-40">
                      <MsIcon name="open_in_new" size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Public Booking Link */}
        <section>
          <div className="mb-8 border-b pb-4" style={{ borderColor: 'var(--al-hairline)' }}>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-al-primary">
              Public Booking Link
            </h2>
          </div>

          <div className="rounded-3xl border border-al-surface-container-low bg-al-surface-lowest p-8 shadow-[var(--al-shadow-float)] md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h3 className="font-manrope text-2xl font-extrabold tracking-tight text-al-primary">
                  {shopName}
                </h3>
                <p className="break-all font-mono tabular-nums text-sm text-al-on-surface-variant">{bookingUrl}</p>
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
                  className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white", focusRing)}
                  style={{ background: 'var(--al-gradient-cta)', boxShadow: 'var(--al-shadow-cta)' }}
                >
                  <MsIcon name="open_in_new" size={16} />
                  <span>Open Booking Page</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn("inline-flex items-center justify-center gap-2 rounded-xl border border-al-outline-variant/30 bg-al-surface-container-low px-5 py-3.5 text-sm font-bold text-al-primary transition-colors hover:bg-al-surface-container", focusRing)}
                >
                  <MsIcon name="content_copy" size={16} />
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
