# Refund State — Slices

10 specs sliced into 3 waves based on dependency graph (see `BUILD-ORDER.md`).

## Dependency Graph

```
01-derive-refunded-flag ──────────────────┐
                                          ├─→ 07-thread-prop ──┐
02-fee-breakdown-refunded-prop ───┬───────┘                    │
                                  ├─→ 03-refunded-display ─┐   │
                                  │                        ├─→ 08-unit-tests-display ──┐
                                  │    04-helper-text ←────┘                           │
                                  │                                                    ├─→ 10-integration-test
                                  ├─→ 05-waived-refunded ──┐                          │
                                  │                        ├─→ 09-unit-tests-edges ───┘
06-legacy-refund-fallback ────────┼────────────────────────┘
```

## Critical Path

`02 → 03 → 04 → 08` (4 specs, 3 waves)

## Wave 1 — Foundations (3 specs, parallel)

No dependencies. All interface/utility work.

| Slice | Spec | Files | Demo |
|-------|------|-------|------|
| 1a | 01-derive-refunded-flag | `payment-card.tsx` | N/A (logic only) |
| 1b | 02-fee-breakdown-refunded-prop | `payment-card.tsx` | N/A (type only) |
| 1c | 06-legacy-refund-fallback | `payment-card.tsx` | Legacy+refunded → "Outcome: Refunded" |

**Wave 1 note**: All three touch `payment-card.tsx`. Despite being parallel-safe (non-overlapping sections), consider running sequentially to avoid merge conflicts in a single file. Alternatively, one agent handles all three since they're small and in the same file.

## Wave 2 — Core rendering + wiring (3 specs, parallel)

Depends on Wave 1. Core display logic and prop threading.

| Slice | Spec | Files | Demo |
|-------|------|-------|------|
| 2a | 03-fee-breakdown-refunded-display | `payment-card.tsx` | Connect+refunded → "Returned", £0.00 |
| 2b | 05-waived-refunded-edge-case | `payment-card.tsx` | Waived+refunded → "Returned" (not "Waived") |
| 2c | 07-thread-prop-payment-card | `payment-card.tsx` | Prop flows from PaymentCard to FeeBreakdown |

**Wave 2 note**: Same single-file concern. 2a and 2b modify `FeeBreakdown` render logic; 2c modifies `PaymentCard` render. Could parallel with care but sequential is safer.

## Wave 3 — Polish + tests (4 specs, parallel)

Depends on Wave 2. Helper text and all test coverage.

| Slice | Spec | Files | Demo |
|-------|------|-------|------|
| 3a | 04-refunded-helper-text | `payment-card.tsx` | Icon swap + "Payout reversed to customer." |
| 3b | 08-unit-tests-refunded-display | `payment-card.test.tsx` (new) | 8 test cases pass |
| 3c | 09-unit-tests-edge-cases | `payment-card.test.tsx` | 8 test cases pass |
| 3d | 10-integration-test-payment-card | `payment-card.test.tsx` | 5 integration test cases pass |

**Wave 3 note**: 3a is a code change; 3b-3d are all tests. Tests can be parallelized safely (different describe blocks). 3a should complete before tests run since tests assert on helper text.

## Implementation note

All 10 specs modify a single file (`payment-card.tsx`) plus a new test file. The wave structure reflects logical dependency order, but the actual implementation could be done by a single agent working through waves sequentially — parallel agents would create merge conflicts on the same file.

**Recommendation**: Single agent, 3 sequential passes. Lint + type-check after each wave.
