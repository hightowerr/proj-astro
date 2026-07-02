# Slice 3B: Test Transfer Event Handlers

## Spec
09-test-transfer-handlers

## Files
- **Create**: test file for Connect webhook transfer handlers

## Implementation

7 test cases:

### transfer.created
1. **Happy path** — valid event, context resolves → `console.info` with `status: "succeeded"`, all context fields populated
2. **Unresolvable context** — valid event, `resolveTransferContext` returns null → `console.warn` logged, no error thrown
3. **Dedup** — same event.id sent twice → second call is no-op

### transfer.failed
4. **Happy path** — valid failed event → `console.error` with `action: "MANUAL_REVIEW_REQUIRED"`, failure reason, context
5. **Unresolvable context** — context is null → `console.error` still fires with `"unknown"` fields
6. **Dedup** — same event.id twice → second call is no-op

### Cross-cutting
7. **Invalid signature** — bad webhook signature → 400 response, no processing

### Mock strategy
- Mock `resolveTransferContext` (tested independently in slice 2B)
- Mock Stripe `constructEvent` for signature verification
- Mock DB for dedup table insert
- Spy on `console.info`, `console.warn`, `console.error`

## Acceptance criteria
- [ ] All 7 test cases pass
- [ ] Log levels are correct: `console.info` for created, `console.error` for failed, `console.warn` for unresolvable context on created
- [ ] Dedup prevents double-processing
- [ ] lint + type-check pass

## Dependencies
- Specs 02, 03 (slice 2A) — handlers under test
- Spec 08 (slice 2B) — lookup tests validate the dependency
