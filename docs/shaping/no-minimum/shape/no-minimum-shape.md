# No Minimum Deposit Floor — Shape

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R0 | Deposits between 1p–99p must be clamped to 100p (£1) at the business logic layer | Mental models analysis (Margin of Safety, Necessity & Sufficiency) |
| R1 | Zero-amount deposits (`topDepositWaived = true`) must bypass the floor | Mental models analysis (Inversion — "what would make this fail?") |
| R2 | `policyVersions` snapshot must store the clamped value, not pre-clamp | Mental models analysis (Second-Order Thinking) |
| R3 | No schema changes, no UI changes, no merchant-configurable minimum | Mental models analysis (Via Negativa) |
| R4 | Single exported constant used by both enforcement points | Mental models analysis (Bottleneck Analysis) |
| R5 | Tripwire documented for multi-currency and fee model changes | Mental models analysis (Inversion) |

## Shape A — Dual-Point Floor Clamp (selected)

Export `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100` from `tier-pricing.ts`. Enforce at two points:

1. **Primary** (`appointments.ts:~861`): Clamp `finalDepositCents` after all tier/event-type overrides resolve, BEFORE the `policyVersions` snapshot insert — so the snapshotted value is truthful.
2. **Belt-and-suspenders** (`tier-pricing.ts:derivePaymentRequirement()`): Clamp inside the function that all deposit amounts flow through — catches any future caller that bypasses `createAppointment()`.

Guard: `amountCents > 0 && amountCents < 100` — zero from `topDepositWaived` passes through untouched.

**Why £1 (100p):**
- 2× the fee-waiver threshold (50p) — platform earns 50p on every deposit
- 3.3× Stripe's minimum (~30p GBP) — prevents runtime API errors
- Imperceptible to customers (50p→£1 difference is trivial vs service value)

## Rejected shapes

| Shape | Why rejected |
|-------|-------------|
| B — `minimumDepositCents` column on `shopPolicies` | No merchant has requested it; existing deposit amount controls serve the same purpose; creates precedence question with tier overrides (Via Negativa) |
| C — Enforce at each of 4 input points (settings UI) | 4× validation code that can drift; the chokepoint catches everything (Bottleneck Analysis) |
| D — `console.warn` when floor triggers | This is normal business logic, not an anomaly — the merchant didn't do anything wrong |

## Fit check

| Req | Shape A |
|-----|---------|
| R0 | Yes — clamp in both `createAppointment()` and `derivePaymentRequirement()` |
| R1 | Yes — guard is `> 0 && < 100`; zero passes through |
| R2 | Yes — clamp applied before `policyVersions` insert |
| R3 | Yes — no schema, no UI, constant not configurable |
| R4 | Yes — single exported constant imported by both files |
| R5 | Yes — inline tripwire comment above constant |

## Spikes needed

None. All unknowns pre-resolved by mental models analysis:
- `topDepositWaived` sets `amountCents = 0` upstream in `applyTierPricingOverride()` (verified at `tier-pricing.ts:38`)
- `derivePaymentRequirement()` early-returns for `amountCents <= 0` (verified at `tier-pricing.ts:66-68`)
- `finalDepositCents` feeds both `derivePaymentRequirement()` and `policyVersions` insert (verified at `appointments.ts:862-876`)
- `paymentMode: "none"` early-returns before floor check (verified at `tier-pricing.ts:61-63`)

## Architecture mapping

- No conflicts with invariants 1-15
- Adds invariant 16 (platform minimum deposit floor) — documented in `_build-order.md` architecture updates section

## Analysis source

Mental models report (12 models, all converge — Margin of Safety, Leverage Points, Second-Order Thinking, Feedback Loops, Inversion, Via Negativa, Bias from Incentives, Path Dependence, Bottleneck Analysis, False Trade-offs, Moral Hazard, Necessity & Sufficiency) at `mcp-go/Mental Models/WorkSpace/26-06-30_17-50-28_no_minimum_deposit_floor/analysis-report.md`.
