"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Package,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type Tab = "getting-started" | "my-shop" | "operations";

type HubPageProps = {
  userName: string;
  shopName: string;
  shopSlug: string;
  bookingUrl: string;
};

// ─── Copy button ──────────────────────────────────────────────────────────────
function LightCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success("Link copied!");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button
      type="button"
      variant="al-ghost"
      onClick={handleCopy}
      className="w-full h-14 rounded-2xl font-bold text-base border"
      style={{ borderColor: "var(--al-outline-variant)" }}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : "Copy Link"}
    </Button>
  );
}

// ─── Operations cards ─────────────────────────────────────────────────────────
const OPS_CARDS = [
  {
    icon: Package,
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    title: "Shop Stock",
    description: "Track professional products, retail stock, and set low-stock alerts.",
    cta: "Manage Catalog",
    href: "#",
  },
  {
    icon: TrendingUp,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    title: "Sales & Growth",
    description: "Deep dive into daily earnings, popular services, and client retention.",
    cta: "View Reports",
    href: "#",
  },
  {
    icon: Users,
    iconBg: "#faf5ff",
    iconColor: "#7c3aed",
    title: "Team",
    description: "Manage barber chairs, staff rotations, and stylist permissions.",
    cta: "Manage Team",
    href: "#",
  },
] as const;

