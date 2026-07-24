# Wave 3 — Slice 3b: Booking Page Soft Lock

## Spec
08-booking-page-soft-lock.md

## Files to create/modify
- **Modify**: `src/app/book/[slug]/page.tsx` — add subscription status check after shop load

## Dependencies
- Wave 1 slice 1a (01-schema) — needs `subscriptionStatus` column

## Acceptance Criteria
1. After loading the shop, check if `shop.subscriptionStatus === 'canceled'`.
2. If canceled, render an "unavailable" message instead of the booking form.
3. The unavailable state hides the booking form.
4. Display a centered card with clock icon, "TEMPORARILY UNAVAILABLE" label, heading, and body text.
5. If shop has a phone number, display it below a divider.
6. Retain the page header above the card.
7. No mention of subscription/billing in the unavailable message.
8. On DB error, fail closed (show unavailable).
9. Follow the design prototype at `design/Booking Page Unavailable (standalone).html`.
10. `pnpm check` passes with zero new errors.
