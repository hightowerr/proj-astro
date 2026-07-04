# Spec 13: Integration Test — End-to-End Suspension Flow

**Priority**: Final (ships last)

## Summary
Integration test covering the full suspension → payment → refund cascade to verify all specs work together without compounding failures.

## Scenarios
1. **Refund during suspension** — Setup: shop suspended, appointment with paid PI but no transfer. Action: trigger refund. Assert: fallback catch fires, refund succeeds without reverse_transfer, appointment marked refunded.
2. **Detection guard fires** — Setup: shop suspended. Action: deliver payment_intent.succeeded webhook. Assert: appointment has `transferHeld: true`.
3. **Sweep cancels in-flight** — Setup: shop has pending appointment with PI. Action: deliver account.updated with charges_enabled=false. Assert: PI cancelled via Stripe, appointment updated.
4. **Sweep flags recent** — Setup: shop has appointment paid 30 mins ago. Action: deliver account.updated with charges_enabled=false. Assert: appointment has `transferHeld: true`.
5. **Full cascade** — Setup: shop active, customer mid-checkout. Action: suspend shop → payment succeeds in race → attempt refund. Assert: no error at any step, customer refunded, platform absorbed fee.

## Scope
- **File**: integration test file
- Uses Stripe test mode or mocked Stripe client
- Exercises webhook handlers + refund path + DB state transitions

## Dependencies
- **Requires**: Spec 01, Spec 03, Spec 07, Spec 08 (all backend logic)

## Out of scope
- UI integration tests (card states tested in spec 11)
- Load testing / race condition timing tests (future)
