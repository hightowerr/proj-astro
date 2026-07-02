# Slice 1B: Store applicationFeeAmountCents in Metadata

## Spec
04-store-application-fee-metadata

## Files
- **Modify**: `src/queries/appointments.ts` (~line 1186)

## Implementation

In the `db.update(payments).set(...)` block at lines 1181-1194, add `applicationFeeAmountCents` to the metadata object:

```ts
// Current code (~line 1186):
metadata: {
  ...(created.payment.metadata ?? {}),
  connectedAccountId,
},

// Change to:
metadata: {
  ...(created.payment.metadata ?? {}),
  connectedAccountId,
  applicationFeeAmountCents: piParams.application_fee_amount ?? 0,
},
```

The `?? 0` handles two cases:
- `amountCents <= 50`: `application_fee_amount` was deleted at line 1148 → `undefined ?? 0` → `0`
- No Connect account: the entire metadata block is skipped by the `connectedAccountId &&` guard → this line never runs

## Acceptance criteria
- [ ] `applicationFeeAmountCents` present in `payments.metadata` after PaymentIntent creation for Connect payments
- [ ] Value is `50` for standard Connect payments (`amountCents > 50`)
- [ ] Value is `0` for fee-waived Connect payments (`amountCents <= 50`)
- [ ] Non-Connect payments: metadata block unchanged (existing `connectedAccountId &&` guard)
- [ ] Existing metadata fields preserved (spread operator)
- [ ] lint + type-check pass

## Dependencies
None
