# P1 — Pass payoutsEnabled prop from server page to component

## Summary

The settings page (`stripe-connect/page.tsx`) fetches the shop record but passes only `initialStatus` and `stripeAccountId` to `StripeConnectCard`. The Stripe account object — which contains `payouts_enabled` — is never fetched server-side on this page.

## Problem

The data path from Stripe to the UI breaks at the page-to-component boundary. The status API (`status/route.ts:48`) already returns `payoutsEnabled`, but that API is only called during the verifying-state poll — not on initial page load. The server component has no Stripe API call.

## Scope

**File:** `src/app/app/settings/stripe-connect/page.tsx`

### Changes

1. Import `getStripeClient` from `@/lib/stripe`.
2. When `shop.stripeAccountId` exists, call `stripe.accounts.retrieve(shop.stripeAccountId)` server-side.
3. Pass `payoutsEnabled={account?.payouts_enabled ?? true}` as a new prop to `<StripeConnectCard>`.
4. Default to `true` when no Stripe account exists (pre-connect state — prop is irrelevant).

### Constraints

- **One Stripe API call per page load** — acceptable for a low-traffic settings page.
- **No new DB column** — `payouts_enabled` changes without merchant action and is always available live from Stripe. Persisting it would require webhook updates and create stale-data risk.
- **No client-side fetch** — server component fetch is sufficient for this route.

## Dependencies

- None. This is the foundation spec.

## Acceptance criteria

- `StripeConnectCard` receives a `payoutsEnabled` boolean prop.
- When `payouts_enabled` is `false` on the Stripe account, the prop value is `false`.
- When `payouts_enabled` is `true` (or no account exists), the prop value is `true`.
- No regression to existing page behavior (redirect, auth, layout).

## Decision log

| Considered | Rejected because |
|---|---|
| New DB column for `payoutsEnabled` | Changes without merchant action, always available from Stripe API, persisting creates stale-data risk |
| Client-side poll for payouts status | Settings page is low-traffic, server-side fetch is sufficient |
| Reuse the existing status API poll | Only runs during verifying state, not on initial connected-state load |
