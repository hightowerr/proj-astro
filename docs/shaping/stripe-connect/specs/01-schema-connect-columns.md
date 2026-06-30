# 01 — Schema: Connect Columns

## Summary
Add Stripe Connect fields to the `shops` table so each shop can link to its own Stripe Express account.

## Prerequisites
None.

## Changes

**File:** `src/lib/schema.ts` (shops table, ~line 177)

Add three columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `stripeAccountId` | `text("stripe_account_id")` | `null` | Stripe Express account ID (e.g. `acct_1AbC...`) |
| `stripeOnboardingStatus` | `stripeOnboardingStatusEnum` | `"not_started"` | Enum: `not_started`, `pending`, `complete` |
| `stripeAccountCreatedAt` | `timestamp("stripe_account_created_at", { withTimezone: true })` | `null` | When the Express account was created |

Add a new pgEnum:
```ts
export const stripeOnboardingStatusEnum = pgEnum("stripe_onboarding_status", [
  "not_started",
  "pending",
  "complete",
]);
```

Add a partial unique index on `stripeAccountId` (`WHERE stripe_account_id IS NOT NULL`) to prevent a single Stripe account being linked to two shops.

## Acceptance
- `shops` table in schema.ts has the three new columns
- Enum is defined and exported
- Partial unique index exists
- TypeScript types (`shops.$inferSelect`, `shops.$inferInsert`) include the new fields
