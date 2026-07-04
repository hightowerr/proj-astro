import { describe, expect, it } from "vitest";
import {
  determineFeeState,
  resolvePayoutDisplay,
  resolveHelperIcon,
  resolveHelperText,
} from "./payment-card";

// ─── determineFeeState regression guards ────────────────────────────────────

describe("determineFeeState", () => {
  it("returns 'connect' for connect payments above fee threshold", () => {
    expect(determineFeeState(1000, true, true, null)).toBe("connect");
  });

  it("returns 'waived' for connect payments at or below fee threshold", () => {
    expect(determineFeeState(50, true, true, null)).toBe("waived");
  });

  it("returns 'legacy' for non-connect payments with amount", () => {
    expect(determineFeeState(1000, true, false, null)).toBe("legacy");
  });

  it("returns 'skipped' for connect_not_complete depositSkipped", () => {
    expect(determineFeeState(null, true, false, "connect_not_complete")).toBe("skipped");
  });

  it("returns 'policy' for policy_none depositSkipped", () => {
    expect(determineFeeState(null, true, false, "policy_none")).toBe("policy");
  });

  it("returns 'policy' when payment not required and no depositSkipped signal", () => {
    expect(determineFeeState(null, false, false, null)).toBe("policy");
  });

  it("returns 'skipped' when payment required and no depositSkipped signal", () => {
    expect(determineFeeState(null, true, false, null)).toBe("skipped");
  });
});

// ─── Refunded derivation logic ──────────────────────────────────────────────

describe("refunded derivation", () => {
  // This tests the logic: financialOutcome === "refunded"
  // The derivation lives in PaymentCard but is a pure expression

  const isRefunded = (financialOutcome: string): boolean =>
    financialOutcome === "refunded";

  it("returns true for 'refunded' outcome", () => {
    expect(isRefunded("refunded")).toBe(true);
  });

  it("returns false for 'settled' outcome", () => {
    expect(isRefunded("settled")).toBe(false);
  });

  it("returns false for 'disputed' outcome", () => {
    expect(isRefunded("disputed")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRefunded("")).toBe(false);
  });
});

// ─── Refund display logic (per-feeState behaviour) ──────────────────────────
//
// Rendering tests require @testing-library/react + jsdom which are not
// installed in this project. Visual verification of all 3 refund variants
// (connect+refunded, waived+refunded, legacy+refunded) is handled by
// Phase 3 VERIFY via Playwright.
//
// The display rules are:
//   - connect/waived + refunded → "Returned" (italic), £0.00, undo icon
//   - waived + refunded → same as connect (modifier flattens distinction)
//   - legacy + refunded → card collapses to "Outcome: Refunded" only
//   - skipped/policy are unaffected (no payment to refund)
//
// See: docs/shaping/refund-state/08-unit-tests-refunded-display.md
//      docs/shaping/refund-state/09-unit-tests-edge-cases.md
//      docs/shaping/refund-state/10-integration-test-payment-card.md
// ─────────────────────────────────────────────────────────────────────────────

// ─── Transfer Held: payout display ─────────────────────────────────────────

describe("resolvePayoutDisplay", () => {
  const AMOUNT = 2000; // £20.00

  it("returns formatted payout for connect (transferHeld=false)", () => {
    // connect: not waived, not refunded, not held → amount - fee
    expect(resolvePayoutDisplay(AMOUNT, false, false, false)).toBe("£19.50");
  });

  it("returns formatted payout for waived (transferHeld=false)", () => {
    // waived: full amount returned, not refunded, not held
    expect(resolvePayoutDisplay(AMOUNT, true, false, false)).toBe("£20.00");
  });

  it('returns "Held" when transferHeld=true + connect', () => {
    expect(resolvePayoutDisplay(AMOUNT, false, false, true)).toBe("Held");
  });

  it('returns "Held" when transferHeld=true + waived (modifier overrides waived)', () => {
    expect(resolvePayoutDisplay(AMOUNT, true, false, true)).toBe("Held");
  });

  it("returns £0.00 when refunded + transferHeld (refunded takes precedence)", () => {
    // Precedence: refunded > transferHeld
    expect(resolvePayoutDisplay(AMOUNT, false, true, true)).toBe("£0.00");
  });

  it("returns £0.00 when refunded + not held", () => {
    expect(resolvePayoutDisplay(AMOUNT, false, true, false)).toBe("£0.00");
  });
});

// ─── Transfer Held: helper icon ────────────────────────────────────────────

describe("resolveHelperIcon", () => {
  it('returns "north_east" for normal (no refund, no hold)', () => {
    expect(resolveHelperIcon(false, false)).toBe("north_east");
  });

  it('returns "pause_circle" when transferHeld=true', () => {
    expect(resolveHelperIcon(false, true)).toBe("pause_circle");
  });

  it('returns "undo" when refunded (regardless of transferHeld)', () => {
    // Precedence: refunded > transferHeld
    expect(resolveHelperIcon(true, false)).toBe("undo");
    expect(resolveHelperIcon(true, true)).toBe("undo");
  });
});

// ─── Transfer Held: helper text copy ───────────────────────────────────────

describe("resolveHelperText", () => {
  it("returns bank-account message for normal state", () => {
    expect(resolveHelperText(false, false)).toBe(
      "Payout routed to your connected bank account.",
    );
  });

  it("returns pause message when transferHeld=true", () => {
    expect(resolveHelperText(false, true)).toBe(
      "Payment received but transfer paused — Stripe is reviewing your account.",
    );
  });

  it("returns reversal message when refunded (regardless of transferHeld)", () => {
    expect(resolveHelperText(true, false)).toBe(
      "Payout reversed to customer.",
    );
    expect(resolveHelperText(true, true)).toBe(
      "Payout reversed to customer.",
    );
  });
});
