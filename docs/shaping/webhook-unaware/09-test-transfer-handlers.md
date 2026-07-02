# Spec 09: Test Transfer Event Handlers

## Summary
Integration tests for `transfer.created` and `transfer.failed` handlers in `connect-webhook/route.ts` (specs 02, 03). Verify correct log output and that dedup prevents double-processing.

## Test cases

### `transfer.created`
1. **Happy path** — valid transfer event with resolvable context → `console.warn` called with `status: "succeeded"`, `appointmentId`, `shopId`, `transferId` (lint forbids `console.info`; see spec 02 deviation)
2. **Unresolvable context** — valid transfer event but `resolveTransferContext` returns `null` → `console.warn` logged, handler completes without error
3. **Dedup** — same `event.id` sent twice → second call skips processing (existing dedup mechanism)

### `transfer.failed`
4. **Happy path** — valid failed transfer event → `console.error` called with `action: "MANUAL_REVIEW_REQUIRED"`, failure reason, appointment context
5. **Unresolvable context** — failed transfer but context is `null` → `console.error` still fires (unknown context is worse, not better), fields show `"unknown"`
6. **Dedup** — same `event.id` sent twice → second call skips

### Cross-cutting
7. **Signature verification** — invalid webhook signature → 400 response, no processing

## Dependencies
- **Prerequisites**: Specs 02, 03 (handlers under test), Spec 08 (lookup tests validate the dependency)

## Out of scope
- Testing the Stripe Dashboard registration (spec 07 — manual verification)
- Load testing or retry behaviour
