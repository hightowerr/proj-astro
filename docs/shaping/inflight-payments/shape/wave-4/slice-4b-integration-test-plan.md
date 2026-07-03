# Slice 4b: Integration Test — End-to-End Suspension Flow

**Spec**: 13 | **Priority**: Final | **File**: Integration test file

## Work

### Test scenarios
1. **Refund during suspension**: Shop suspended, appointment with paid PI but no transfer → trigger refund → fallback fires, refund succeeds without reverse_transfer, appointment marked refunded
2. **Detection guard fires**: Shop suspended → deliver `payment_intent.succeeded` webhook → appointment has `transferHeld: true`
3. **Sweep cancels in-flight**: Shop has pending appointment with PI → deliver `account.updated` with `charges_enabled=false` → PI cancelled, appointment updated
4. **Sweep flags recent**: Shop has appointment paid 30 mins ago → deliver `account.updated` with `charges_enabled=false` → appointment has `transferHeld: true`
5. **Full cascade**: Shop active, customer mid-checkout → suspend shop → payment succeeds in race → attempt refund → no error at any step

### Mocking strategy
- Use Stripe test mode or mock Stripe client
- Exercise webhook handlers + refund path + DB state transitions
- Verify DB state at each step (not just final state)

## Acceptance criteria
- [ ] 5 integration scenarios covering the full suspension → payment → refund cascade
- [ ] Each scenario verifies DB state transitions
- [ ] No error at any step in the full cascade test
- [ ] All tests pass, lint + type-check pass

## Dependencies
- **Requires**: Slices 1a, 2a, 1c, 2d (all backend logic)
