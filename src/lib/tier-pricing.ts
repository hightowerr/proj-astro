import type { Tier } from "@/lib/scoring";

export interface BasePolicy {
  paymentMode: "deposit" | "full_prepay" | "none";
  depositAmountCents: number | null;
}

export interface TierOverrides {
  riskPaymentMode: "deposit" | "full_prepay" | "none" | null;
  riskDepositAmountCents: number | null;
  topDepositWaived: boolean;
  topDepositAmountCents: number | null;
}

export interface TierPricingResult {
  paymentMode: "deposit" | "full_prepay" | "none";
  depositAmountCents: number | null;
  appliedTier: Tier | "neutral_default";
  tierOverrideApplied: boolean;
}

export function applyTierPricingOverride(
  tier: Tier | null,
  basePolicy: BasePolicy,
  tierOverrides: TierOverrides
): TierPricingResult {
  let paymentMode = basePolicy.paymentMode;
  let depositAmountCents = basePolicy.depositAmountCents;
  let tierOverrideApplied = false;

  if (tier === "risk" && tierOverrides.riskDepositAmountCents !== null) {
    depositAmountCents = tierOverrides.riskDepositAmountCents;
    tierOverrideApplied = true;
    if (tierOverrides.riskPaymentMode !== null) {
      paymentMode = tierOverrides.riskPaymentMode;
    }
  } else if (tier === "top" && tierOverrides.topDepositWaived) {
    depositAmountCents = 0;
    tierOverrideApplied = true;
  } else if (
    tier === "top" &&
    !tierOverrides.topDepositWaived &&
    tierOverrides.topDepositAmountCents !== null
  ) {
    depositAmountCents = tierOverrides.topDepositAmountCents;
    tierOverrideApplied = true;
  }

  return {
    paymentMode,
    depositAmountCents,
    appliedTier: tier ?? "neutral_default",
    tierOverrideApplied,
  };
}

export function derivePaymentRequirement(policy: {
  paymentMode: "deposit" | "full_prepay" | "none";
  depositAmountCents: number | null;
}): { paymentRequired: boolean; amountCents: number } {
  if (policy.paymentMode === "none") {
    return { paymentRequired: false, amountCents: 0 };
  }

  const amountCents = policy.depositAmountCents ?? 0;
  if (amountCents <= 0) {
    return { paymentRequired: false, amountCents: 0 };
  }

  return { paymentRequired: true, amountCents };
}
