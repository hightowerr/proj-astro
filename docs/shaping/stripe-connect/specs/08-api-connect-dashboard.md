# 08 — API: Connect Dashboard Link

## Summary
GET route that creates a Stripe Express Dashboard login link so the shop owner can manage their payouts, bank details, and tax info.

## Prerequisites
- Depends on: 01 (schema), 02 (migration)

## Changes

**New file:** `src/app/api/settings/stripe-connect/dashboard/route.ts`

### Logic

1. `requireAuth()` + look up shop by owner ID
2. If no `stripeAccountId` or status is not `"complete"`, return 400
3. Create login link:
   ```ts
   const loginLink = await stripe.accounts.createLoginLink(shop.stripeAccountId);
   ```
4. Return `{ url: loginLink.url }`

### Notes
- Login links are single-use and expire quickly — the client should redirect immediately
- The Express Dashboard is hosted by Stripe; the shop owner manages their own payout schedule, bank details, and compliance info there

## Acceptance
- Returns a valid Stripe Express Dashboard URL for completed accounts
- Returns 400 for shops without a connected account
- The URL works and lands on the Stripe Express Dashboard
