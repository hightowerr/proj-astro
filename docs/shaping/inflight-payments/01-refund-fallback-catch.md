# Spec 01: Refund Fallback Catch Clause

**Priority**: P1 (CRITICAL)

## Summary
In `stripe-refund.ts`, the catch block (~line 212-245) does not handle the case where `reverse_transfer: true` fails because no transfer was ever executed (connected account suspended mid-flight). Detect the "no transfer to reverse" Stripe error and retry the refund without `reverse_transfer: true` / `refund_application_fee: true` — platform absorbs the refund cost.

## Behaviour
- On `stripe.refunds.create()` failure where the Stripe error indicates no transfer exists to reverse:
  - Retry `stripe.refunds.create()` with `reverse_transfer` and `refund_application_fee` omitted
  - Log the fallback event (level: warn) with appointment ID and PaymentIntent ID
- If the retry also fails, propagate the error as today
- No change to the happy path (transfer exists, reverse succeeds)

## Scope
- **File**: `src/lib/stripe-refund.ts` — catch block within `processRefund()` (~line 212-245)
- ~5-line catch clause addition
- No schema changes, no new dependencies

## Dependencies
- **Prerequisites**: None — modifies existing error handling in isolation

## Out of scope
- Dashboard visibility of fallback refunds (see spec 06)
- Alerting/metrics on fallback frequency (future)
- Recovering the platform fee from the merchant post-reinstatement (future)
