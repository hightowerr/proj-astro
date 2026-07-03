# Spec 14: Remove `transfer.failed` Dead Code

**Priority**: P3 (cleanup)

## Summary
`transfer.failed` is not a real Stripe event type. Stripe's transfer events are: `transfer.created`, `transfer.reversed`, `transfer.updated`. The handler at `connect-webhook/route.ts:209-227` will never fire — the `(event.type as string) === "transfer.failed"` cast was a workaround for a "type gap" that was actually Stripe's types correctly reflecting reality. Remove the dead handler and its tests.

## Behaviour
- Remove the `else if ((event.type as string) === "transfer.failed")` branch (lines 209-226)
- Remove the `describe("transfer.failed", ...)` test block from `route.test.ts` (lines 240-319)
- The `else` fallback handler ("Unexpected event type") remains — it catches any genuinely unexpected events

## Scope
- **Files**:
  - `src/app/api/stripe/connect-webhook/route.ts` — remove handler branch
  - `src/app/api/stripe/connect-webhook/route.test.ts` — remove `transfer.failed` describe block (3 tests)

## Dependencies
- **Requires**: None — standalone cleanup
- **Should complete before**: Spec 15 (transfer.reversed handler occupies this code slot)

## Out of scope
- Adding replacement handlers (see specs 15, 17)
- Updating Stripe Dashboard webhook subscriptions (see spec 15)
