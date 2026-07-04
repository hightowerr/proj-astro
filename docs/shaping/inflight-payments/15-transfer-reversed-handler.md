# Spec 15: Add `transfer.reversed` Webhook Handler

**Priority**: P2 (HIGH)

## Summary
`transfer.reversed` fires when a chargeback or manual reversal occurs after a successful transfer to a connected account. This is the primary post-transfer failure event. Add a handler modeled on the existing `transfer.created` handler, using `resolveTransferContext` to link back to the appointment/shop.

## Pre-requisite: Stripe Dashboard config
Register `transfer.reversed` on the Connect webhook endpoint in the Stripe Dashboard. Without this, the handler will never receive events.

## Behaviour
- In `connect-webhook/route.ts`, add an `else if (event.type === "transfer.reversed")` branch after `transfer.created`
- Extract the `Stripe.Transfer` object from `event.data.object`
- Call `resolveTransferContext(transfer)` to get appointment/shop context
- If context resolved:
  ```
  console.error("Transfer reversed — MANUAL_REVIEW_REQUIRED", {
    transferId, amount, currency, destinationAccountId,
    appointmentId, shopId, shopName,
    eventId: event.id,
    action: "MANUAL_REVIEW_REQUIRED",
  })
  ```
- If context unresolvable:
  ```
  console.error("Transfer reversed but could not resolve appointment context", {
    transferId, amount, destinationAccountId,
    eventId: event.id,
    action: "MANUAL_REVIEW_REQUIRED",
  })
  ```
- Both paths use `console.error` (not `console.warn`) — a reversal is a money event requiring human attention

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.ts`
- `resolveTransferContext` already handles the `Transfer → Charge → PaymentIntent → Payment → Appointment → Shop` chain — no changes needed to `stripe-utils.ts`

## Dependencies
- **Requires**: Spec 14 (dead code removed — cleaner diff, avoids confusion)
- **Stripe Dashboard**: `transfer.reversed` must be registered on the Connect endpoint

## Out of scope
- Automated state changes (e.g. marking appointment as reversed) — this is observability-first; state automation is a future spec
- UI surfacing of reversal state (future work)
- `transfer.updated` handler (see spec 17)
