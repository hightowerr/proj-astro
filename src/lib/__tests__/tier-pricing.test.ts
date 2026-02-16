import { describe, expect, it } from "vitest";
import {
  applyTierPricingOverride,
  derivePaymentRequirement,
  type BasePolicy,
  type TierOverrides,
} from "@/lib/tier-pricing";

const basePolicy: BasePolicy = {
  paymentMode: "deposit",
  depositAmountCents: 2000,
};

const noOverrides: TierOverrides = {
  riskPaymentMode: null,
  riskDepositAmountCents: null,
  topDepositWaived: false,
  topDepositAmountCents: null,
};

describe("applyTierPricingOverride", () => {
  it("uses base policy for neutral tier", () => {
    const result = applyTierPricingOverride("neutral", basePolicy, noOverrides);

    expect(result.paymentMode).toBe("deposit");
    expect(result.depositAmountCents).toBe(2000);
    expect(result.appliedTier).toBe("neutral");
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("uses base policy for null tier", () => {
    const result = applyTierPricingOverride(null, basePolicy, noOverrides);

    expect(result.paymentMode).toBe("deposit");
    expect(result.depositAmountCents).toBe(2000);
    expect(result.appliedTier).toBe("neutral_default");
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("applies risk amount override", () => {
    const result = applyTierPricingOverride("risk", basePolicy, {
      ...noOverrides,
      riskDepositAmountCents: 5000,
    });

    expect(result.paymentMode).toBe("deposit");
    expect(result.depositAmountCents).toBe(5000);
    expect(result.appliedTier).toBe("risk");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("applies risk payment mode override when provided", () => {
    const result = applyTierPricingOverride("risk", basePolicy, {
      ...noOverrides,
      riskPaymentMode: "full_prepay",
      riskDepositAmountCents: 5000,
    });

    expect(result.paymentMode).toBe("full_prepay");
    expect(result.depositAmountCents).toBe(5000);
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("falls back to base policy when risk override is not configured", () => {
    const result = applyTierPricingOverride("risk", basePolicy, noOverrides);

    expect(result.paymentMode).toBe("deposit");
    expect(result.depositAmountCents).toBe(2000);
    expect(result.tierOverrideApplied).toBe(false);
  });

  it("waives top tier deposit", () => {
    const result = applyTierPricingOverride("top", basePolicy, {
      ...noOverrides,
      topDepositWaived: true,
      topDepositAmountCents: 1000,
    });

    expect(result.depositAmountCents).toBe(0);
    expect(result.appliedTier).toBe("top");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("uses top tier reduced amount when not waived", () => {
    const result = applyTierPricingOverride("top", basePolicy, {
      ...noOverrides,
      topDepositWaived: false,
      topDepositAmountCents: 1000,
    });

    expect(result.depositAmountCents).toBe(1000);
    expect(result.appliedTier).toBe("top");
    expect(result.tierOverrideApplied).toBe(true);
  });

  it("falls back to base policy when top override is unset", () => {
    const result = applyTierPricingOverride("top", basePolicy, noOverrides);

    expect(result.depositAmountCents).toBe(2000);
    expect(result.tierOverrideApplied).toBe(false);
  });
});

describe("derivePaymentRequirement", () => {
  it("requires payment for positive amounts", () => {
    expect(
      derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 2000 })
    ).toEqual({
      paymentRequired: true,
      amountCents: 2000,
    });
  });

  it("does not require payment for zero amount", () => {
    expect(
      derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 0 })
    ).toEqual({
      paymentRequired: false,
      amountCents: 0,
    });
  });

  it("does not require payment for paymentMode none", () => {
    expect(
      derivePaymentRequirement({ paymentMode: "none", depositAmountCents: 5000 })
    ).toEqual({
      paymentRequired: false,
      amountCents: 0,
    });
  });

  it("does not require payment for negative amounts", () => {
    expect(
      derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: -100 })
    ).toEqual({
      paymentRequired: false,
      amountCents: 0,
    });
  });
});
