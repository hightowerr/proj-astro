# 13 — Refund: Reverse Transfer

## Summary
Modify the refund flow to reverse the transfer to the connected account and refund the application fee when refunding a Connect payment.

## Prerequisites
- Depends on: 12 (payment-destination-charges) — must understand the charge structure to reverse it correctly

## Changes

**File:** `src/lib/stripe-refund.ts` (~line 186)

### Before (current)
```ts
const refund = await stripe.refunds.create({
  payment_intent: payment.stripePaymentIntentId,
  amount: payment.amountCents,
  metadata: { ... },
}, { idempotencyKey: `refund-${appointment.id}` });
```

### After
```ts
// Check if the original payment used Connect
const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
const usedConnect = Boolean(intent.transfer_data?.destination);

const refundParams: Stripe.RefundCreateParams = {
  payment_intent: payment.stripePaymentIntentId,
  amount: payment.amountCents,
  metadata: { ... },
};

if (usedConnect) {
  refundParams.reverse_transfer = true;
  refundParams.refund_application_fee = true;
}

const refund = await stripe.refunds.create(refundParams, {
  idempotencyKey: `refund-${appointment.id}`,
});
```

### Why retrieve the PaymentIntent first
- Old payments (created before Connect) have no `transfer_data` — passing `reverse_transfer: true` on those would error
- This is a one-time API call per refund (refunds are infrequent), so the latency cost is negligible
- Avoids adding a `isConnectPayment` column to the payments table

### `refund_application_fee: true`
Returns the 50p platform fee to the customer as part of the full refund. This is the right default — if the merchant cancels or the customer cancels within the refund window, neither party should be penalised. The platform absorbs the fee loss.

### Edge case: connected account has insufficient balance
Stripe handles this for Express accounts by creating a negative balance on the connected account, which is recovered from future payouts. No special handling needed.

## Acceptance
- Refunding a Connect payment includes `reverse_transfer` and `refund_application_fee`
- Refunding a pre-Connect payment works unchanged (no `reverse_transfer`)
- The connected account's balance is debited by the transfer amount
- The 50p application fee is returned to the customer
