# No Minimum Deposit Floor — Build Order

## Dependency Graph

```
01 platform-floor-constant-and-derive-clamp ──┬── 02 appointment-floor-clamp
                                               └── 03 floor-unit-tests

04 tripwire-docs (independent)
```

## Phased Build Order

### Phase 1 — Foundation (no dependencies, all parallel)

| Spec | Description | Files | Est. |
|------|-------------|-------|------|
| 01 | Export `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100`, add floor clamp in `derivePaymentRequirement()` | `src/lib/tier-pricing.ts` (modified) | S |
| 04 | Tripwire documentation — multi-currency + fee model comments | `src/lib/tier-pricing.ts` (comment), docs | S |

### Phase 2 — Integration + Tests (depends on Phase 1)

| Spec | Description | Files | Est. |
|------|-------------|-------|------|
| 02 | Clamp `finalDepositCents` in `createAppointment()` before policy version snapshot | `src/lib/queries/appointments.ts` (modified) | S |
| 03 | 9 unit tests for floor enforcement boundaries | `src/lib/tier-pricing.test.ts` (new) | S |

## Critical Path

```
01 platform-floor-constant → 02 appointment-floor-clamp
```

Longest sequential chain: **2 specs across 2 phases**.

---

## Design Brief

### Design impact: NONE

This is a **backend-only change**. No UI pages are added, modified, or removed. No visual changes to any screen.

| Page | Impact | Designer action |
|------|--------|-----------------|
| Settings — Payment Policy | None — deposit inputs unchanged; floor is enforced server-side | No mockup needed |
| Settings — Event Types | None — per-event deposit inputs unchanged | No mockup needed |
| Booking page (`/book/[slug]`) | None — customer sees final (clamped) amount, no UI change | No mockup needed |
| Dashboard | None — no display change | No mockup needed |
| Manage booking (`/manage/[token]`) | None — refund amounts derived from payment, not policy | No mockup needed |

### Why no design work

The deposit floor is a platform invariant enforced at the business logic layer. It clamps sub-£1 deposits to £1 before they reach the payment system. The customer never sees the pre-clamp value. The merchant's settings UI is unchanged — the floor is not surfaced in the interface.

**Four entry points affected (all server-side, no UI change):**
1. `shopPolicies.depositAmountCents` — base deposit set in Payment Policy settings
2. `eventTypes.depositAmountCents` — per-event override set in Event Type settings
3. `riskDepositAmountCents` — risk tier override set in Payment Policy tier section
4. `topDepositAmountCents` — top tier override set in Payment Policy tier section

All four converge at `createAppointment()` where the floor applies. No input validation is added to any settings form — the chokepoint enforcement catches everything regardless of origin.

### Future design considerations (parked)

If merchants begin noticing that their configured sub-£1 deposit is charged as £1, a tooltip ("Platform minimum: £1") could be added to the deposit amount inputs. Not needed at current scale — the edge case may never occur. Track in current-issues.md if a merchant reports it.

---

## Architecture Context Updates Needed

> **Do not apply yet** — these are queued for the loop contract's architecture update step.

### 1. New invariant for `docs/context/architecture-context.md` § Invariants

Add as invariant #16:

> **Platform minimum deposit floor** — deposits between 1p and 99p are clamped to 100p (£1). Enforced at two points: `finalDepositCents` in `createAppointment()` (before policy snapshot) and `derivePaymentRequirement()` in `tier-pricing.ts` (belt-and-suspenders). Zero-amount deposits (from `topDepositWaived`) bypass the floor. Constant: `PLATFORM_MINIMUM_DEPOSIT_CENTS` exported from `tier-pricing.ts`. Tripwire: review when multi-currency ships (JPY has no subunit) or if platform fee changes from flat 50p to percentage-based.

### 2. Booking creation flow update for `docs/context/architecture-context.md` § Key Flows

In the "Booking Creation" flow (step 4), append:

> 4b. Clamp deposit to platform floor (£1) if sub-minimum after tier/event-type overrides

### 3. Tier scoring interaction note for `docs/context/architecture-context.md` § State Machines

No change needed — the floor is downstream of tier assignment. Tier scoring is unaffected. The tier determines the override amount; the floor clamps the result. These are separate concerns.

---

## Files Changed Summary

| File | Change type | Spec |
|------|-------------|------|
| `src/lib/tier-pricing.ts` | Modified (constant + function logic + tripwire comment) | 01, 04 |
| `src/lib/queries/appointments.ts` | Modified (1 import addition + ~5 lines clamp logic) | 02 |
| `src/lib/tier-pricing.test.ts` | New (9 unit tests) | 03 |

**Total: 2 modified files, 1 new file, ~15 lines of production code, ~50 lines of tests.**
