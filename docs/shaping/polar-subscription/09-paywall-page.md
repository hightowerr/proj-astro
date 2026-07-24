# 09 — Paywall Page

## Summary
The page merchants land on when `requireShopAuth()` redirects them due to `canceled` status or expired trial. Contains the "Subscribe" CTA that initiates Polar checkout.

## Prerequisites
- **04-polar-client-plugin** — needs `authClient.checkout()` for the subscribe button
- **07-require-shop-auth** — needs the redirect to this page

## Changes

### `src/app/app/billing/subscribe/page.tsx` (new file)
- Server component that loads shop data
- Two-column layout: left = messaging + feature list, right = pricing card
- Determine variant from `shop.polarCustomerId` (NULL = never subscribed = trial expired)
- Pricing card:
  - Toggle: Monthly / Annual (Annual pre-selected, with "Save 20%" pill)
  - Annual view: **$39**/mo, "Billed $468/year"
  - Monthly view: **$49**/mo
  - "Cancel anytime · Secure checkout" below CTA
- Checkout success redirects to interstitial (spec 10)

#### Variant A — Trial Expired (`shop.polarCustomerId === null`)
- Label: "YOUR TRIAL HAS ENDED"
- Heading: "Your 14-day trial has ended"
- Body: "You've seen ShowUp keep your calendar full and your no-shows down. Subscribe to keep your shop live — nothing you set up goes anywhere."
- Section heading: "EVERYTHING STAYS RIGHT WHERE IT IS"
- Feature list (checkmark icons):
  - Your client roster & reliability scores
  - Deposit & cancellation policies
  - Automatic slot recovery by SMS
  - Reminders & post-visit follow-ups
- CTA: **"Keep my shop live"** → `authClient.checkout()` with ShowUp Pro product ID

#### Variant B — Welcome Back (`shop.polarCustomerId !== null`)
- Label: "WELCOME BACK"
- Heading: "Good to see you again"
- Body: "Your shop is paused, but nothing's gone. Reactivate and pick up exactly where you left off — same catalog, same clients, same policies."
- Section heading: "STILL SET UP AND WAITING FOR YOU"
- Same feature list as Variant A
- CTA: **"Reactivate my shop"** → `authClient.checkout()` with ShowUp Pro product ID

### Route
- `/app/billing/subscribe`
- This page does NOT use `requireShopAuth()` (would create redirect loop) — uses `requireAuth()` only

### Design
- Prototype: [`design/Paywall Subscribe (standalone).html`](design/Paywall%20Subscribe%20(standalone).html)
- Desktop + mobile responsive layouts
- Encouraging, not punitive — warm terracotta and navy palette, no error chrome, no red, no lock-out iconography
- Annual default selected with quiet "Save 20%" pill — an offer, never pressure
- "Cancel anytime" sits right under the CTA

### Pages impacted
- `/app/billing/subscribe` — new page
