# Slice 2B: Test Transfer Context Lookup

## Spec
08-test-transfer-context-lookup

## Files
- **Create**: test file for `resolveTransferContext` (location per project test conventions — likely `src/lib/__tests__/stripe-utils.test.ts` or `tests/stripe-utils.test.ts`)

## Implementation

5 test cases, all mocking `stripe.charges.retrieve` and DB queries:

1. **Happy path** — transfer with valid `source_transaction` → charge found → payment in DB → returns full `TransferContext`
2. **No source_transaction** — `transfer.source_transaction` is undefined → returns `null`, `console.warn` called
3. **Charge not found** — `stripe.charges.retrieve` throws → returns `null`, `console.warn` called
4. **Payment not in DB** — charge has `payment_intent` but no DB match → returns `null`, `console.warn` called
5. **Charge has no payment_intent** — `charge.payment_intent` is null → returns `null`, `console.warn` called

### Mock strategy
- Mock `stripe.charges.retrieve` via `vi.mock` or `vi.spyOn`
- Mock DB query (spy on drizzle `select` chain, or use project's existing DB mock pattern)
- Spy on `console.warn` to verify failure logging

## Acceptance criteria
- [ ] All 5 test cases pass
- [ ] Each failure path verifies `console.warn` was called with a descriptive message
- [ ] Happy path verifies all fields of `TransferContext` are populated
- [ ] lint + type-check pass

## Dependencies
- Spec 01 (slice 1A) — function under test
