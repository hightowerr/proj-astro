# No Minimum Deposit Floor — Slices

## Wave 1 — Foundation (no dependencies, parallel)

| Slice | Spec | File | Change |
|-------|------|------|--------|
| 1 | 01 | `src/lib/tier-pricing.ts` | Export `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100`. Modify `derivePaymentRequirement()`: `const` → `let`, add floor clamp for `amountCents > 0 && amountCents < 100`. |
| 2 | 04 | `src/lib/tier-pricing.ts` | Add tripwire JSDoc comment above the constant (multi-currency, fee model change). |

**Note:** Slices 1 + 2 touch the same file but different locations (constant definition vs JSDoc). Sequential execution is safest — slice 1 first, slice 2 adds the comment.

## Wave 2 — Integration + Tests (depends on Wave 1, parallel)

| Slice | Spec | File | Change |
|-------|------|------|--------|
| 3 | 02 | `src/lib/queries/appointments.ts` | Add `PLATFORM_MINIMUM_DEPOSIT_CENTS` import. Create `clampedDepositCents` const after `finalDepositCents`. Use it in `derivePaymentRequirement()` call and `policyVersions` insert. |
| 4 | 03 | `src/lib/__tests__/tier-pricing.test.ts` | New file. 9 unit tests covering sub-floor, at-floor, above-floor, zero, null, `paymentMode=none`, `full_prepay`. |

Slices 3 + 4 are fully independent — different files, zero shared state. Can run in parallel.

## Critical path

```
Spec 01 (floor constant + derive clamp) → Spec 02 (appointment clamp)
```

Length: **2 steps across 2 waves**.

## Implementation notes

- Single agent is sufficient (2 modified files, 1 new file, ~15 lines production code)
- No worktrees needed — sequential edits per wave
- `pnpm check` after each wave
- Total: 2 modified files, 1 new file, ~15 lines production code, ~50 lines tests
