# In-Flight Payments — Slices

## Wave overview

| Wave | Specs | Theme | Parallel agents | File contention |
|------|-------|-------|-----------------|-----------------|
| 1 | 01, 02, 07 | Foundations | 3 | None — 3 different files |
| 2 | 03, 04, 06, 08, 09 | Core logic + P1 tests | 5 | None — 5 different files |
| 3 | 05, 10, 12 | UI completion + backend tests | 3 | None — 3 different files |
| 4 | 11, 13 | Final tests | 2 | None — 2 different files |

Total: 13 specs, 4 waves, 13 slices (1:1 spec-to-slice mapping).

## Wave 1 — Foundations

All 3 slices run in parallel (worktrees). No dependencies between them.

| Slice | Spec | File(s) | Summary |
|-------|------|---------|---------|
| 1a | 01 | `stripe-refund.ts` | Refund fallback catch clause |
| 1b | 02 | `schema.ts`, `drizzle/0039_transfer_held.sql` | transferHeld column |
| 1c | 07 | `connect-webhook/route.ts` | Sweep cancel pending PIs |

## Wave 2 — Core logic + P1 tests

All 5 slices run in parallel. Each depends on Wave 1 outputs but not on each other.

| Slice | Spec | Deps | File(s) | Summary |
|-------|------|------|---------|---------|
| 2a | 03 | 02 | `webhook/route.ts` | Detection guard |
| 2b | 04 | 02 | `payment-card.tsx` | Card "Held" state |
| 2c | 06 | 02 | `dashboard/page.tsx`, new `transfer-held-card.tsx` | Dashboard action item |
| 2d | 08 | 02 | `connect-webhook/route.ts` | Sweep flag recent |
| 2e | 09 | 01 | Test file | Unit tests for refund fallback |

Note: Slice 2d modifies `connect-webhook/route.ts` which was also modified by slice 1c. Sequential waves ensure no contention.

## Wave 3 — UI completion + backend tests

All 3 slices run in parallel.

| Slice | Spec | Deps | File(s) | Summary |
|-------|------|------|---------|---------|
| 3a | 05 | 04 | `payment-card.tsx` | Transfer held helper text |
| 3b | 10 | 03 | Test file | Unit tests for detection guard |
| 3c | 12 | 07, 08 | Test file | Unit tests for sweep |

Note: Slice 3a modifies `payment-card.tsx` which was also modified by slice 2b. Sequential waves ensure no contention.

## Wave 4 — Final tests

Both slices run in parallel.

| Slice | Spec | Deps | File(s) | Summary |
|-------|------|------|---------|---------|
| 4a | 11 | 04, 05 | Test file | Unit tests for card state |
| 4b | 13 | 01, 03, 07, 08 | Test file | Integration test end-to-end |

## Critical path

```
02 (schema) → 04 (card state) → 05 (helper text) → 11 (card tests)
```

Length: 4 specs across 4 waves. P1 fix (spec 01) has zero deps — ships in Wave 1, can deploy immediately.

## Implementation notes from spike

1. **Spec 01**: Create `isReverseTransferFailedError()` pure function (extract-for-testability pattern). Idempotency key for fallback: `refund-fallback-${appointment.id}`
2. **Spec 03**: Shop lookup via `intent.transfer_data.destination` → `shops.findFirst({ where: eq(stripeAccountId, destination) })`. No chain through payment → appointment → shop.
3. **Spec 07**: `stripe.paymentIntents.cancel()` is idempotent — safe if PI already cancelled/succeeded. Catch errors and continue.
4. **All specs**: Use `console.warn` for logging (lint blocks `console.info`).
5. **Spec 11**: Logic tests only (no component render tests — no-component-test-infra friction). Rendering verified by Playwright in Phase 3.
