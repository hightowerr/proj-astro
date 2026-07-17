"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type OnboardingStatus = "not_started" | "pending" | "complete" | "suspended";
type View = "start" | "redirect" | "pending" | "verifying" | "still-verifying" | "connected" | "suspended";

type StripeConnectCardProps = {
  initialStatus: OnboardingStatus;
  stripeAccountId: string | null;
  payoutsEnabled?: boolean;
};

function deriveView(status: OnboardingStatus): View {
  switch (status) {
    case "not_started":
      return "start";
    case "pending":
      return "pending";
    case "complete":
      return "connected";
    case "suspended":
      return "suspended";
  }
}

function maskAccountId(id: string): string {
  if (id.length <= 7) return id;
  return `${id.slice(0, 4)}...${id.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// Sub-components for each view state
// ---------------------------------------------------------------------------

function StartView({ onConnect }: { onConnect: () => void }) {
  return (
    <>
      <h2
        className="font-manrope text-2xl font-extrabold"
        style={{ color: "var(--al-primary)" }}
      >
        Get paid directly
      </h2>

      <p
        className="mt-3 text-sm leading-relaxed max-w-lg"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        Customer deposits go straight to your bank account. You&apos;ll see
        payouts, refunds, and tax info in your own Stripe dashboard.
      </p>

      <p
        className="mt-2 text-xs"
        style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}
      >
        A 50p platform fee applies per booking deposit.
      </p>

      <Button
        variant="al-primary"
        size="lg"
        className="mt-6 rounded-xl px-8"
        onClick={onConnect}
      >
        Connect with Stripe
        <span className="material-symbols-outlined text-base" aria-hidden>
          arrow_forward
        </span>
      </Button>
    </>
  );
}

function RedirectView() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-current border-t-transparent"
        style={{ color: "var(--al-primary)" }}
        role="status"
        aria-label="Loading"
      />
      <p
        className="text-sm font-medium"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        Setting up your Stripe account...
      </p>
    </div>
  );
}

function ProgressSteps({
  activeStep,
  pulsing,
}: {
  activeStep: number;
  pulsing?: boolean;
}) {
  const steps = [
    { label: "Account created", icon: "check_circle" },
    { label: "Stripe verifying", icon: "radio_button_unchecked" },
    { label: "Ready to collect", icon: "radio_button_unchecked" },
  ];

  return (
    <div
      className="mt-6 flex flex-col sm:flex-row items-center gap-3"
      role="progressbar"
      aria-valuenow={activeStep}
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-label={`Step ${activeStep} of ${steps.length}: ${steps[Math.min(activeStep, steps.length - 1)]?.label}`}
    >
      {steps.map((step, i) => {
        const isComplete = i < activeStep;
        const isCurrent = i === activeStep;
        const isPulsing = isCurrent && pulsing;

        return (
          <div key={step.label} className="flex items-center gap-3">
            {i > 0 && (
              <div
                className="h-px w-8"
                style={{
                  background: isComplete
                    ? "var(--al-status-positive)"
                    : "var(--al-outline-variant)",
                }}
              />
            )}
            <div className="flex items-center gap-2">
              {isComplete ? (
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ color: "var(--al-status-positive)" }}
                  aria-hidden
                >
                  check_circle
                </span>
              ) : isPulsing ? (
                <span className="relative inline-flex h-3 w-3" aria-hidden>
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "var(--al-status-caution, var(--al-primary))",
                      animation: "al-ring 1.5s ease-out infinite",
                    }}
                  />
                  <span
                    className="relative inline-block h-3 w-3 rounded-full"
                    style={{
                      background: "var(--al-status-caution, var(--al-primary))",
                      animation: "al-pulsedot 1.5s ease-in-out infinite",
                    }}
                  />
                </span>
              ) : (
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{
                    background: isCurrent
                      ? "var(--al-primary)"
                      : "var(--al-outline-variant)",
                  }}
                  aria-hidden
                />
              )}
              <span
                className="text-xs font-medium"
                style={{
                  color: isComplete || isCurrent
                    ? "var(--al-on-surface)"
                    : "var(--al-on-surface-variant)",
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingView({ onConnect }: { onConnect: () => void }) {
  return (
    <>
      <h2
        className="font-manrope text-2xl font-extrabold"
        style={{ color: "var(--al-primary)" }}
      >
        Almost there
      </h2>

      <p
        className="mt-3 text-sm leading-relaxed max-w-lg"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        Complete your Stripe verification to start collecting deposits.
      </p>

      <ProgressSteps activeStep={1} />

      <Button
        variant="al-primary"
        size="lg"
        className="mt-6 rounded-xl px-8"
        onClick={onConnect}
      >
        Continue setup
        <span className="material-symbols-outlined text-base" aria-hidden>
          arrow_forward
        </span>
      </Button>
    </>
  );
}

function VerifyingView() {
  return (
    <>
      <h2
        className="font-manrope text-2xl font-extrabold"
        style={{ color: "var(--al-primary)" }}
      >
        Almost there
      </h2>

      <p
        className="mt-3 text-sm leading-relaxed max-w-lg"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        Complete your Stripe verification to start collecting deposits.
      </p>

      <ProgressSteps activeStep={1} pulsing />

      <div
        className="mt-6 flex items-start gap-3 rounded-xl p-4"
        style={{ background: "var(--al-surface-container-low)" }}
        aria-live="polite"
      >
        <span
          className="material-symbols-outlined text-lg shrink-0 mt-0.5"
          style={{ color: "var(--al-primary)" }}
          aria-hidden
        >
          info
        </span>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Stripe is verifying your details — this usually takes a few minutes.
        </p>
      </div>
    </>
  );
}

function StillVerifyingView() {
  return (
    <>
      <h2
        className="font-manrope font-extrabold"
        style={{
          fontSize: "22px",
          letterSpacing: "-0.01em",
          color: "var(--al-primary)",
        }}
      >
        Almost there
      </h2>

      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "var(--al-on-surface-variant)",
          maxWidth: "42ch",
          margin: "8px 0 30px",
        }}
      >
        Complete your Stripe verification to start collecting deposits.
      </p>

      <ProgressSteps activeStep={1} />

      <div
        className="flex items-start"
        style={{
          background: "var(--al-surface-container)",
          borderRadius: "12px",
          padding: "14px 16px",
          gap: "11px",
          marginTop: "28px",
        }}
        aria-live="polite"
      >
        <span
          className="material-symbols-outlined shrink-0"
          style={{
            fontSize: "20px",
            color: "var(--al-on-surface-variant)",
          }}
          aria-hidden
        >
          info
        </span>
        <p
          style={{
            fontSize: "13.5px",
            lineHeight: "1.55",
            color: "var(--al-on-surface-variant)",
            margin: 0,
          }}
        >
          Stripe is still reviewing your details. This can take up to a few
          hours. We&apos;ll update your dashboard when it&apos;s ready — you
          can close this page.
        </p>
      </div>
    </>
  );
}

function ConnectedView({
  stripeAccountId,
  onOpenDashboard,
  isLoadingDashboard,
  celebrate,
  payoutsEnabled = true,
}: {
  stripeAccountId: string;
  onOpenDashboard: () => void;
  isLoadingDashboard: boolean;
  celebrate?: boolean;
  payoutsEnabled?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className="relative inline-flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "38px",
            height: "38px",
            background: "var(--al-status-positive-bg, rgba(56,142,60,0.15))",
          }}
          aria-hidden
        >
          {celebrate && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                animation: "al-ring 1.5s ease-out forwards",
                background: "var(--al-status-positive-bg, rgba(56,142,60,0.15))",
              }}
              aria-hidden
            />
          )}
          <span
            className="material-symbols-outlined text-2xl"
            style={{
              color: "var(--al-status-positive)",
              ...(celebrate
                ? { animation: "al-pop 0.5s ease-out forwards" }
                : {}),
            }}
            aria-hidden
          >
            check_circle
          </span>
        </span>
        <h2
          className="font-manrope text-2xl font-extrabold"
          style={{ color: "var(--al-primary)" }}
        >
          Payments connected
        </h2>
      </div>

      {celebrate ? (
        <p
          className="mt-3 text-sm font-bold leading-relaxed max-w-lg"
          style={{ color: "var(--al-status-positive)" }}
        >
          You&apos;re all set! Deposits are now enabled on your booking page.
        </p>
      ) : (
        <p
          className="mt-3 text-sm leading-relaxed max-w-lg"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Booking deposits will now go directly to your bank account.
        </p>
      )}

      {/* Account details */}
      <div
        className="mt-6 rounded-xl p-4 space-y-3"
        style={{ background: "var(--al-surface-container-low)" }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Account
          </span>
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: "var(--al-on-surface)" }}
          >
            {maskAccountId(stripeAccountId)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Charges enabled
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--al-status-positive)" }}
              aria-hidden
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--al-status-positive)" }}
            >
              Active
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Payouts enabled
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: payoutsEnabled
                  ? "var(--al-status-positive)"
                  : "var(--al-outline-variant)",
              }}
              aria-hidden
            />
            <span
              className="text-xs font-semibold"
              style={{
                color: payoutsEnabled
                  ? "var(--al-on-surface)"
                  : "var(--al-on-surface-variant)",
              }}
            >
              {payoutsEnabled ? "Payouts enabled" : "Payouts verifying"}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Platform fee
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--al-on-surface)" }}
          >
            50p per booking deposit
          </span>
        </div>
      </div>

      {!payoutsEnabled && (
        <div
          className="flex items-start rounded-xl"
          style={{
            background: "var(--al-surface-container)",
            padding: "14px 16px",
            gap: "11px",
            marginTop: "16px",
          }}
          aria-live="polite"
        >
          <span
            className="material-symbols-outlined shrink-0"
            style={{
              fontSize: "20px",
              color: "var(--al-on-surface-variant)",
            }}
            aria-hidden
          >
            info
          </span>
          <p
            style={{
              fontSize: "13.5px",
              lineHeight: "1.55",
              color: "var(--al-on-surface-variant)",
              margin: 0,
            }}
          >
            Stripe is verifying your payout details — this usually takes a few
            minutes. You can still accept deposits in the meantime.
          </p>
        </div>
      )}

      <Button
        variant="outline"
        size="lg"
        className="mt-6 rounded-xl px-8"
        onClick={onOpenDashboard}
        disabled={isLoadingDashboard}
        aria-label="Open Stripe Dashboard (opens in new tab)"
      >
        {isLoadingDashboard ? "Opening..." : "Open Stripe Dashboard"}
        <span className="material-symbols-outlined text-base" aria-hidden>
          open_in_new
        </span>
      </Button>

      <div
        className="mt-6 border-t pt-4"
        style={{ borderColor: "var(--al-outline-variant)" }}
      >
        <a
          href="/app/settings/billing"
          className="inline-flex items-center gap-1 font-extrabold hover:underline"
          style={{ color: "var(--al-primary)", fontSize: "15px" }}
        >
          Review your deposit policy
          <span className="material-symbols-outlined text-base" aria-hidden>
            arrow_forward
          </span>
        </a>
      </div>
    </>
  );
}

function SuspendedView({
  onOpenDashboard,
  isLoadingDashboard,
}: {
  onOpenDashboard: () => void;
  isLoadingDashboard: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "38px",
            height: "38px",
            background: "rgba(59,130,246,0.1)",
          }}
          aria-hidden
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ color: "rgba(37,99,235,0.85)" }}
            aria-hidden
          >
            schedule
          </span>
        </span>
        <h2
          className="font-manrope text-2xl font-extrabold"
          style={{ color: "var(--al-primary)" }}
        >
          Account under review
        </h2>
      </div>

      <p
        className="mt-3 text-sm leading-relaxed max-w-lg"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        Stripe has temporarily paused deposits while reviewing your account.
        This is usually resolved within 1–3 business days. No action is needed
        on your end.
      </p>

      <div
        className="mt-4 flex items-start gap-3 rounded-xl p-4"
        style={{ background: "var(--al-surface-container-low)" }}
      >
        <span
          className="material-symbols-outlined text-lg shrink-0 mt-0.5"
          style={{ color: "rgba(37,99,235,0.75)" }}
          aria-hidden
        >
          info
        </span>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Check your Stripe dashboard for messages from Stripe. If you believe
          this is a mistake, contact Stripe support directly.
        </p>
      </div>

      <Button
        variant="al-primary"
        size="lg"
        className="mt-6 rounded-xl px-8"
        onClick={onOpenDashboard}
        disabled={isLoadingDashboard}
      >
        {isLoadingDashboard ? "Opening\u2026" : "Open Stripe Dashboard"}
        <span className="material-symbols-outlined text-base" aria-hidden>
          open_in_new
        </span>
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StripeConnectCard({
  initialStatus,
  stripeAccountId,
  payoutsEnabled = true,
}: StripeConnectCardProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(() => deriveView(initialStatus));
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect ?status=complete on mount (returning from Stripe onboarding)
  useEffect(() => {
    if (
      searchParams.get("status") === "complete" &&
      initialStatus === "pending"
    ) {
      setView("verifying");
    }
  }, [searchParams, initialStatus]);

  // Auto-poll when in verifying state
  useEffect(() => {
    if (view !== "verifying") return;

    pollCountRef.current = 0;

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > 12) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        console.info("[stripe-connect] Poll exhausted after 12 attempts — transitioning to still-verifying");
        setView("still-verifying");
        return;
      }

      try {
        const res = await fetch("/api/settings/stripe-connect/status");
        if (!res.ok) return;

        const data = (await res.json()) as { status: string };
        if (data.status === "complete") {
          setCelebrate(true);
          setView("connected");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          // Settle to static state after 2 seconds
          celebrateTimerRef.current = setTimeout(() => setCelebrate(false), 2000);
        }
      } catch {
        // Silently retry on network errors
      }
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, [view]);

  const handleConnect = useCallback(async () => {
    setView("redirect");

    try {
      const [res] = await Promise.all([
        fetch("/api/settings/stripe-connect/create-account", {
          method: "POST",
        }),
        new Promise((resolve) => setTimeout(resolve, 1700)),
      ]);

      const response = res as Response;
      if (!response.ok) {
        throw new Error("Failed to create account");
      }

      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      // Fall back to pending if something went wrong
      setView(initialStatus === "not_started" ? "start" : "pending");
    }
  }, [initialStatus]);

  const handleOpenDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const res = await fetch("/api/settings/stripe-connect/dashboard");
      if (!res.ok) throw new Error("Failed to get dashboard link");

      const data = (await res.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  const isConnected = view === "connected";
  const isSuspended = view === "suspended";
  const hasAccent = view === "pending" || view === "verifying" || view === "still-verifying" || isConnected || isSuspended;
  const accentColor = isConnected
    ? "var(--al-status-positive)"
    : isSuspended
    ? "rgba(59,130,246,0.5)"
    : "var(--al-primary)";

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8 border bg-al-surface-lowest max-w-2xl"
      style={{
        borderColor: hasAccent ? accentColor : "var(--al-outline-variant)",
        borderLeftWidth: hasAccent ? 4 : 1,
        boxShadow: "0 1px 4px rgba(26,28,27,0.04)",
      }}
    >
      {view === "start" && (
        <span
          className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] pointer-events-none select-none"
          style={{ color: "rgba(0,30,64,0.06)" }}
          aria-hidden="true"
        >
          credit_card
        </span>
      )}
      {view === "start" && <StartView onConnect={handleConnect} />}
      {view === "redirect" && <RedirectView />}
      {view === "pending" && <PendingView onConnect={handleConnect} />}
      {view === "verifying" && <VerifyingView />}
      {view === "still-verifying" && <StillVerifyingView />}
      {view === "connected" && stripeAccountId && (
        <ConnectedView
          stripeAccountId={stripeAccountId}
          onOpenDashboard={handleOpenDashboard}
          isLoadingDashboard={isLoadingDashboard}
          celebrate={celebrate}
          payoutsEnabled={payoutsEnabled}
        />
      )}
      {view === "suspended" && (
        <SuspendedView
          onOpenDashboard={handleOpenDashboard}
          isLoadingDashboard={isLoadingDashboard}
        />
      )}
    </div>
  );
}
