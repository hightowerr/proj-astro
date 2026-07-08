# 01 — Platform Floor Constant + derivePaymentRequirement Clamp

## Summary
Export `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100` from `tier-pricing.ts` and add belt-and-suspenders floor enforcement inside `derivePaymentRequirement()`. Any future caller that bypasses `createAppointment()` is still protected.

## Prerequisites
- Depends on: none

## Changes

**Modified file:** `src/lib/tier-pricing.ts`

### Implementation

Add the exported constant at module top:

```ts
export const PLATFORM_MINIMUM_DEPOSIT_CENTS = 100;
```

Modify `derivePaymentRequirement()` to clamp sub-floor amounts:

```ts
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
```

### Design decisions

- **`const` not `let`** — the floor is a platform invariant, not configurable per-merchant.
- **`amountCents` changes from `const` to `let`** — required for the clamp mutation.
- **Check is `amountCents > 0 && amountCents < 100`** — zero (from `topDepositWaived`) must pass through untouched. The `<= 0` early return already handles this, so the floor check only fires for positive sub-floor values.
- **No `console.warn`** — this is normal business logic, not an anomaly.

## Acceptance
- `PLATFORM_MINIMUM_DEPOSIT_CENTS` is exported and equals `100`
- `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 50 })` returns `{ paymentRequired: true, amountCents: 100 }`
- `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 0 })` returns `{ paymentRequired: false, amountCents: 0 }`
- `derivePaymentRequirement({ paymentMode: "none", depositAmountCents: 50 })` returns `{ paymentRequired: false, amountCents: 0 }`
- `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 100 })` returns `{ paymentRequired: true, amountCents: 100 }` (at-floor, no clamp)
- `derivePaymentRequirement({ paymentMode: "deposit", depositAmountCents: 500 })` returns `{ paymentRequired: true, amountCents: 500 }` (above-floor, no clamp)
