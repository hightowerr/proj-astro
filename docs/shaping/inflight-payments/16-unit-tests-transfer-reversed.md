# Spec 16: Unit Tests — `transfer.reversed` Handler

**Priority**: P2 (ships with spec 15)

## Summary
Unit tests for the `transfer.reversed` webhook handler added in spec 15. Follows the same test pattern as the existing `transfer.created` describe block.

## Test cases
1. **Happy path** — `transfer.reversed` with resolvable context logs `console.error` with `MANUAL_REVIEW_REQUIRED` and all context fields
2. **Unresolvable context** — `transfer.reversed` where `resolveTransferContext` returns null logs `console.error` with partial context
3. **Dedup** — duplicate `transfer.reversed` event (insert returns empty) skips processing, no `console.error`

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.test.ts`
- Add a new `describe("transfer.reversed", ...)` block mirroring the `transfer.created` block structure
- Reuse existing `makeTransfer()`, `makeEvent()`, `buildRequest()` helpers

## Dependencies
- **Requires**: Spec 15 (handler exists to test)
