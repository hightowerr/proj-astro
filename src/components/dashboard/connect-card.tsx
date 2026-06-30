import Link from "next/link";
import { ConnectConfirmationBanner } from "./connect-confirmation-banner";

interface ConnectCardProps {
  stripeOnboardingStatus: "not_started" | "pending" | "complete" | "suspended";
  hasServices: boolean;
  hasAvailability: boolean;
  unprotectedBookingCount: number;
}

export function ConnectCard({
  stripeOnboardingStatus,
  hasServices,
  hasAvailability,
  unprotectedBookingCount,
}: ConnectCardProps) {
  // Connected — brief green confirmation banner (shown once per session)
  if (stripeOnboardingStatus === "complete") {
    return <ConnectConfirmationBanner />;
  }

  // Suspended — Stripe has disabled charges_enabled on a previously-complete
  // account (compliance review, chargeback investigation, etc.). The owner did
  // nothing wrong and there is nothing to "set up" — show an informational card
  // with a link to the Stripe Express Dashboard, not an action prompt.
  if (stripeOnboardingStatus === "suspended") {
    return (
      <article
        role="region"
        aria-label="Stripe account under review"
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          borderColor: "rgba(59,130,246,0.25)",
          borderLeftWidth: "4px",
          borderLeftColor: "rgba(59,130,246,0.5)",
          background: "linear-gradient(to bottom, rgba(59,130,246,0.06), rgba(59,130,246,0.03))",
        }}
      >
        <span
          className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] pointer-events-none select-none"
          style={{ color: "rgba(59,130,246,0.06)" }}
          aria-hidden="true"
        >
          schedule
        </span>
        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-xl"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ color: "rgba(37,99,235,0.85)" }}
                aria-hidden="true"
              >
                schedule
              </span>
            </span>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "rgba(37,99,235,0.75)" }}
            >
              Account under review
            </p>
          </div>
          <h2
            className="text-lg font-extrabold"
            style={{ color: "rgba(30,64,175,0.9)" }}
          >
            Stripe is reviewing your account — deposits are temporarily paused.
          </h2>
          <p
            className="text-sm"
            style={{ color: "rgba(37,99,235,0.7)" }}
          >
            This is usually resolved within 1–3 business days. No action is
            needed on your end. Visit your Stripe dashboard to see the status
            and any messages from Stripe.
          </p>
          <Link
            href="/app/settings/stripe-connect"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "rgba(37,99,235,0.85)" }}
          >
            Open Stripe Dashboard
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </Link>
        </div>
      </article>
    );
  }

  // Visibility gate — don't show setup prompts until shop is bookable
  if (!hasServices || !hasAvailability) {
    return null;
  }

  // Tier 2b — Pending
  if (stripeOnboardingStatus === "pending") {
    return (
      <article role="region" aria-label="Payment setup required" className="relative overflow-hidden rounded-2xl border border-[rgba(201,122,42,0.3)] bg-gradient-to-b from-[rgba(201,122,42,0.11)] to-[rgba(201,122,42,0.06)] border-l-[4px] border-l-[rgba(201,122,42,0.7)] p-6">
        <span className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] text-amber-700/[0.07] pointer-events-none select-none" aria-hidden="true">hourglass_top</span>
        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-xl bg-amber-100">
              <span className="material-symbols-outlined text-2xl text-amber-700" aria-hidden="true">hourglass_top</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                  Almost there
                </p>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                  Account created &middot; one step left
                </span>
              </div>
            </div>
          </div>
          <h2 className="text-lg font-extrabold text-amber-900">
            Your Stripe setup isn&apos;t complete yet.
          </h2>
          <p className="text-sm text-amber-800/80">
            You have{" "}
            <span className="font-mono font-bold" style={{ fontSize: "21px", color: "var(--al-status-caution, #b45309)" }}>{unprotectedBookingCount}</span>{" "}
            {unprotectedBookingCount === 1 ? "booking" : "bookings"} without
            deposit protection. Finish setup to start collecting deposits.
          </p>
          <Link
            href="/app/settings/stripe-connect"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Continue setup
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </article>
    );
  }

  // Tier 2 — Post-booking (not_started, with bookings)
  if (unprotectedBookingCount > 0) {
    return (
      <article role="region" aria-label="Payment setup required" className="relative overflow-hidden rounded-2xl border border-[rgba(201,122,42,0.3)] bg-gradient-to-b from-[rgba(201,122,42,0.11)] to-[rgba(201,122,42,0.06)] border-l-[4px] border-l-[rgba(201,122,42,0.7)] p-6">
        <span className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] text-amber-700/[0.07] pointer-events-none select-none" aria-hidden="true">warning</span>
        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-xl bg-amber-100">
              <span className="material-symbols-outlined text-2xl text-amber-700" aria-hidden="true">warning</span>
            </span>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
              Deposits at risk
            </p>
          </div>
          <h2 className="text-lg font-extrabold text-amber-900">
            You&apos;ve taken{" "}
            <span className="font-mono font-bold" style={{ fontSize: "21px", color: "var(--al-status-caution, #b45309)" }}>{unprotectedBookingCount}</span>{" "}
            {unprotectedBookingCount === 1 ? "booking" : "bookings"} without
            deposit protection.
          </h2>
          <p className="text-sm text-amber-800/80">
            Connect Stripe to start collecting deposits on every future booking.
          </p>
          <Link
            href="/app/settings/stripe-connect"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Connect now
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </article>
    );
  }

  // Tier 1 — Pre-booking (not_started, zero bookings)
  return (
    <article role="region" aria-label="Payment setup required" className="relative overflow-hidden rounded-2xl border border-[rgba(0,30,64,0.13)] bg-gradient-to-b from-[rgba(0,30,64,0.045)] to-[rgba(0,30,64,0.025)] p-6">
      <span className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] text-[rgba(0,30,64,0.05)] pointer-events-none select-none" aria-hidden="true">account_balance_wallet</span>
      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-xl bg-[rgba(0,30,64,0.07)]">
            <span className="material-symbols-outlined text-2xl text-[rgba(0,30,64,0.65)]" aria-hidden="true">account_balance_wallet</span>
          </span>
          <p className="text-xs font-medium uppercase tracking-wider text-[rgba(0,30,64,0.55)]">
            Next step
          </p>
        </div>
        <h2 className="text-lg font-extrabold text-[rgba(0,30,64,0.85)]">
          Your booking page is live &mdash; but deposits aren&apos;t enabled yet.
        </h2>
        <p className="text-sm text-[rgba(0,30,64,0.6)]">
          Connect your Stripe account so customers pay a deposit when they book.
        </p>
        <Link
          href="/app/settings/stripe-connect"
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[rgba(0,30,64,0.85)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[rgba(0,30,64,0.95)]"
        >
          Connect with Stripe
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}
