# 02 — Appointment Floor Clamp (Primary Enforcement)

## Summary
Clamp `finalDepositCents` in `createAppointment()` after all tier/event-type overrides resolve, BEFORE the `policyVersions` snapshot insert. This is the primary enforcement — ensures the snapshotted value is truthful (clamped, not pre-clamp).

## Prerequisites
- Depends on: 01 (imports `PLATFORM_MINIMUM_DEPOSIT_CENTS`)

## Changes

**Modified file:** `src/lib/queries/appointments.ts`

### Implementation

After line 860 (where `finalDepositCents` is fully resolved from tier + event-type overrides), before line 862 (`derivePaymentRequirement` call):

```ts
import { PLATFORM_MINIMUM_DEPOSIT_CENTS } from "@/lib/tier-pricing";

// ... inside createAppointment(), after finalDepositCents is computed:

// Platform floor: clamp sub-minimum deposits before policy snapshot
const clampedDepositCents =
  finalDepositCents !== null &&
  finalDepositCents > 0 &&
  finalDepositCents < PLATFORM_MINIMUM_DEPOSIT_CENTS
    ? PLATFORM_MINIMUM_DEPOSIT_CENTS
    : finalDepositCents;
```

Then use `clampedDepositCents` in place of `finalDepositCents` for:
1. The `derivePaymentRequirement()` call (line 862)
2. The `policyVersions` insert (line 876)

### Why here, not only in derivePaymentRequirement?

The `policyVersions` snapshot (line 870-881) records `depositAmountCents: finalDepositCents`. If the floor only exists in `derivePaymentRequirement()`, the policy version stores the pre-clamp value (e.g., 75p) while the actual charge is 100p — a forensic discrepancy. Clamping before the snapshot keeps the policy version truthful.

### Design decisions

- **New `const clampedDepositCents`** — avoids mutating the existing `const finalDepositCents`. Cleaner than changing it to `let`.
- **Same guard as spec 01** — `> 0 && < PLATFORM_MINIMUM_DEPOSIT_CENTS`. Zero (from `topDepositWaived`) passes through.
- **`import` already exists partially** — `derivePaymentRequirement` and `applyTierPricingOverride` are already imported from `@/lib/tier-pricing`. Add `PLATFORM_MINIMUM_DEPOSIT_CENTS` to the existing import.

## Acceptance
- `clampedDepositCents` replaces `finalDepositCents` in both `derivePaymentRequirement()` call and `policyVersions` insert
- A booking with a 50p tier-override deposit stores `depositAmountCents: 100` in `policyVersions`, not 50
- A booking with a waived deposit (`topDepositWaived = true`) stores `depositAmountCents: 0` in `policyVersions` (floor not triggered)
- A booking with a £5 deposit stores `depositAmountCents: 500` (floor not triggered)
