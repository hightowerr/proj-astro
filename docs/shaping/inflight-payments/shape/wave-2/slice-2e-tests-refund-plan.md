# Slice 2e: Unit Tests — Refund Fallback

**Spec**: 09 | **Priority**: P1 | **File**: Test file co-located with `stripe-refund.ts`

## Work

### 1. Test `isReverseTransferFailedError()` (pure function — extract-for-testability)
- Import and test directly, zero mocks needed
- Test cases:
  1. Stripe error with "no transfer to reverse" message → `true`
  2. Stripe error with "charge_already_refunded" → `false` (different error type)
  3. Non-Stripe error → `false`
  4. Stripe error with unrelated message → `false`

### 2. Test fallback retry logic
- Mock `stripe.refunds.create()`:
  1. **Happy path**: first call succeeds → no retry, refund returned
  2. **Fallback triggers**: first call throws reverse-transfer error → retry called without `reverse_transfer`/`refund_application_fee` → succeeds
  3. **Fallback also fails**: both calls throw → error propagated
  4. **Other error**: unrelated Stripe error → no retry, error propagated immediately
  5. **Idempotency key**: verify fallback uses `refund-fallback-` prefix (distinct from original)

## Acceptance criteria
- [ ] `isReverseTransferFailedError()` tested as pure function (no mocks)
- [ ] Happy path: no retry when refund succeeds
- [ ] Fallback: retry without reverse_transfer on no-transfer error
- [ ] Fallback failure: error propagated
- [ ] Other errors: not caught by fallback
- [ ] Idempotency key verified
- [ ] All tests pass, lint + type-check pass

## Dependencies
- **Requires**: Slice 1a (code under test)
