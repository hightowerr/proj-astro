# Spec 09: Unit Tests — Refund Fallback

**Priority**: P1 (ships with spec 01)

## Summary
Unit tests for the refund fallback catch clause added in spec 01.

## Test cases
1. **Happy path unchanged** — refund with `reverse_transfer: true` succeeds → no retry
2. **No-transfer error triggers fallback** — first call throws Stripe "no transfer to reverse" error → retry without `reverse_transfer` / `refund_application_fee` → succeeds
3. **Fallback also fails** — both calls throw → error propagated to caller
4. **Other Stripe errors not caught** — unrelated Stripe error (e.g., "amount too large") → no retry, error propagated immediately
5. **Idempotency key differs on retry** — fallback call uses a distinct idempotency key suffix

## Scope
- **File**: test file co-located with `stripe-refund.ts` or in test directory
- Mock `stripe.refunds.create()` to control error responses

## Dependencies
- **Requires**: Spec 01 (code under test)

## Out of scope
- Integration tests with real Stripe API (see spec 13)
