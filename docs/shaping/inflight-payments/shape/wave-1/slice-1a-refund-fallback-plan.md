# Slice 1a: Refund Fallback Catch Clause

**Spec**: 01 | **Priority**: P1 CRITICAL | **File**: `src/lib/stripe-refund.ts`

## Work

### 1. Create `isReverseTransferFailedError()` helper
- **Where**: After `isAlreadyRefundedError()` (~line 29)
- **Pattern**: Follow exact same structure — check `StripeInvalidRequestError` + error code/message
- **Error detection**: Check for Stripe error messages indicating no transfer to reverse (e.g., regex `/transfer.*not found|no.*transfer.*reverse|cannot.*reverse.*transfer/i`)
- **Pure function** (extract-for-testability pattern) — exported for direct unit testing

### 2. Add fallback retry in catch block
- **Where**: `processRefund()` catch block (~line 212-245)
- **Logic**:
  1. If `isReverseTransferFailedError(error)` AND `usedConnect` is true:
     - Create new refund params WITHOUT `reverse_transfer` and `refund_application_fee`
     - Retry `stripe.refunds.create()` with distinct idempotency key: `refund-fallback-${appointment.id}`
     - `console.warn` the fallback event with appointment ID and PI ID
  2. If retry also fails: re-throw (existing error propagation)
  3. All other errors: unchanged flow

## Acceptance criteria
- [ ] `isReverseTransferFailedError()` exported as pure function
- [ ] Catch block detects no-transfer error and retries without reverse_transfer/refund_application_fee
- [ ] Fallback uses distinct idempotency key (`refund-fallback-` prefix)
- [ ] `console.warn` logged on fallback (not `console.info`)
- [ ] Happy path (transfer exists) unchanged — no behavioral regression
- [ ] Other Stripe errors (disputes, rate limits) still handled by existing catch branches
- [ ] lint + type-check pass

## Dependencies
- None — modifies existing error handling in isolation
