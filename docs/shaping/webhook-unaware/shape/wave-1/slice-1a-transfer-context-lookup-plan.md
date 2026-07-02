# Slice 1A: Transfer Context Lookup Helper

## Spec
01-transfer-context-lookup

## Files
- **Create**: `src/lib/stripe-utils.ts`

## Implementation

### 1. Define return type
```ts
export type TransferContext = {
  appointmentId: string;
  shopId: string;
  shopName: string;
  paymentId: string;
  connectedAccountId: string;
  amountCents: number;
};
```

### 2. Implement `resolveTransferContext(transfer: Stripe.Transfer): Promise<TransferContext | null>`

Steps:
1. Check `transfer.source_transaction` exists — if not, `console.warn("Transfer has no source_transaction — likely a manual transfer", { transferId: transfer.id })` and return `null`
2. Call `stripe.charges.retrieve(transfer.source_transaction as string)` — wrap in try/catch, `console.warn` + return `null` on failure
3. Check `charge.payment_intent` exists — if null, `console.warn` + return `null`
4. Extract PI ID: `typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id`
5. DB query: look up `payments` by `stripePaymentIntentId`, join `appointments` and `shops` for context
6. If no row found: `console.warn("Transfer's PaymentIntent not found in DB", { paymentIntentId, transferId })` + return `null`
7. Return populated `TransferContext`

### 3. Imports
- `stripe` instance from existing `src/lib/stripe.ts`
- `db` from existing `src/db/index.ts`
- `payments`, `appointments`, `shops` from schema
- `eq` from drizzle-orm

## Acceptance criteria
- [ ] `resolveTransferContext` exported from `src/lib/stripe-utils.ts`
- [ ] Returns `TransferContext` on happy path (charge found, PI found, payment in DB)
- [ ] Returns `null` with `console.warn` for each failure path (no source_transaction, charge not found, PI not in DB)
- [ ] Does not throw — all errors caught and returned as `null`
- [ ] lint + type-check pass

## Dependencies
None
