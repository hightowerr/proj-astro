- Date: 2026-07-17
- Spec: 04 (dispute notification email), 05 (payment card disputed modifier)
- What diverged:
  1. Spec 04 assumed `with: { customer: true }` Drizzle relations + `customers.name` field — implementation uses explicit `tx.select().from(customers)` with `customers.fullName` and `tx.select().from(user)` for owner email (no relations in codebase, different field name)
  2. Spec 04 assumed `shop.userEmail` — shops table has no `userEmail` column, owner email accessed via `user` table join on `shop.ownerUserId`
  3. Spec 04: `pendingDisputeEmail` requires explicit `as` type cast after transaction — TypeScript cannot track mutations inside async closures
  4. Spec 05 helper functions `disputed` param defaults to `false` instead of required — existing tests (23 calls) don't pass the param
- Classification: EVOLUTION (all 4)
- Why: All divergences are correct adaptations to actual schema and TypeScript constraints. No shortcuts taken — each deviation produces better code (backward compat, correct types, actual field names).
