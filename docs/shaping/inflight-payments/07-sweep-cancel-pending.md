# Spec 07: Suspension Sweep — Cancel Pending PaymentIntents

**Priority**: P3 (MEDIUM)

## Summary
When `charges_enabled` flips to `false` in `connect-webhook/route.ts` (`account.updated` handler), scan the shop's pending appointments that have a `stripePaymentIntentId` and cancel each PaymentIntent via Stripe API. This prevents customers from completing payment with a stale `clientSecret` that would result in a charge-without-transfer.

## Behaviour
- Trigger: `account.updated` event where `charges_enabled` transitions to `false` (shop status set to `"suspended"`)
- Query: appointments for this shop where `paymentStatus === "pending"` AND `stripePaymentIntentId IS NOT NULL`
- For each matching appointment:
  1. Call `stripe.paymentIntents.cancel(stripePaymentIntentId)` — idempotent, safe if already cancelled
  2. Update appointment: `paymentStatus: "cancelled"` (or let the `payment_intent.canceled` webhook handle the DB update via existing handler)
  3. `console.warn("Cancelled in-flight PaymentIntent %s for suspended shop %s", piId, shopId)`
- If Stripe cancel call fails (e.g., PI already succeeded in the race window): `console.warn`, continue to next — do not throw
- Trade-off: disrupts customers mid-checkout. Acceptable because the alternative (customer pays, money held indefinitely) is worse. Booking page guard (spec 14 in booking-page) already prevents NEW bookings.

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.ts` — `account.updated` handler (~line 48-86)
- Needs DB query for pending appointments by shop

## Dependencies
- **Prerequisites**: None — uses existing appointment fields and Stripe API

## Out of scope
- Flagging recently-succeeded payments (see spec 08)
- Customer notification that their checkout was interrupted (future — booking page already shows error on PI cancel)
