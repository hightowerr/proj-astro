# P0 — Add stripeOnboardingStatus to findLatestOpenOffer query

## Classification
**Type:** Prerequisite / Data access fix
**Risk:** Low — additive column, no behavioural change
**File:** `src/lib/slot-recovery.ts`

## Problem
`findLatestOpenOffer()` (line ~386) selects only `{ id, slug }` from the `shops` table. F1 needs `shop.stripeOnboardingStatus` to derive `paymentsEnabled` at the call site. Without this column, the fix is impossible.

## Change
In the `shop:` column selection object inside the `db.select()` call at `findLatestOpenOffer`, add:

```diff
 shop: {
   id: shops.id,
+  name: shops.name,
   slug: shops.slug,
+  stripeOnboardingStatus: shops.stripeOnboardingStatus,
 },
```

## Type impact
The `OpenOffer` interface gains `shop.name` and `shop.stripeOnboardingStatus`. Downstream consumers that destructure `shop` are unaffected — new fields are additive.

> **Drift (EVOLUTION):** `name` was not in the original spec — added because F2 needs `shop.name` for SMS copy. The query is the single source for all shop fields used in `acceptOffer`.

## Dependencies
- **Requires:** nothing
- **Blocks:** F1 (money routing)

## Verification
- TypeScript compiles (`pnpm check`)
- `findLatestOpenOffer` returns a result where `shop.stripeOnboardingStatus` is present and matches the DB value

## Design impact
None — backend-only data access change.
