# Spec 06 — P2c: Unit tests for dispute webhook handlers

## Priority

P2 — HIGH. Tests for specs 02 and 03.

## Summary

Add unit tests for `charge.dispute.created`, `charge.dispute.updated`, and `charge.dispute.closed` handlers. Follow the existing test patterns in `connect-webhook/route.test.ts`.

## Changes

- **File:** `src/app/api/stripe/connect-webhook/route.test.ts`
- **New test group:** `describe("charge.dispute.created", () => { ... })`

### Test cases

**`charge.dispute.created`:**
1. Sets `financialOutcome: "disputed"` and inserts `"dispute_opened"` event when payment found
2. Logs `console.error` with dispute context when payment found
3. Logs `console.error` when payment cannot be resolved (no matching `stripePaymentIntentId`)
4. Dedup: second delivery of same event ID is skipped

**`charge.dispute.updated`:**
5. Logs `console.warn` with dispute status and reason
6. Dedup: second delivery skipped

**`charge.dispute.closed`:**
7. Sets `financialOutcome: "settled"` when dispute status is `"won"`
8. Keeps `financialOutcome: "disputed"` when dispute status is `"lost"`
9. Logs when payment cannot be resolved
10. Dedup: second delivery skipped

## Acceptance Criteria

- [ ] 10 test cases covering happy path, unresolvable context, outcome resolution, and dedup
- [ ] All tests pass with `pnpm test`
- [ ] Tests follow existing patterns in `route.test.ts` (mock Stripe event construction, DB assertions)
- [ ] `pnpm check` passes

## Prerequisites

- Spec 02 (handler code must exist)
- Spec 03 (lifecycle handlers must exist)

## Dependencies

Depends on: spec 02, spec 03.
