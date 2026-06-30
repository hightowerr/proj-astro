# 07 — API: Connect Status

## Summary
GET route that checks the shop's Stripe Connect account status and updates the local DB if needed.

## Prerequisites
- Depends on: 01 (schema), 02 (migration)

## Changes

**New file:** `src/app/api/settings/stripe-connect/status/route.ts`

### Logic

1. `requireAuth()` + look up shop by owner ID
2. If no `stripeAccountId`, return `{ status: "not_started" }`
3. Retrieve the account from Stripe:
   ```ts
   const account = await stripe.accounts.retrieve(shop.stripeAccountId);
   ```
4. Return:
   ```ts
   {
     status: shop.stripeOnboardingStatus,
     chargesEnabled: account.charges_enabled,
     payoutsEnabled: account.payouts_enabled,
     detailsSubmitted: account.details_submitted,
   }
   ```
5. If `account.details_submitted && account.charges_enabled` and local status is still `"pending"`, update to `"complete"`

### Usage
Called by the settings UI component to display current Connect status. Also used as a fallback for checking status if the Connect webhook hasn't fired yet.

## Acceptance
- Returns accurate account status from Stripe
- Updates local `stripeOnboardingStatus` if it's stale
- Returns `"not_started"` when no account exists
