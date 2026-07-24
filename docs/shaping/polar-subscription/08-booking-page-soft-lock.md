# 08 — Booking Page Soft Lock

## Summary
Block new bookings when the merchant's `subscriptionStatus = 'canceled'`. Show "temporarily unavailable" message.

## Prerequisites
- **01-schema-migration** — needs `subscriptionStatus` column

## Changes

### `src/app/book/[slug]/page.tsx`
- After loading the shop (existing query), add inline check:
  ```
  if (shop.subscriptionStatus === 'canceled') → render unavailable message
  ```
- Follows existing pattern: `canAcceptPayments = shop.stripeOnboardingStatus === 'complete'`
- On error (DB unreachable) → fail CLOSED (show "unavailable", log error)

### Unavailable state
- Hide the booking form
- Show a centered card with:
  - Clock icon (terracotta, circular background)
  - Label: "TEMPORARILY UNAVAILABLE"
  - Heading: "Online booking is temporarily unavailable"
  - Body: "Please contact **{shop.name}** directly to book your appointment. We expect to be back online shortly."
  - If shop has a phone number on file: display it below a divider with a phone icon. Omit the divider and number if none is on file.
- Above the card: retain the page header with "BOOK AN APPOINTMENT" label and "Book with {shop.name}" heading
- No mention of subscription/billing — end-customer should not know why
- Fail closed: the same state renders when the shop is unreachable (DB error) — safer to hold bookings than to accept ones the shop cannot honor

### Design
- Prototype: [`design/Booking Page Unavailable (standalone).html`](design/Booking%20Page%20Unavailable%20(standalone).html)
- Desktop + mobile responsive layouts
- No error red — warm terracotta icon and navy ink, same palette as a healthy page
- "Temporarily" + clock glyph frame it as a pause, not an outage
- Phone number keeps the customer's intent alive instead of dead-ending them

### Pages impacted
- `/book/[slug]` — booking page
