# 13 — Reconciliation Fallback

## Summary
On the paywall page, before showing the paywall, verify with Polar's API that the merchant is actually `canceled`. Corrects webhook delivery failures.

## Prerequisites
- **03-polar-server-plugin** — needs Polar SDK client for API call
- **09-paywall-page** — reconciliation runs on this page before rendering

## Changes

### `src/app/app/billing/subscribe/page.tsx`
- Before rendering the paywall:
  1. If `shop.polarCustomerId` exists (they were once a subscriber):
     - Call Polar API to check current subscription status
     - If Polar says `active` → update `shops.subscriptionStatus = 'active'`, redirect to dashboard
     - If Polar API fails → use local state (show paywall), log warning
  2. If `shop.polarCustomerId` is NULL (trial expiry, never subscribed):
     - No reconciliation needed — ShowUp is the source of truth for trials
     - Render paywall directly

### `src/lib/polar.ts`
- Add `getCustomerSubscriptionStatus(polarCustomerId)` helper
- Single API call to Polar, returns current status or null on failure

## Design brief
None — backend logic on an existing page. No UI changes.
