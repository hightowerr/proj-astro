# Spec 10: Test Application Fee Metadata Storage

## Summary
Test that `applicationFeeAmountCents` is correctly stored in `payments.metadata` during PaymentIntent creation (spec 04). Verify all three value paths.

## Test cases
1. **Standard Connect payment** — `amountCents > 50`, Connect account complete → `applicationFeeAmountCents: "50"` (string) stored in metadata alongside `connectedAccountId`
2. **Fee-waived payment** — `amountCents <= 50`, Connect account complete → `applicationFeeAmountCents: "0"` (string, `?? 0` fallback fires then `String()` wraps)
3. **Non-Connect payment** — no connected account → `buildConnectPaymentMetadata` returns `{}` (entire metadata block skipped)
4. **Existing metadata preserved** — payment already has metadata fields → new field merges without overwriting existing keys

Implementation expanded to 11 tests covering `connectedAccountId` resolution paths (null/undefined/string/object destination).

## Scope
- Test `buildConnectPaymentMetadata()` directly — pure function, no mocks needed
- Values are strings (`"50"`, `"0"`) because `payments.metadata` is `Record<string, string>`

## Dependencies
- **Prerequisites**: Spec 04 (the code under test)

## Out of scope
- Testing consumers of this metadata (payout display, fee reporting — future features)
- Testing the `application_fee_amount` value on the Stripe PaymentIntent itself (that's Stripe's responsibility)
