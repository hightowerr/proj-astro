# Spike: Codebase Analysis for In-Flight Payments

Date: 2026-07-03

## Findings

### 1. Stripe refund error detection (spec 01)
- **Pattern**: `isAlreadyRefundedError()` at `stripe-refund.ts:19-29` — checks `StripeInvalidRequestError` + error code/message regex
- **Idempotency**: `refund-${appointment.id}` at line 207. Fallback retry needs distinct key (append `-fallback`)
- **reverse_transfer**: Set at lines 199-202 when `intent.transfer_data?.destination` exists
- **Gap**: No existing handler for reverse_transfer failures. Create `isReverseTransferFailedError()` following same pattern
- **Risk**: Exact Stripe error code for "no transfer to reverse" needs runtime verification — use defensive regex on error message as belt-and-suspenders

### 2. Shop lookup from webhook (spec 03)
- **Critical**: `handlePaymentIntent()` at `webhook/route.ts:23-34` has NO shop context
- **Payment lookup**: `tx.query.payments.findFirst({ where: eq(stripePaymentIntentId, intent.id) })` at line 35
- **Resolution**: After getting payment, join to appointment → shop to check `stripeOnboardingStatus`
- **Alternative**: Use `intent.transfer_data?.destination` (the Stripe account ID) to query shop directly: `shops.findFirst({ where: eq(stripeAccountId, destination) })`
- **Recommended**: Direct shop lookup via `stripeAccountId` from transfer_data — 1 query, no chain

### 3. Appointment query patterns (specs 07, 08)
- **Shop lookup in connect-webhook**: `tx.query.shops.findFirst({ where: eq(stripeAccountId, account.id) })` at lines 51-54
- **paymentStatus enum**: `["unpaid", "pending", "paid", "failed"]` — confirmed
- **stripePaymentIntentId**: text column, confirmed exists
- **No transferHeld column** — must create via migration 0039

### 4. Column type (spec 02)
- **Pattern**: `boolean("column_name").default(false).notNull()` — used throughout schema.ts
- **Migration number**: Next is 0039 (latest is 0038_stripe_connect_suspended.sql)
- **No existing transferHeld** — grep clean, zero matches

### 5. PaymentCard threading (spec 04)
- **refunded derivation**: `const refunded = financialOutcome === "refunded"` at line 139
- **FeeBreakdown props**: `amountCents: number, waived: boolean, refunded?: boolean`
- **Icon swap**: Conditional at lines 169-175: `{refunded ? "undo" : "north_east"}` + text swap
- **Pattern clear**: Add `transferHeld?: boolean` alongside `refunded`, conditional render "Held" for payout + `pause_circle` icon

### 6. Dashboard structure (spec 06)
- **Dashboard page**: `src/app/app/dashboard/page.tsx`
- **ConnectCard**: `src/components/dashboard/connect-card.tsx` — already handles "suspended" status
- **Layout order**: ConnectCard (line 150) → SummaryCards (line 152) → content grid
- **Held transfers card**: New component between ConnectCard and SummaryCards, per prototype

### 7. Lint + TS
- `console.warn` allowed, `console.info` blocked by `no-console` rule
- `boolean("col")` is the column syntax (not bare `boolean()`)

## Impact on Specs

| Spec | Divergence | Fix |
|------|-----------|-----|
| 01 | Need `isReverseTransferFailedError()` helper | Add to slice plan — new function before catch clause |
| 03 | No shop context in webhook — need direct lookup via `stripeAccountId` | Add shop query step to slice plan |
| 03 | Logging must use `console.warn` not `console.info` | Update spec |
| 07 | Logging must use `console.warn` | Update spec |
| 08 | Logging must use `console.warn` | Update spec |
