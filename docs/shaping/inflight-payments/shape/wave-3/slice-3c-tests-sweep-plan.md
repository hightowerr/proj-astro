# Slice 3c: Unit Tests — Suspension Sweep

**Spec**: 12 | **Priority**: P3 | **File**: Test file for connect-webhook handler

## Work

### Test cases — Cancel pending (spec 07)
1. **No pending appointments**: sweep runs, no Stripe calls
2. **Pending appointments cancelled**: 2 pending with PI IDs → both `paymentIntents.cancel()` called
3. **PI already succeeded in race**: cancel throws → logged as warning, continues
4. **PI already cancelled**: idempotent, no error
5. **Non-suspension change**: `charges_enabled` stays true → sweep not triggered

### Test cases — Flag recent (spec 08)
6. **No recent payments**: no appointments in 1h window → no updates
7. **Recent payment flagged**: paid within 1h → `transferHeld` set true
8. **Old payment not flagged**: paid 2h ago → not touched
9. **Already flagged**: `transferHeld` already true → no double-update

### Mocking strategy
- Mock `stripe.paymentIntents.cancel()` for cancel tests
- Mock DB queries for appointment lookups
- Mock `Date.now()` for time-window tests
- Follow patterns from existing `connect-webhook/route.test.ts`

## Acceptance criteria
- [ ] 9 test cases covering both sweep operations
- [ ] Cancel and flag logic tested independently
- [ ] Error handling tested (PI cancel failures logged, not thrown)
- [ ] Time window boundary tested
- [ ] All tests pass, lint + type-check pass

## Dependencies
- **Requires**: Slices 1c + 2d (sweep code under test)
