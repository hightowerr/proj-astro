# 06 — API: Refresh Connect Link

## Summary
GET route that re-creates an expired Stripe Account Link and redirects the user back to onboarding.

## Prerequisites
- Depends on: 05 (api-create-connect-account) — uses the same Account Link creation pattern

## Changes

**New file:** `src/app/api/settings/stripe-connect/refresh/route.ts`

### Logic

1. `requireAuth()` + look up shop by owner ID
2. If no `stripeAccountId`, redirect to settings page with error
3. Create a fresh Account Link:
   ```ts
   const accountLink = await stripe.accountLinks.create({
     account: shop.stripeAccountId,
     refresh_url: `${appUrl}/api/settings/stripe-connect/refresh`,
     return_url: `${appUrl}/app/settings/stripe-connect?status=complete`,
     type: "account_onboarding",
   });
   ```
4. `NextResponse.redirect(accountLink.url)`

### Why this exists
Stripe Account Links expire after a short period. If the user leaves onboarding and comes back later, the original link is dead. This endpoint generates a fresh one. Stripe uses the `refresh_url` to redirect here automatically when a link expires mid-flow.

## Acceptance
- Expired Account Link redirects the user here
- A fresh link is generated and user is redirected to Stripe
- If shop has no `stripeAccountId`, redirects to settings with an error param
