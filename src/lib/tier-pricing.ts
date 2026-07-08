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

/**
 * Platform-wide minimum deposit in pence.
 * TRIPWIRE: When multi-currency ships (roadmap.md), this must become
 * currency-aware. JPY has no subunit: ¥100 ≈ 50p. Also review if the
 * platform fee changes from flat 50p to percentage-based.
 */
export const PLATFORM_MINIMUM_DEPOSIT_CENTS = 100;

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

  let amountCents = policy.depositAmountCents ?? 0;
  if (amountCents <= 0) {
    return { paymentRequired: false, amountCents: 0 };
  }

  // Platform minimum: deposits must be economically viable
  if (amountCents < PLATFORM_MINIMUM_DEPOSIT_CENTS) {
    amountCents = PLATFORM_MINIMUM_DEPOSIT_CENTS;
  }

  return { paymentRequired: true, amountCents };
}
