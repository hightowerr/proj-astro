"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Pencil, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STITCH_URL =
  "https://stitch.withgoogle.com/projects/18022274387003063612?node-id=b3ad17d23d0a4caea44e06d57264e171";

type CalendarConnectionView = {
  id: string;
  calendarName: string;
  createdAt: string;
};

type CalendarSettingsClientProps = {
  connection: CalendarConnectionView | null;
  isGoogleOAuthConfigured: boolean;
  hasShop: boolean;
};

function ComingSoon() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ml-2"
      style={{ background: "#fef3c7", color: "#92400e" }}
    >
      Coming Soon
    </span>
  );
}

export function CalendarSettingsClient({
  connection,
  isGoogleOAuthConfigured,
  hasShop,
}: CalendarSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Calendar from this shop?")) {
      return;
    }

    try {
      const response = await fetch("/api/settings/calendar/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Failed to disconnect calendar");
      }

      startTransition(() => {
        router.replace("/app/settings/calendar?success=Google%20Calendar%20disconnected");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect calendar";
      startTransition(() => {
        router.replace(`/app/settings/calendar?error=${encodeURIComponent(message)}`);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Success alert ──────────────────────────────────────────────── */}
      {successMessage ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl p-4 text-sm font-medium"
          style={{ background: "#dcfce7", color: "#15803d" }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      {/* ── Error alert ────────────────────────────────────────────────── */}
      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl p-4 text-sm font-medium"
          style={{
            background: "var(--al-error-container)",
            color: "var(--al-on-error-container)",
          }}
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      {/* ── System Configuration Alert ─────────────────────────────────── */}
      {!isGoogleOAuthConfigured ? (
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: "#fff1f1",
            borderColor: "#fca5a5",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#fee2e2" }}
            >
              <AlertTriangle className="h-4 w-4" style={{ color: "#dc2626" }} />
            </div>
            <div>
              <h2
                className="font-manrope text-sm font-bold"
                style={{ color: "#dc2626" }}
              >
                System Configuration Alert
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#7f1d1d" }}>
                Some environment variables are missing. External calendar
                synchronization might be limited until these are resolved by
                your administrator.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Two-column grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Google Calendar card */}
          <div
            className="rounded-2xl p-6 border bg-white"
            style={{
              borderColor: "var(--al-outline-variant)",
              boxShadow: "0 1px 4px rgba(26,28,27,0.04)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Google "G" icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg font-bold"
                  style={{
                    borderColor: "var(--al-outline-variant)",
                    background: "#fff",
                    color: "#4285F4",
                  }}
                >
                  G
                </div>
                <h2 className="font-manrope text-lg font-extrabold" style={{ color: "var(--al-primary)" }}>
                  Google Calendar
                </h2>
              </div>

              {connection ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  className="shrink-0 text-sm font-semibold hover:underline disabled:opacity-50"
                  style={{ color: "#dc2626" }}
                >
                  {isPending ? "Disconnecting…" : "Disconnect Account"}
                </button>
              ) : null}
            </div>

            {/* Status pill */}
            <div className="mt-4">
              {connection ? (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "#dcfce7", color: "#15803d" }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#15803d" }}
                    aria-hidden
                  />
                  Connected
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "var(--al-surface-container)",
                    color: "var(--al-on-surface-variant)",
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--al-on-surface-variant)" }}
                    aria-hidden
                  />
                  Not connected
                </span>
              )}
            </div>

            {/* Connected state: info tiles */}
            {connection ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--al-surface-container-low)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--al-on-surface-variant)" }}
                  >
                    Email Address
                  </p>
                  <p
                    className="mt-1 text-sm font-semibold break-all"
                    style={{ color: "var(--al-primary)" }}
                  >
                    {connection.calendarName}
                  </p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--al-surface-container-low)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--al-on-surface-variant)" }}
                  >
                    Sync Frequency
                    <ComingSoon />
                  </p>
                  <p
                    className="mt-1 text-sm font-semibold"
                    style={{ color: "var(--al-on-surface-variant)", opacity: 0.5 }}
                  >
                    Real-time bidirectional
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <p
                  className="max-w-xl text-sm"
                  style={{ color: "var(--al-on-surface-variant)" }}
                >
                  Authorize Google Calendar to prepare automated booking sync in
                  upcoming slices. V1 stores the connection and lets you
                  disconnect at any time.
                </p>
                <Button
                  variant="al-primary"
                  size="lg"
                  className="rounded-xl px-8"
                  asChild
                  disabled={!isGoogleOAuthConfigured || !hasShop || isPending}
                  aria-disabled={!isGoogleOAuthConfigured || !hasShop || isPending}
                >
                  <a href="/api/settings/calendar/connect">
                    Connect Google Calendar
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Available Providers */}
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--al-on-surface-variant)" }}
            >
              Available Providers
            </p>
            <div
              className="rounded-2xl p-5 border bg-white flex items-center justify-between gap-4"
              style={{
                borderColor: "var(--al-outline-variant)",
                boxShadow: "0 1px 4px rgba(26,28,27,0.04)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Outlook icon placeholder */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold"
                  style={{
                    borderColor: "#bfdbfe",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }}
                >
                  Ol
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--al-primary)" }}>
                    Outlook Calendar
                  </p>
                  <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>
                    Connect your Microsoft 365 account
                  </p>
                </div>
              </div>
              <a
                href={STITCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--al-primary)" }}
              >
                Connect Outlook
                <ComingSoon />
              </a>
            </div>
          </div>
        </div>

        {/* ── Right column: sidebar ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Booking Logic panel */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#1e2a3a" }}
          >
            <h3 className="font-manrope text-base font-bold mb-5" style={{ color: "#fff" }}>
              Booking Logic
            </h3>
            <div className="space-y-3">
              {[
                { label: "LEAD TIME", value: "24 Hours Notice" },
                { label: "BUFFER PERIODS", value: "15 Min Intervals" },
                { label: "BOOKING HORIZON", value: "60 Days Forward" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: "#fff" }}>
                      {value}
                    </p>
                  </div>
                  <a
                    href={STITCH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Coming soon"
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg opacity-40 hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" style={{ color: "#fff" }} />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Atelier Tip panel */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#fdf2f0" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#c2410c" }} />
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#c2410c" }}
              >
                Atelier Tip
              </p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#7c2d12" }}>
              Increasing your buffer periods by just 5 minutes can reduce studio
              stress by up to 20% during peak seasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