// ─── Main hub page ────────────────────────────────────────────────────────────
export function HubPage({ userName, shopName, shopSlug, bookingUrl }: HubPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("getting-started");

  const initials = shopName
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tabs: { id: Tab; label: string }[] = [
    { id: "getting-started", label: "Getting Started" },
    { id: "my-shop", label: "My Shop" },
    { id: "operations", label: "Operations" },
  ];

  return (
    <div
      className="min-h-screen font-manrope"
      style={{ background: "var(--al-background)" }}
    >
      <main className="mx-auto max-w-screen-xl px-6 md:px-12 py-12 md:py-16">

        {/* ── Welcome header ────────────────────────────────────────────── */}
        <header
          className="mb-12"
          style={{ animation: "fade-up 0.4s ease-out both" }}
        >
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{
              color: "var(--al-primary)",
              fontFamily: "var(--al-font)",
            }}
          >
            Welcome back, {userName}.
          </h1>
          <p
            className="text-lg font-light max-w-2xl"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Your central hub for operations, scheduling, and shop growth. Manage
            your entire studio from one place.
          </p>
        </header>

        {/* ── Tab navigation ────────────────────────────────────────────── */}
        <div
          className="mb-10"
          style={{ animation: "fade-up 0.4s 0.08s ease-out both" }}
        >
          <div className="flex space-x-8 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:rounded-sm"
                  style={{
                    color: isActive
                      ? "var(--al-primary)"
                      : "var(--al-on-surface-variant)",
                    borderColor: isActive ? "var(--al-primary)" : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Separator style={{ background: "var(--al-outline-variant)" }} />
        </div>

        {/* ── Getting Started tab ───────────────────────────────────────── */}
        {activeTab === "getting-started" && (
          <section
            className="max-w-4xl mx-auto flex flex-col space-y-8"
            style={{ animation: "fade-up 0.3s ease-out both" }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "var(--al-primary)" }}
              >
                Onboarding &amp; Setup
              </h2>
              <Badge variant="al-curator">Step 1 of 2</Badge>
            </div>

            <div className="flex flex-col gap-8">
              {/* Google Calendar card — primary CTA */}
              <div
                className="group relative overflow-hidden bg-white rounded-[2.5rem] p-10 border-2 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: "var(--al-ghost-border)",
                  boxShadow: "0 4px 24px rgba(0,30,64,0.06)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "var(--al-shadow-float)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 24px rgba(0,30,64,0.06)";
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="flex items-start gap-8">
                    <div
                      className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0"
                      style={{ background: "var(--al-primary-fixed)" }}
                    >
                      <Calendar
                        className="w-10 h-10"
                        style={{ color: "var(--al-primary)" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-3xl font-extrabold"
                        style={{ color: "var(--al-primary)" }}
                      >
                        Sync Google Calendar
                      </h3>
                      <p
                        className="text-base mt-3 max-w-xl font-normal leading-relaxed"
                        style={{ color: "var(--al-on-surface-variant)" }}
                      >
                        Most important: Sync your personal and shop schedules to
                        avoid double bookings and manage your day on the go.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="al-primary"
                    size="lg"
                    asChild
                    className="whitespace-nowrap px-12 h-14 rounded-2xl text-lg shrink-0"
                  >
                    <Link href="/app/settings/calendar">Connect Calendar</Link>
                  </Button>
                </div>
                {/* Decorative background icon */}
                <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none select-none">
                  <RefreshCw className="w-48 h-48" />
                </div>
              </div>

              {/* Appointments card — secondary */}
              <div
                className="relative overflow-hidden rounded-[2.5rem] p-10 border transition-all duration-300"
                style={{
                  background: "var(--al-surface-container-low)",
                  borderColor: "var(--al-outline-variant)",
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="flex items-start gap-8">
                    <div
                      className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0"
                      style={{ background: "var(--al-secondary-fixed)" }}
                    >
                      <ClipboardList
                        className="w-8 h-8"
                        style={{ color: "var(--al-secondary)" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold"
                        style={{ color: "var(--al-primary)" }}
                      >
                        Book Your First Client
                      </h3>
                      <p
                        className="text-base mt-2 max-w-lg"
                        style={{ color: "var(--al-on-surface-variant)" }}
                      >
                        Ready to start? Manually add an appointment or view your
                        list to manage upcoming bookings.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="whitespace-nowrap px-10 h-14 rounded-2xl font-bold text-base border-2 shrink-0 hover:text-white transition-all duration-200"
                    style={{
                      color: "var(--al-primary)",
                      borderColor: "var(--al-outline-variant)",
                      background: "white",
                    }}
                  >
                    <Link href="/app/appointments">View Appointments</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── My Shop tab ───────────────────────────────────────────────── */}
        {activeTab === "my-shop" && (
          <section
            className="max-w-xl mx-auto flex flex-col space-y-8"
            style={{ animation: "fade-up 0.3s ease-out both" }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "var(--al-primary)" }}
              >
                Shop Identity
              </h2>
              <Badge variant="al-muted">Public Facing</Badge>
            </div>

            <div
              className="rounded-[3rem] p-12 border flex flex-col items-center"
              style={{
                background: "var(--al-surface-container-low)",
                borderColor: "var(--al-ghost-border)",
              }}
            >
              {/* Shop avatar */}
              <div className="relative mb-8">
                <Avatar
                  className="w-32 h-32 rounded-[2.5rem] shadow-2xl ring-4 ring-white"
                  style={{ background: "var(--al-gradient-cta)" }}
                >
                  <AvatarFallback
                    className="w-32 h-32 rounded-[2.5rem] text-4xl font-extrabold select-none"
                    style={{
                      background: "var(--al-gradient-cta)",
                      color: "var(--al-on-primary)",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-2 mb-10">
                <div className="flex justify-center mb-2">
                  <Badge variant="al-secondary">Shop</Badge>
                </div>
                <h3
                  className="text-4xl font-extrabold"
                  style={{ color: "var(--al-primary)" }}
                >
                  {shopName}
                </h3>
                <div
                  className="flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ color: "var(--al-on-surface-variant)" }}
                >
                  <span className="font-mono text-xs break-all">
                    /book/{shopSlug}
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="w-full h-14 rounded-2xl font-bold text-base border-2 transition-all duration-200 hover:border-[var(--al-primary)]"
                  style={{
                    borderColor: "var(--al-outline-variant)",
                    color: "var(--al-primary)",
                  }}
                >
                  <a
                    href={`/book/${shopSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Test Booking Page
                  </a>
                </Button>
                <LightCopyButton text={bookingUrl} />
              </div>
            </div>
          </section>
        )}

        {/* ── Operations tab ────────────────────────────────────────────── */}
        {activeTab === "operations" && (
          <section
            className="space-y-8"
            style={{ animation: "fade-up 0.3s ease-out both" }}
          >
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "var(--al-primary)" }}
            >
              Studio Essentials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {OPS_CARDS.map((card, i) => (
                <div
                  key={card.title}
                  className="group bg-white p-10 rounded-[2.5rem] border cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{
                    borderColor: "var(--al-outline-variant)",
                    boxShadow: "0 1px 4px rgba(26,28,27,0.04)",
                    animation: `fade-up 0.3s ${i * 0.07}s ease-out both`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "var(--al-shadow-float)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "0 1px 4px rgba(26,28,27,0.04)";
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: card.iconBg }}
                  >
                    <card.icon
                      className="w-7 h-7"
                      style={{ color: card.iconColor }}
                    />
                  </div>
                  <h4
                    className="text-2xl font-bold mb-3"
                    style={{ color: "var(--al-primary)" }}
                  >
                    {card.title}
                  </h4>
                  <p
                    className="text-base mb-8 leading-relaxed"
                    style={{ color: "var(--al-on-surface-variant)" }}
                  >
                    {card.description}
                  </p>
                  <div
                    className="flex items-center font-bold text-base gap-2"
                    style={{ color: "var(--al-primary)" }}
                  >
                    {card.cta}
                    <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
