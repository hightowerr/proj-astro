# 01 — Schema Migration

## Summary
Add subscription columns to `shops`, create `subscriptionStatusEnum`, and create `processedPolarEvents` dedup table.

## Prerequisites
None — this is the foundation.

## Changes

### `src/lib/schema.ts`
- Add `subscriptionStatusEnum`: `pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'canceled'])`
- Add 4 columns to `shops` table:
  - `subscriptionStatus`: `subscriptionStatusEnum('subscription_status').default('trialing').notNull()`
  - `trialEndsAt`: `timestamp('trial_ends_at', { withTimezone: true })`
  - `polarCustomerId`: `text('polar_customer_id')`
  - `lastWebhookEventAt`: `timestamp('last_webhook_event_at', { withTimezone: true })`
- Add new table `processedPolarEvents`:
  - `id`: `text('id').primaryKey()`
  - `processedAt`: `timestamp('processed_at', { withTimezone: true }).defaultNow().notNull()`

### Migration file
- `drizzle/NNNN_polar_subscription.sql` — generated via `drizzle-kit generate`

## Defaults for existing rows
- `subscriptionStatus = 'trialing'` — safe default; `requireShopAuth()` will treat NULL as trialing anyway
- `trialEndsAt = NULL` — fallback logic calculates from `createdAt + 14d`

## Design brief
None — backend only.
