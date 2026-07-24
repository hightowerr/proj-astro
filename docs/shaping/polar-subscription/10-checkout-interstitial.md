# 10 — Checkout Interstitial

## Summary
A "Processing your subscription..." page that the merchant lands on after Polar checkout. Polls `subscriptionStatus` until `active`, then redirects to dashboard.

## Prerequisites
- **05-webhook-handler** — the webhook must be able to set `active` for polling to succeed
- **09-paywall-page** — checkout redirects here on success

## Changes

### `src/app/app/billing/processing/page.tsx` (new file)
- Client component
- On mount: poll `subscriptionStatus` every 2 seconds
- Polling mechanism: fetch a lightweight API route or server action that returns current `shop.subscriptionStatus`
- If `active` → redirect to `/app/dashboard`
- This page uses `requireAuth()` only (not `requireShopAuth()` — would redirect to paywall)

#### Processing state (first ~15s)
- Icon: lock glyph with soft navy spinner animation
- Label: "PAYMENT RECEIVED"
- Heading: "Activating your shop..." (animated ellipsis)
- Body: "Thanks — your payment went through. We're switching everything back on and you'll be at your dashboard in a moment."
- Note: "No need to refresh — this happens automatically" (checkmark icon)

#### Fallback state (after ~15s without `active`)
- Icon: checkmark (terracotta)
- Label: "PAYMENT CONFIRMED"
- Heading: "Your payment was received"
- Body: "This is taking a little longer than usual. If your dashboard doesn't unlock in the next minute, re-check below or refresh the page — your subscription is safe either way."
- CTA: **"Check again"** (with refresh icon) — re-polls and redirects if active
- Support: "Still stuck? **Contact support** and we'll sort it out."

### Polling endpoint
- Server action or API route: `getSubscriptionStatus()` → returns `shop.subscriptionStatus`
- Minimal: one DB query, no Polar API call

### Design
- Prototype: [`design/Checkout Interstitial (standalone).html`](design/Checkout%20Interstitial%20(standalone).html)
- Desktop + mobile responsive layouts
- Both states lead with "payment received/confirmed" — the delay is framed as ours to resolve, never the merchant's problem
- Soft navy spinner and animated ellipsis — no fake progress bar
- After ~15s the fallback hands back a manual "Check again" re-poll and a support path — the user is never trapped watching a spinner
- Navy and terracotta only — no error chrome. A slow webhook is not a failure, so it never looks like one

### Pages impacted
- `/app/billing/processing` — new page
