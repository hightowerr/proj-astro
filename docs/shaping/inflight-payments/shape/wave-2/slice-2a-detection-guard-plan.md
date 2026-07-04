# Slice 2a: Detection Guard at payment_intent.succeeded

**Spec**: 03 | **Priority**: P2 | **File**: `src/app/api/stripe/webhook/route.ts`

## Work

### 1. Add shop lookup after payment success
- **Where**: `payment_intent.succeeded` handler (~line 209-233), after `handlePaymentIntent()` call
- **Spike finding**: Webhook has NO shop context — must query shop directly
- **Pattern**: Use `intent.transfer_data?.destination` (the connected account ID) to look up shop:
  ```typescript
  if (intent.transfer_data?.destination) {
    const shop = await tx.query.shops.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.stripeAccountId, intent.transfer_data!.destination as string),
    });
  }
  ```

### 2. Check suspension status and flag
- If `shop?.stripeOnboardingStatus === "suspended"`:
  - Update appointment: `transferHeld: true`
  - Need appointment ID from the payment record (already retrieved in `handlePaymentIntent`)
  - `console.warn("Payment succeeded but transfer held — shop %s suspended", shop.id)`
- If shop is NOT suspended or no transfer_data: no change

### 3. Ensure order of operations
- Guard runs AFTER `handlePaymentIntent()` marks payment as `"paid"` — the payment status update is not conditional on transfer status
- This is POST-SUCCESS: the customer's payment succeeded, this is bookkeeping

## Acceptance criteria
- [ ] Shop looked up via `stripeAccountId` from `intent.transfer_data.destination`
- [ ] If shop status `"suspended"` → appointment updated with `transferHeld: true`
- [ ] If shop status NOT suspended → no change
- [ ] If no `transfer_data` (non-Connect payment) → guard skipped entirely
- [ ] `console.warn` logged on held detection
- [ ] Payment still marked `"paid"` regardless of guard outcome
- [ ] lint + type-check pass

## Dependencies
- **Requires**: Slice 1b (transferHeld column exists)
