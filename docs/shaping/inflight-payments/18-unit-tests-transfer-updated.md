# Spec 18: Unit Tests — `transfer.updated` Handler

**Priority**: P3 (ships with spec 17)

## Summary
Unit tests for the `transfer.updated` webhook handler added in spec 17.

## Test cases
1. **Happy path** — `transfer.updated` with resolvable context logs `console.warn` with context fields
2. **Unresolvable context** — `resolveTransferContext` returns null, logs with "unknown" fallbacks
3. **Dedup** — duplicate event skipped, no logging

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.test.ts`
- New `describe("transfer.updated", ...)` block

## Dependencies
- **Requires**: Spec 17 (handler exists to test)
