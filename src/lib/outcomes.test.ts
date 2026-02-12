import { describe, expect, it } from "vitest";
import { backfillCancelledOutcome, resolveFinancialOutcome } from "./outcomes";

describe("resolveFinancialOutcome", () => {
  it("voids when payment not required", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: false,
      paymentStatus: null,
    });
    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "no_payment_required",
    });
  });

  it("settles when payment succeeded", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: true,
      paymentStatus: "succeeded",
    });
    expect(result).toEqual({
      financialOutcome: "settled",
      resolutionReason: "payment_captured",
    });
  });

  it("voids when payment required but not captured", () => {
    const result = resolveFinancialOutcome({
      paymentRequired: true,
      paymentStatus: "failed",
    });
    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "payment_not_captured",
    });
  });
});

describe("backfillCancelledOutcome", () => {
  it("returns refunded when stripe refund exists", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 2000,
      stripeRefundId: "re_123abc",
      paymentStatus: "succeeded",
    });

    expect(result).toEqual({
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    });
  });

  it("returns refunded when refunded amount is positive", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 2000,
      stripeRefundId: null,
      paymentStatus: "succeeded",
    });

    expect(result).toEqual({
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    });
  });

  it("returns settled when payment succeeded without refund", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: "succeeded",
    });

    expect(result).toEqual({
      financialOutcome: "settled",
      resolutionReason: "cancelled_no_refund_after_cutoff",
    });
  });

  it("returns voided when payment did not succeed", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: "failed",
    });

    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "cancelled_no_payment_captured",
    });
  });

  it("returns voided when no payment exists", () => {
    const result = backfillCancelledOutcome({
      refundedAmountCents: 0,
      stripeRefundId: null,
      paymentStatus: null,
    });

    expect(result).toEqual({
      financialOutcome: "voided",
      resolutionReason: "cancelled_no_payment_captured",
    });
  });
});
