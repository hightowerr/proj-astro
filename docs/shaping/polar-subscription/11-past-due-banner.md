# 11 — Past Due Banner

## Summary
Show an in-app warning banner on all dashboard pages when the merchant's subscription is `past_due`.

## Prerequisites
- **07-require-shop-auth** — needs `isPastDue` flag in the return value

## Changes

### `src/app/app/layout.tsx`
- `requireShopAuth()` returns `{ session, shop, isPastDue }`
- Add conditional banner:
  ```
  {isPastDue && <PastDueBanner />}
  ```
- Banner dismisses automatically when `subscriptionStatus` returns to `active` (next page load after Polar retry succeeds)

### Banner component
- `src/components/past-due-banner.tsx` (new file)
- Inline between page header and dashboard body — not a modal
- Dismissible via X button, but returns on next page load until the card issue is resolved
- CTA: **"Update payment method"** (with credit card icon) → Polar customer portal via `authClient.customerPortal()`
- Dashboard stays fully readable underneath

#### State: Card Expiring
- Icon: clock (amber)
- Label: "ACTION NEEDED SOON"
- Heading: "Your card ending {last4} expires this month"
- Body: "Update it before {expiryDate} so deposits and recovery charges keep going through without a break."

#### State: Payment Failed
- Icon: warning (amber)
- Label: "ACTION NEEDED"
- Heading: "We couldn't charge your card ending {last4}"
- Body: "Protection is still active for {daysRemaining} more days. Update your payment method to avoid a pause on deposits and slot recovery."

### Design
- Prototype: [`design/Payment Warning Banner (standalone).html`](design/Payment%20Warning%20Banner%20(standalone).html)
- Desktop + mobile responsive layouts
- Amber (#c97a2a) on 10% tint with hairline border — the "something needs doing" color, not the "something broke" one. Red is reserved for true failures.
- Same calm frame for both states — the copy escalates, the chrome does not
- One clear CTA — "Update payment method" carries the urgency. The dismiss X lets it wait, but it returns until the card is fixed.

### Pages impacted
- All `/app/*` routes (via layout)
