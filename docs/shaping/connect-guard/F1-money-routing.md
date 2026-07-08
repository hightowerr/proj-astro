# F1 — Derive paymentsEnabled from Connect status in acceptOffer

## Classification
**Type:** Financial bug fix (critical path)
**Risk:** Medium — changes money routing behaviour
**File:** `src/lib/slot-recovery.ts`

## Problem
`acceptOffer()` at line ~530 hardcodes `paymentsEnabled: true` in its `createAppointment()` call. This bypasses the Connect guard that the booking page enforces (`book/[slug]/page.tsx:51`). When Connect onboarding is incomplete, the PaymentIntent is created without `transfer_data` (`appointments.ts:1176`), routing the deposit to the platform account instead of the merchant.

**Worst case (Inversion):** Merchant abandons platform without completing Connect — customer's deposit is trapped in the platform account indefinitely.

## Root cause
Path dependence: slot recovery (VS6) was built before Connect existed. Hardcoding `true` was correct when all payments went to the platform account. Connect changed the routing contract but never updated this call site.

## Change
```diff
-  paymentsEnabled: true,
+  paymentsEnabled: openOffer.shop.stripeOnboardingStatus === "complete",
```

Single-line change at `acceptOffer()` line ~530.

## Behaviour after fix
| Connect status | paymentsEnabled | PaymentIntent created? | Deposit routed to |
|---|---|---|---|
| `complete` | `true` | Yes, with `transfer_data` | Merchant |
| anything else | `false` | No | N/A (free booking) |

## Dependencies
- **Requires:** P0 (query must include `stripeOnboardingStatus`)
- **Blocks:** F3 (SMS cross-dependency needs F1 shipped first)
- **Independent of:** F2

## Verification
- `pnpm check` passes
- Unit test: call `acceptOffer()` with `shop.stripeOnboardingStatus !== "complete"` — assert `createAppointment` called with `paymentsEnabled: false`
- Unit test: call `acceptOffer()` with `shop.stripeOnboardingStatus === "complete"` — assert `createAppointment` called with `paymentsEnabled: true`

## Design impact
None — backend logic change only.

## Not chosen
- Enforce Connect check inside `createAppointment()` — violates caller-owns-decision contract
- Block offer sending for non-Connect shops — merchant may complete Connect between offer send and customer reply
- Change `createAppointment()` default for `paymentsEnabled` from `true` to required — too many callers to audit (noted as latent risk)
