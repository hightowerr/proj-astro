# Wave 2 — Slice 2c: Trial Initialization

## Spec

06-trial-initialization.md

## Files to create/modify

- **Modify**: The shop creation flow (wherever `INSERT INTO shops` happens) — set `subscriptionStatus` and `trialEndsAt`

## Dependencies

- Wave 1 slice 1a (01-schema-migration) — needs the new columns to exist

## Acceptance Criteria

1. When a new shop is created, set `subscriptionStatus: 'trialing'`.
2. When a new shop is created, set `trialEndsAt` to 14 days after creation time.
3. The `trialEndsAt` calculation uses `new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)`.
4. Existing shops with NULL `subscriptionStatus` are handled by fallback logic in `requireShopAuth()` (spec 07, Wave 3).
5. `pnpm check` passes with zero new errors.
