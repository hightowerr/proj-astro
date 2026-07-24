# Wave 3 — Slice 3a: requireShopAuth()

## Spec
07-require-shop-auth.md

## Files to create/modify
- **Modify**: `src/lib/session.ts` — add `requireShopAuth()` function
- **Modify**: All dashboard routes under `src/app/app/` — replace `requireAuth()` with `requireShopAuth()`

## Dependencies
- Wave 1 slice 1a (01-schema) — needs `subscriptionStatus` and `trialEndsAt` columns
- Wave 2 slice 2c (06-trial) — shops must have subscription data

## Acceptance Criteria
1. Add `requireShopAuth()` function to `src/lib/session.ts`.
2. The function calls `requireAuth()` for session, then loads the shop for the user.
3. If no shop exists, redirect to shop creation page.
4. If `subscriptionStatus` is `active`, return `{ session, shop, isPastDue: false }`.
5. If `subscriptionStatus` is `trialing` AND `now <= trialEndsAt`, allow access.
6. If `subscriptionStatus` is `past_due`, return `{ session, shop, isPastDue: true }`.
7. If `subscriptionStatus` is `canceled`, redirect to `/app/billing/subscribe`.
8. If `subscriptionStatus` is `trialing` AND `now > trialEndsAt`, redirect to `/app/billing/subscribe`.
9. If `subscriptionStatus` is NULL, treat as trialing with `trialEndsAt = shop.createdAt + 14d`.
10. On DB error, fail open (let merchant in, log error).
11. Replace `requireAuth()` with `requireShopAuth()` in all dashboard routes under `src/app/app/`.
12. `pnpm check` passes with zero new errors.
