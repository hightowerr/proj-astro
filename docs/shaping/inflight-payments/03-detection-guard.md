# Spec 03: Detection Guard at payment_intent.succeeded

**Priority**: P2 (HIGH)

## Summary
After marking a payment as succeeded in `webhook/route.ts`, check the shop's `stripeOnboardingStatus`. If `"suspended"`, set `transferHeld: true` on the appointment and surface a dashboard action item. This is the PRIMARY mechanism for catching transfer failures — Stripe does not send a `transfer.failed` event.

## Behaviour
- In `handlePaymentIntent()` for `payment_intent.succeeded`:
  1. After updating appointment to `paymentStatus: "paid"`, query the shop's `stripeOnboardingStatus`
  2. If status is `"suspended"`:
     - Update appointment: `transferHeld: true`
     - `console.warn("Payment succeeded but transfer held — shop %s suspended", shopId)`
  3. If status is NOT `"suspended"`: no change to existing flow
- The `transfer.created` webhook (already live) provides belt-and-suspenders confirmation that the transfer DID succeed, but this guard must not depend on it

## Scope
- **File**: `src/app/api/stripe/webhook/route.ts` — `handlePaymentIntent()` (~lines 23-80), specifically the `payment_intent.succeeded` branch (~line 209-233)
- Requires a shop lookup by `stripeAccountId` from `intent.transfer_data.destination` — webhook has NO existing shop context (spike finding), must add direct query: `shops.findFirst({ where: eq(stripeAccountId, destination) })`

## Dependencies
- **Requires**: Spec 02 (transferHeld column exists)

## Out of scope
- UI display of transferHeld state (see specs 04, 05)
- Dashboard action item rendering (see spec 06)
- Cancelling in-flight PaymentIntents (see spec 07 — that's the sweep, not the guard)
