# Refund State — Build Order

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
                                  │
```

## Phased Build Order

### Phase 1 — Foundations (no dependencies, all parallel)

| Spec | Title | Deps |
|------|-------|------|
| 01 | Derive refunded flag | None |
| 02 | FeeBreakdown refunded prop (type only) | None |
| 06 | Legacy refund fallback | None |

### Phase 2 — Core rendering + wiring (depends on Phase 1)

| Spec | Title | Deps |
|------|-------|------|
| 03 | FeeBreakdown refunded display | 02 |
| 05 | Waived + refunded edge case | 02 |
| 07 | Thread prop through PaymentCard | 01, 02 |

### Phase 3 — Polish + all tests (depends on Phase 2)

| Spec | Title | Deps |
|------|-------|------|
| 04 | Refunded helper text | 03 |
| 08 | Unit tests — refunded display | 03, 04 |
| 09 | Unit tests — edge cases | 05, 06 |
| 10 | Integration test — PaymentCard | 03, 07 |

## Critical Path

```
02-fee-breakdown-refunded-prop → 03-fee-breakdown-refunded-display → 04-refunded-helper-text → 08-unit-tests-refunded-display
```

**Length**: 4 specs across 3 phases. All other work fans out in parallel around this spine.
