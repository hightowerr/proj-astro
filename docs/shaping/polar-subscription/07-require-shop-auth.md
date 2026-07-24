# 07 — requireShopAuth()

## Summary
New auth function that returns `{ session, shop }` and gates dashboard access based on subscription status. Replaces `requireAuth()` calls on all dashboard routes.

## Prerequisites
- **01-schema-migration** — needs `subscriptionStatus` and `trialEndsAt` columns
- **06-trial-initialization** — shops must have subscription data

## Changes

### `src/lib/session.ts`
- Add `requireShopAuth()` function:
  1. Call existing `requireAuth()` for session
  2. Load shop for `session.user.id`
  3. If no shop → redirect to shop creation page
  4. Check subscription status:
     - `'active'` → allow, return `{ session, shop, isPastDue: false }`
     - `'trialing'` AND `now <= trialEndsAt` → allow
     - `'past_due'` → allow, return `{ session, shop, isPastDue: true }`
     - `'canceled'` → redirect to `/app/billing/subscribe`
     - `'trialing'` AND `now > trialEndsAt` → redirect to `/app/billing/subscribe`
     - `NULL` → treat as trialing with `trialEndsAt = shop.createdAt + 14d`
  5. On error (DB unreachable) → fail OPEN (let merchant in, log error)
- `requireAuth()` stays unchanged for shop creation page

### All dashboard routes under `src/app/app/`
- Replace `const session = await requireAuth()` with `const { session, shop } = await requireShopAuth()`
- Remove duplicate shop queries where the page was loading the shop separately

## Design brief
None — backend refactor. No UI changes.
