# Spec 08: Test Transfer Context Lookup

## Summary
Unit tests for `resolveTransferContext()` (spec 01). Verify the charge → PaymentIntent → DB lookup chain handles all paths: happy path, missing charge, missing payment record, missing appointment.

## Test cases
1. **Happy path** — transfer with valid `source_transaction` → charge with `payment_intent` → payment exists in DB → returns full `TransferContext` with all fields populated
2. **No `source_transaction`** — transfer object lacks `source_transaction` (manual transfer, not from a charge) → returns `null`, `console.warn` logged
3. **Charge not found** — `stripe.charges.retrieve` throws 404 → returns `null`, `console.warn` logged
4. **Payment not in DB** — charge has `payment_intent` but no `payments` row matches `stripePaymentIntentId` → returns `null`, `console.warn` logged
5. **Charge has no `payment_intent`** — charge exists but `payment_intent` is `null` (direct charge, not from PI) → returns `null`, `console.warn` logged

## Scope
- Mock `stripe.charges.retrieve` — do not call Stripe in unit tests
- Mock DB query (or use test DB if project has integration test infra)
- Verify `console.warn` is called with descriptive message for each failure path

## Dependencies
- **Prerequisites**: Spec 01 (the function under test)

## Out of scope
- Testing the webhook handler integration (spec 09)
- E2E tests with real Stripe events (spec 07 verification covers this manually)
