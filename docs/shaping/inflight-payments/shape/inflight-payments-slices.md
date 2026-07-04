# In-Flight Payments — Slices

## Wave overview

| Wave | Specs | Theme | Parallel agents | File contention |
|------|-------|-------|-----------------|-----------------|
| 1 | 01, 02, 07 | Foundations | 3 | None — 3 different files |
| 2 | 03, 04, 06, 08, 09 | Core logic + P1 tests | 5 | None — 5 different files |
| 3 | 05, 10, 12 | UI completion + backend tests | 3 | None — 3 different files |
| 4 | 11, 13 | Final tests | 2 | None — 2 different files |
| 5 | 14, 19 | Dead code cleanup + docs | 2 | None — code vs docs |
| 6 | 15, 17 | Transfer event handlers | 1 | Yes — both touch `connect-webhook/route.ts` |
| 7 | 16, 18 | Transfer event handler tests | 1 | Yes — both touch `route.test.ts` |

Total: 19 specs, 7 waves, 19 slices (1:1 spec-to-slice mapping).
Waves 1-4: COMPLETE (specs 01-13). Waves 5-7: specs 14-19 (transfer event rethink).

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

## Wave 5 — Dead code cleanup + docs (transfer event rethink)

Both slices run in parallel. No dependencies between them. No file contention.

| Slice | Spec | File(s) | Summary |
|-------|------|---------|---------|
| 5a | 14 | `connect-webhook/route.ts`, `route.test.ts` | Remove `transfer.failed` dead code + tests |
| 5b | 19 | `03-detection-guard.md`, `inflight-payments-shape.md` | Update cross-dependency framing |

## Wave 6 — Transfer event handlers

Both slices modify `connect-webhook/route.ts` — **file contention**. Run sequentially (single agent) or merge.

| Slice | Spec | Deps | File(s) | Summary |
|-------|------|------|---------|---------|
| 6a | 15 | 14 | `connect-webhook/route.ts` | Add `transfer.reversed` handler |
| 6b | 17 | 14 | `connect-webhook/route.ts` | Add `transfer.updated` handler |

Note: File contention on `connect-webhook/route.ts`. Single agent recommended.

## Wave 7 — Transfer event handler tests

Both slices modify `route.test.ts` — **file contention**. Run sequentially (single agent) or merge.

| Slice | Spec | Deps | File(s) | Summary |
|-------|------|------|---------|---------|
| 7a | 16 | 15 | `route.test.ts` | Unit tests for `transfer.reversed` (3 tests) |
| 7b | 18 | 17 | `route.test.ts` | Unit tests for `transfer.updated` (3 tests) |

Note: File contention on `route.test.ts`. Single agent recommended.

## Implementation notes from spike (waves 5-7)

1. **Spec 14**: Clean removal — no conditional logic, just delete the branch and test block.
2. **Specs 15, 17**: `transfer.reversed` and `transfer.updated` are fully typed in Stripe TS (`EventTypes.d.ts:3533-3560`). No `(event.type as string)` cast needed.
3. **Specs 15, 17**: `resolveTransferContext()` works for all transfer event types — `data.object` is `Stripe.Transfer` for all three.
4. **Spec 15**: Use `console.error` (money event). Spec 17: Use `console.warn` (informational).
5. **Waves 6-7**: File contention within each wave. Single agent per wave recommended.

## Implementation notes from spike

1. **Spec 01**: Create `isReverseTransferFailedError()` pure function (extract-for-testability pattern). Idempotency key for fallback: `refund-fallback-${appointment.id}`
2. **Spec 03**: Shop lookup via `intent.transfer_data.destination` → `shops.findFirst({ where: eq(stripeAccountId, destination) })`. No chain through payment → appointment → shop.
3. **Spec 07**: `stripe.paymentIntents.cancel()` is idempotent — safe if PI already cancelled/succeeded. Catch errors and continue.
4. **All specs**: Use `console.warn` for logging (lint blocks `console.info`).
5. **Spec 11**: Logic tests only (no component render tests — no-component-test-infra friction). Rendering verified by Playwright in Phase 3.
