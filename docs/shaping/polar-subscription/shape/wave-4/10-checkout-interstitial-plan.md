# Wave 4 — Slice 4a: Checkout Interstitial

## Spec
10-checkout-interstitial.md

## Files to create/modify
- **Create**: `src/app/app/billing/processing/page.tsx` — polling page

## Acceptance Criteria
1. Create a client component page at `/app/billing/processing`.
2. On mount, poll `subscriptionStatus` every 2 seconds via a server action or API route.
3. If `active`, redirect to `/app/dashboard`.
4. Show "Processing" state for first ~15 seconds (spinner, "Activating your shop..." heading).
5. Show "Fallback" state after ~15 seconds ("Check again" button, support link).
6. Use `requireAuth()` only (not `requireShopAuth()`).
7. Follow the design prototype.
8. `pnpm check` passes with zero new errors.
