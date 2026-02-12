export type ResolutionReason =
  | "no_payment_required"
  | "payment_captured"
  | "payment_not_captured"
  | "cancelled_refunded_before_cutoff"
  | "cancelled_no_refund_after_cutoff"
  | "cancelled_no_payment_captured";

export type ResolvedOutcome = "settled" | "voided" | "refunded";

export const resolveFinancialOutcome = (input: {
  paymentRequired: boolean;
  paymentStatus?: string | null;
}): { financialOutcome: ResolvedOutcome; resolutionReason: ResolutionReason } => {
  if (!input.paymentRequired) {
    return {
      financialOutcome: "voided",
      resolutionReason: "no_payment_required",
    };
  }

  if (input.paymentStatus === "succeeded") {
    return {
      financialOutcome: "settled",
      resolutionReason: "payment_captured",
    };
  }

  return {
    financialOutcome: "voided",
    resolutionReason: "payment_not_captured",
  };
};

export const backfillCancelledOutcome = (input: {
  refundedAmountCents: number;
  stripeRefundId: string | null;
  paymentStatus: string | null;
}): { financialOutcome: ResolvedOutcome; resolutionReason: ResolutionReason } => {
  if (input.refundedAmountCents > 0 || input.stripeRefundId) {
    return {
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    };
  }

  if (input.paymentStatus === "succeeded") {
    return {
      financialOutcome: "settled",
      resolutionReason: "cancelled_no_refund_after_cutoff",
    };
  }

  return {
    financialOutcome: "voided",
    resolutionReason: "cancelled_no_payment_captured",
  };
};
