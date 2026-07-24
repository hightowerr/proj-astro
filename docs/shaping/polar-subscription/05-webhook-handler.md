# 05 — Polar Webhook Handler

## Summary
Implement the webhook callback logic inside the Polar server plugin. Handles 6 subscription events, dedup via `processedPolarEvents`, timestamp guard for ordering.

## Prerequisites
- **01-schema-migration** — needs `subscriptionStatusEnum`, `processedPolarEvents`, `lastWebhookEventAt` column
- **03-polar-server-plugin** — callbacks are wired here, logic goes here

## Changes

### Webhook callbacks in `src/lib/auth.ts` (or extracted to a separate handler module)

**State-changing events (3):**

`onSubscriptionActive`:
1. Begin transaction
2. Insert into `processedPolarEvents` (dedup) — skip if already processed
3. Check `lastWebhookEventAt` — skip if event is older
4. Update `shops.subscriptionStatus = 'active'`
5. Store `polarCustomerId` from payload (if not already set)
6. Update `lastWebhookEventAt`
7. Commit
8. Return 200

`onSubscriptionUpdated`:
1. Same dedup + timestamp guard pattern
2. Inspect payload `status` field
3. If `past_due` → set `subscriptionStatus = 'past_due'`
4. If `active` → set `subscriptionStatus = 'active'` (retry succeeded)
5. Other statuses → log warning, no state change

`onSubscriptionRevoked`:
1. Same dedup + timestamp guard pattern
2. Set `subscriptionStatus = 'canceled'`

**No-op events (3):**

`onSubscriptionCreated`: log at info level, return 200
`onSubscriptionCanceled`: log at info level, return 200 (merchant stays `active` until period ends)
`onSubscriptionUncanceled`: log at info level, return 200

**Pattern:** Follow existing Stripe webhook pattern exactly — transaction wraps dedup insert + state update. Deferred external calls (emails) execute after commit.

## Design brief
None — backend only.
