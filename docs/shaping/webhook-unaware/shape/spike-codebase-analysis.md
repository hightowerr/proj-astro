# Spike: Codebase Analysis (Pre-resolved)

Pre-resolved via agent codebase analysis before shaping. Follows the spike-before-shape pattern.

## Spike 1 — Does `transfer.source_transaction` exist on automatic transfers?

**Question**: For destination charges (`transfer_data.destination`), does the automatic transfer contain `source_transaction` linking back to the charge?

**Answer**: YES. Stripe's automatic transfers for destination charges include `source_transaction` (the charge ID). The charge object has `payment_intent` linking to the PaymentIntent. Our DB has `payments.stripePaymentIntentId`. The full lookup chain is viable.

## Spike 2 — What's the existing webhook handler pattern?

**Answer**: Both webhooks use identical structure:
1. Verify signature against secret
2. Insert event ID into `processedStripeEvents` with `onConflictDoNothing` (dedup)
3. If insert succeeded → dispatch on `event.type` via if/else chain
4. Return `NextResponse.json({ received: true })`

Connect webhook handles: `account.updated` only.
Platform webhook handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.

New handlers slot into the existing if/else chain. No structural changes needed.

## Spike 3 — What's the metadata storage code path?

**Answer**: `appointments.ts:1181-1194`. After PaymentIntent creation, updates `payments` row:
```ts
metadata: {
  ...(created.payment.metadata ?? {}),
  connectedAccountId,  // already stored
  // applicationFeeAmountCents goes here
},
```

The spread preserves existing metadata. Adding `applicationFeeAmountCents` is a single field addition. The value must capture the post-edge-case amount (after the `<= 50p` deletion at line 1148), which is `piParams.application_fee_amount ?? 0`.

## Spike 4 — Dedup interaction with new event types

**Question**: Will the shared dedup table cause issues with `transfer.*` events?

**Answer**: No. The dedup key is `event.id`, which is globally unique across all Stripe event types. Transfer events have their own event IDs. The dedup mechanism is event-type-agnostic — it prevents double-processing of the same event, regardless of type.
