# Wave 3 — Slice 3c: Paywall Page

## Spec
09-paywall-page.md

## Files to create/modify
- **Create**: `src/app/app/billing/subscribe/page.tsx` — new paywall page

## Dependencies
- Wave 2 slice 2a (04-client-plugin) — needs `authClient.checkout()`
- Wave 3 slice 3a (07-requireShopAuth) — needs the redirect to this page

## Acceptance Criteria
1. Create a new page at `/app/billing/subscribe`.
2. Server component that loads shop data via `requireAuth()` (NOT `requireShopAuth()` — would cause redirect loop).
3. Determine variant from `shop.polarCustomerId`: NULL = trial expired (Variant A), non-null = welcome back (Variant B).
4. Variant A shows "YOUR TRIAL HAS ENDED" label, trial-ended heading, and "Keep my shop live" CTA.
5. Variant B shows "WELCOME BACK" label, welcome heading, and "Reactivate my shop" CTA.
6. Both variants show a feature list with checkmark icons.
7. Pricing card with Monthly ($49/mo) / Annual ($39/mo, "Save 20%") toggle, Annual pre-selected.
8. CTA triggers `authClient.checkout()` with the ShowUp Pro product ID.
9. Follow the design prototype at `design/Paywall Subscribe (standalone).html`.
10. `pnpm check` passes with zero new errors.
