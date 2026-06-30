# 09 — Webhook: Connect account.updated

## Summary
New webhook endpoint that handles `account.updated` events from Stripe Connect, updating the shop's onboarding status when verification completes or capabilities change.

## Prerequisites
- Depends on: 01 (schema), 02 (migration), 04 (env)

## Changes

**New file:** `src/app/api/stripe/connect-webhook/route.ts`

### Why a separate endpoint
Connect webhook events (about connected accounts) use a different signing secret than platform events. Stripe delivers them separately. The existing `/api/stripe/webhook` handles platform events (payment_intent.*). This endpoint handles Connect events (account.*).

### Logic

1. Verify signature using `STRIPE_CONNECT_WEBHOOK_SECRET`
2. Dedup via `processedStripeEvents` table (same pattern as existing webhook)
3. Handle `account.updated`:
   ```ts
   const account = event.data.object as Stripe.Account;
   // Find shop by stripeAccountId
   // If charges_enabled && details_submitted → set status "complete"
   // If !charges_enabled → set status "pending" (capabilities revoked)
   ```

### Events to subscribe to
Register in Stripe Dashboard under **Connect > Webhooks**:
- `account.updated` — primary event for onboarding completion and capability changes

URL: `https://showup.dev/api/stripe/connect-webhook`

### Edge cases
- Account capabilities revoked (fraud, compliance) → status reverts to `"pending"`, which disables deposits via the booking page guard (spec 14)
- Unknown `stripeAccountId` → log warning, return 200 (don't fail)

## Acceptance
- Webhook verifies signatures using the Connect-specific secret
- `account.updated` with `charges_enabled=true` + `details_submitted=true` sets shop status to `"complete"`
- Capability revocation sets status back to `"pending"`
- Idempotent via `processedStripeEvents` dedup
