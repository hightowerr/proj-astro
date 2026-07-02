# Webhook Transfer Awareness — Slices

## Slicing strategy

No UI in this feature — all slices are backend. Vertical slices are defined by "independently deployable and testable code path." Each slice can be merged and deployed without the others (though the full value requires all three waves).

Specs 02 and 03 are combined into one implementation slice because they modify the same file (`connect-webhook/route.ts`), add adjacent cases in the same if/else chain, and share the same dependency (spec 01). Keeping them as separate specs preserves distinct acceptance criteria; combining implementation prevents merge conflicts.

## Wave 1 — Foundations (3 parallel slices, no dependencies)

All three slices touch different files — safe to parallelize.

| Slice | Specs | File(s) | Description |
|-------|-------|---------|-------------|
| 1A | 01 | `src/lib/stripe-utils.ts` (new) | Transfer context lookup helper |
| 1B | 04 | `src/queries/appointments.ts:1186` | Store applicationFeeAmountCents in metadata |
| 1C | 05 | `src/app/api/stripe/webhook/route.ts:~263` | console.warn for unhandled platform webhook events |

**Exit criteria**: lint + type-check pass after each slice. All three files exist and compile.

## Wave 2 — Core handlers + foundation tests (3 slices, deps on Wave 1)

Specs 02+03 are one slice. Tests 08 and 10 are independent of each other.

| Slice | Specs | File(s) | Deps | Description |
|-------|-------|---------|------|-------------|
| 2A | 02, 03 | `src/app/api/stripe/connect-webhook/route.ts` | 01 | Both transfer event handlers (created + failed) |
| 2B | 08 | test file | 01 | Tests for transfer context lookup |
| 2C | 10 | test file | 04 | Tests for application fee metadata storage |

**Contention note**: Only slice 2A touches connect-webhook. Slices 2B and 2C are test files — no file contention. All three can parallelize.

**Exit criteria**: lint + type-check pass. Test suites for 2B and 2C pass.

## Wave 3 — Safety nets + handler tests + ops (3 slices, deps on Wave 2)

| Slice | Specs | File(s) | Deps | Description |
|-------|-------|---------|------|-------------|
| 3A | 06 | `src/app/api/stripe/connect-webhook/route.ts` | 02, 03 | console.warn for unhandled Connect webhook events |
| 3B | 09 | test file | 02, 03, 08 | Tests for transfer event handlers |
| 3C | 07 | Stripe Dashboard (ops) | 02, 03 (deployed) | Register transfer events — ops step, not code |

**Contention note**: 3A touches connect-webhook (same file as 2A). 3B is a test file. 3C is an ops step. All three can parallelize.

**Exit criteria**: lint + type-check pass. Test suite for 3B passes. 3C requires production deployment first — verify in Vercel logs.

## Critical path

```
01 (lookup helper) → 02+03 (transfer handlers) → 09 (handler tests)
```

3 implementation steps across 3 waves. Everything else fans out in parallel.

## Files modified (complete list)

| File | Slices | Change type |
|------|--------|-------------|
| `src/lib/stripe-utils.ts` | 1A | NEW — transfer context lookup helper |
| `src/queries/appointments.ts` | 1B | MODIFY — add field to metadata write (~line 1186) |
| `src/app/api/stripe/webhook/route.ts` | 1C | MODIFY — add default/else branch (~line 263) |
| `src/app/api/stripe/connect-webhook/route.ts` | 2A, 3A | MODIFY — add 3 event handlers + else branch |
| test file(s) | 2B, 2C, 3B | NEW — test suites |
