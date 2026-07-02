# Spec 01: Transfer Context Lookup Helper

## Summary
Shared helper that resolves a Stripe `transfer` event object to local appointment/shop/payment context. Both `transfer.created` and `transfer.failed` handlers need this lookup — extract once to avoid duplication.

## Behaviour
Given a Stripe transfer object:
1. Read `transfer.source_transaction` (charge ID for automatic transfers from destination charges)
2. Call `stripe.charges.retrieve(chargeId)` → extract `charge.payment_intent` (the PaymentIntent ID)
3. Look up `payments` table by `stripePaymentIntentId` → join `appointments` + `shops` for context
4. Return `{ appointmentId, shopId, shopName, paymentId, connectedAccountId, amountCents }` or `null` if any step fails

## Scope
- New function `resolveTransferContext(transfer: Stripe.Transfer)` in `src/lib/stripe-utils.ts` (or co-located with webhook helpers if a utils file already exists)
- One Stripe API call (`charges.retrieve`) + one DB query
- Return type: `TransferContext | null` — caller decides how to handle `null`
- `console.warn` if any resolution step fails (charge not found, payment not in DB) — don't throw, return `null`

## Dependencies
- **Prerequisites**: None — uses existing `payments.stripePaymentIntentId` column and existing Stripe SDK instance

## Out of scope
- Handling the transfer events themselves (specs 02, 03)
- Storing transfer data in the DB (explicitly rejected — console logging is v1 observability)
- Caching or batching Stripe API calls (single call per event is fine at current volume)
