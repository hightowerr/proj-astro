# Wave 1 — Slice 1a: Schema Migration

## Spec

01-schema-migration.md

## Files to create/modify

- **Modify**: `src/lib/schema.ts` — add enum, 4 columns to shops, new dedup table
- **Create**: `drizzle/0041_polar_subscription.sql` — migration file

## Dependencies

None. This slice has no dependencies on other slices.

## Acceptance Criteria

1. Define `subscriptionStatusEnum` as a pgEnum with values `trialing`, `active`, `past_due`, `canceled` in schema.ts.
2. Add `subscriptionStatus` column to `shops` table with type `subscriptionStatusEnum`, default `trialing`, not null.
3. Add `trialEndsAt` column to `shops` table with type `timestamp` (with timezone), nullable.
4. Add `polarCustomerId` column to `shops` table with type `text`, nullable.
5. Add `lastWebhookEventAt` column to `shops` table with type `timestamp` (with timezone), nullable.
6. Create `processedPolarEvents` table with `id` (text, primary key) and `processedAt` (timestamp with timezone, default now, not null).
7. Generate migration file `drizzle/0041_polar_subscription.sql` via `drizzle-kit generate`.
8. `pnpm check` passes with zero new errors.
