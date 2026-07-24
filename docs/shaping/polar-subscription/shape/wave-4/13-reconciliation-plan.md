# Wave 4 — Slice 4c: Reconciliation

## Spec
13-reconciliation.md

## Files to create/modify
- **Modify**: `src/app/app/billing/subscribe/page.tsx` — add reconciliation check before rendering
- **Modify**: `src/lib/polar.ts` — add `getCustomerSubscriptionStatus()` helper

## Acceptance Criteria
1. Add `getCustomerSubscriptionStatus(polarCustomerId)` to `src/lib/polar.ts`.
2. The function calls Polar API to check current subscription status.
3. Returns the status or null on failure.
4. On paywall page, if `shop.polarCustomerId` exists, call Polar API before rendering.
5. If Polar says `active`, update `shops.subscriptionStatus = 'active'` and redirect to dashboard.
6. If Polar API fails, use local state (show paywall) and log warning.
7. If `polarCustomerId` is NULL (trial expiry), render paywall directly — no API call.
8. `pnpm check` passes with zero new errors.
