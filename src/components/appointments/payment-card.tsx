const PLATFORM_FEE_CENTS = 50;

type PaymentCardProps = {
  amountCents: number | null;
  currency: string | null;
  paymentStatus: string;
  paymentRequired: boolean;
  financialOutcome: string;
  resolvedAt: Date | null;
  formatter: Intl.DateTimeFormat;
  stripeOnboardingStatus?: string | null;
  isConnectPayment: boolean;
  depositSkipped: "connect_not_complete" | "policy_none" | null;
  transferHeld?: boolean;
};

export type FeeState = "connect" | "waived" | "legacy" | "skipped" | "policy";

export function determineFeeState(
  amountCents: number | null,
  paymentRequired: boolean,
  isConnectPayment: boolean,
  depositSkipped: "connect_not_complete" | "policy_none" | null,
): FeeState {
  if (amountCents != null && amountCents > 0) {
    if (!isConnectPayment) return "legacy";
    return amountCents <= PLATFORM_FEE_CENTS ? "waived" : "connect";
  }

  if (depositSkipped === "connect_not_complete") return "skipped";
  if (depositSkipped === "policy_none") return "policy";
  if (!paymentRequired) return "policy";
  return "skipped";
}

export function formatGBP(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

// ─── Extracted pure helpers for testability ─────────────────────────────────

/** Determines the displayed payout value string. */
export function resolvePayoutDisplay(
  amountCents: number,
  waived: boolean,
  refunded: boolean,
  transferHeld: boolean,
): string {
  const payoutHeld = !refunded && transferHeld;
  if (payoutHeld) return "Held";
  if (refunded) return formatGBP(0);
  if (waived) return formatGBP(amountCents);
  return formatGBP(amountCents - PLATFORM_FEE_CENTS);
}

/** Returns the Material Symbol icon name for the helper text line. */
export function resolveHelperIcon(
  refunded: boolean,
  transferHeld: boolean,
): string {
  if (refunded) return "undo";
  if (transferHeld) return "pause_circle";
  return "north_east";
}

/** Returns the helper text copy for the payout status line. */
export function resolveHelperText(
  refunded: boolean,
  transferHeld: boolean,
): string {
  if (refunded) return "Payout reversed to customer.";
  if (transferHeld)
    return "Payment received but transfer paused — Stripe is reviewing your account.";
  return "Payout routed to your connected bank account.";
}

function FeeBreakdown({
  amountCents,
  waived,
  refunded = false,
  transferHeld = false,
}: {
  amountCents: number;
  waived: boolean;
  refunded?: boolean;
  transferHeld?: boolean;
}) {
  const deposit = formatGBP(amountCents);
  const payoutHeld = !refunded && transferHeld;
  const payoutDisplay = resolvePayoutDisplay(amountCents, waived, refunded, transferHeld);

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Deposit</span>
        <span className="font-mono">{deposit}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-al-on-surface-variant">Platform fee</span>
        <span className="font-mono text-al-on-surface-variant">
          {refunded ? (
            <em>Returned</em>
          ) : waived ? (
            <em>Waived</em>
          ) : (
            <>-{formatGBP(PLATFORM_FEE_CENTS)}</>
          )}
        </span>
      </div>
      <div className="border-t border-dashed border-al-outline-variant" />
      <div className="flex justify-between items-baseline" style={{ fontSize: "19px", fontWeight: 800, color: payoutHeld ? "var(--al-status-caution, #b45309)" : "var(--al-primary)" }}>
        <span>Your payout</span>
        <span className="font-mono">{payoutDisplay}</span>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  paid:    { bg: "var(--al-status-positive-bg, rgba(56,142,60,0.10))", color: "var(--al-status-positive)" },
  pending: { bg: "rgba(245,166,35,0.12)",                              color: "var(--al-status-caution, #b45309)" },
  failed:  { bg: "var(--al-status-negative-bg, rgba(186,26,26,0.10))", color: "var(--al-status-negative, #ba1a1a)" },
  unpaid:  { bg: "var(--al-surface-container-low)",                    color: "var(--al-on-surface-variant)" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: "var(--al-surface-container-low)", color: "var(--al-on-surface-variant)" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="material-symbols-outlined text-xl text-al-on-surface-variant"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-al-on-surface-variant">{body}</p>
      </div>
    </div>
  );
}

export function PaymentCard({
  amountCents,
  currency,
  paymentStatus,
  paymentRequired,
  financialOutcome,
  resolvedAt,
  formatter,
  stripeOnboardingStatus,
  isConnectPayment,
  depositSkipped,
  transferHeld = false,
}: PaymentCardProps) {
  const feeState = determineFeeState(amountCents, paymentRequired, isConnectPayment, depositSkipped);
  const refunded = financialOutcome === "refunded";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="text-sm font-medium text-al-on-surface-variant">
        Payment
      </h2>

      {(feeState === "connect" || feeState === "waived") && amountCents != null && (
        <>
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-sm"
              style={{ color: "var(--al-primary)", fontSize: "14px" }}
              aria-hidden="true"
            >
              credit_card
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--al-primary)" }}
            >
              Stripe Connect
            </span>
          </div>
          <FeeBreakdown amountCents={amountCents} waived={feeState === "waived"} refunded={refunded} transferHeld={transferHeld} />
          <p
            className="flex items-center gap-1 text-xs"
            style={{ color: !refunded && transferHeld ? "var(--al-status-caution, #b45309)" : "var(--al-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }} aria-hidden="true">
              {resolveHelperIcon(refunded, transferHeld)}
            </span>
            {resolveHelperText(refunded, transferHeld)}
          </p>
        </>
      )}

      {feeState === "legacy" && !refunded && (
        <div className="flex justify-between text-sm">
          <span>Amount</span>
          <span className="font-mono font-semibold">
            {amountCents != null && currency
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: currency.toUpperCase(),
                }).format(amountCents / 100)
              : "—"}
          </span>
        </div>
      )}

      {feeState === "legacy" && refunded && (
        <div className="flex justify-between text-sm">
          <span>Outcome</span>
          <span className="font-semibold">Refunded</span>
        </div>
      )}

      {feeState === "skipped" && (
        <>
          <EmptyState
            icon="link_off"
            title="No deposit collected"
            body="Stripe was not connected when this booking was made, so no deposit could be held."
          />
          {stripeOnboardingStatus !== "complete" && (
            <a
              href="/app/settings/stripe-connect"
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: "var(--al-primary)" }}
            >
              Connect Stripe
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </a>
          )}
        </>
      )}

      {feeState === "policy" && (
        <EmptyState
          icon="check_circle"
          title="No deposit required"
          body="This booking followed your payment policy, which does not collect a deposit."
        />
      )}

      {/* Payment metadata — shown for all states that have a payment (hidden for legacy+refunded) */}
      {(feeState === "connect" ||
        feeState === "waived" ||
        (feeState === "legacy" && !refunded)) && (
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-al-on-surface-variant">Payment status</span>
            <StatusBadge status={paymentStatus} />
          </div>
          <p>
            Outcome:{" "}
            <span className="capitalize">{financialOutcome}</span>
          </p>
          <p className="text-al-on-surface-variant">
            Resolved at:{" "}
            {resolvedAt ? formatter.format(new Date(resolvedAt)) : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
