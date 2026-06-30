# 05 — API: Create Connect Account

## Summary
POST route that creates a Stripe Express account for the shop owner and redirects them to Stripe's onboarding flow.

## Prerequisites
- Depends on: 01 (schema), 02 (migration)

## Changes

**New file:** `src/app/api/settings/stripe-connect/create-account/route.ts`

### Logic

1. `requireAuth()` + look up shop by owner ID
2. If `shop.stripeAccountId` exists AND status is `"complete"`:
   - Return `{ url: loginLink.url }` via `stripe.accounts.createLoginLink()`
3. If `shop.stripeAccountId` exists AND status is `"pending"`:
   - Re-create an Account Link (skip to step 6)
4. If no `stripeAccountId` yet:
   ```ts
   const account = await stripe.accounts.create({
     type: "express",
     country: "GB",
     default_currency: "gbp",
     metadata: { shopId: shop.id, shopSlug: shop.slug },
     capabilities: {
       card_payments: { requested: true },
       transfers: { requested: true },
     },
     business_profile: {
       mcc: "7241",
       url: `${appUrl}/book/${shop.slug}`,
     },
   });
   ```
5. Persist `stripeAccountId` and set status to `"pending"` on shops row. Set `stripeAccountCreatedAt`.
6. Create Account Link:
   ```ts
   const accountLink = await stripe.accountLinks.create({
     account: accountId,
     refresh_url: `${appUrl}/api/settings/stripe-connect/refresh`,
     return_url: `${appUrl}/app/settings/stripe-connect?status=complete`,
     type: "account_onboarding",
   });
   ```
7. Return `{ url: accountLink.url }`

### Auth
Uses the same `requireAuth()` pattern as other settings routes.

### UX note
The client (spec 10) shows a brief "Setting up your Stripe account..." transition state between the CTA click and the redirect. This endpoint should return the URL promptly — avoid unnecessary processing before the response. The transition is purely client-side cosmetic (Labor Illusion pattern); the API contract is unchanged.

The design mock uses a 1700ms minimum display time for the transition animation before navigating to Stripe — if the API responds faster, the client holds the spinner for the remainder. This is handled entirely in the client component (spec 10); the API should still respond as fast as possible.

## Acceptance
- Calling the endpoint creates an Express account on Stripe
- Shop row updated with `stripeAccountId` and status `"pending"`
- Returns a URL that the client can redirect to
- Idempotent: calling again for a pending shop re-creates the Account Link, doesn't create a second Express account
