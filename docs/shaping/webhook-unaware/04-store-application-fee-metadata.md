# Spec 04: Store `applicationFeeAmountCents` in Payments Metadata

## Summary
Persist the platform's application fee amount in `payments.metadata` alongside the existing `connectedAccountId`. Currently the 50p fee is set on the PaymentIntent (`appointments.ts:1141`) but discarded locally — can't show payout breakdown in SMS/email without a Stripe API call.

## Behaviour
At PaymentIntent creation, store `applicationFeeAmountCents` in `payments.metadata` via `buildConnectPaymentMetadata()` (extracted pure function):
- `applicationFeeAmountCents`: `String(paymentIntent.application_fee_amount ?? 0)` — stored as string because `payments.metadata` is typed `Record<string, string>`
- Value is `"50"` for standard Connect payments, `"0"` when `amountCents <= 50` (fee waived), `"0"` when no Connect account
- Source is `paymentIntent.application_fee_amount` (from Stripe response), not `piParams` (out of scope at write location — declared inside a `try` block)

## Scope
- Extracted `buildConnectPaymentMetadata()` pure function at `appointments.ts:699-722` — replaces the inline metadata construction
- The function takes `(transferData, applicationFeeAmount, existingMetadata)` and returns `{ metadata: {...} } | {}`
- `createAppointment()` at ~line 1204 calls the extracted function via spread: `...buildConnectPaymentMetadata(paymentIntent.transfer_data, paymentIntent.application_fee_amount, created.payment.metadata)`
- No schema changes — `payments.metadata` is already a JSON column
- No new DB columns

## Implementation detail
```ts
// Extracted function (appointments.ts:699-722):
export function buildConnectPaymentMetadata(
  transferData: { destination?: string | { id: string } | null } | null | undefined,
  applicationFeeAmount: number | null | undefined,
  existingMetadata: Record<string, string> | null | undefined,
): { metadata: Record<string, string> } | Record<string, never> {
  const connectedAccountId = /* resolve from transferData */;
  if (!connectedAccountId) return {};
  return {
    metadata: {
      ...(existingMetadata ?? {}),
      connectedAccountId,
      applicationFeeAmountCents: String(applicationFeeAmount ?? 0),
    },
  };
}
```

## Dependencies
- **Prerequisites**: None — `buildConnectPaymentMetadata` is a pure function with no external dependencies

## Out of scope
- Displaying the fee in the payment card UI (already implemented via `FeeBreakdown`)
- Displaying payout amount in SMS/email (future consumer of this data)
- Changing the fee amount or model (separate concern — see "Stripe processing fee not recoverable" issue)
