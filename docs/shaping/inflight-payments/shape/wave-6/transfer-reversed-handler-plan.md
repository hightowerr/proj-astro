# Slice 6a: Add `transfer.reversed` Webhook Handler

**Spec**: 15
**File(s)**: `src/app/api/stripe/connect-webhook/route.ts`
**Dependencies**: Spec 14 (dead code removed)

## What to do

### 1. Add handler branch (`route.ts`)
After the `transfer.created` handler, add a new `else if (event.type === "transfer.reversed")` branch.

```typescript
} else if (event.type === "transfer.reversed") {
  const transfer = event.data.object as Stripe.Transfer;
  const context = await resolveTransferContext(transfer);

  if (context) {
    console.error("Transfer reversed — MANUAL_REVIEW_REQUIRED", {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destinationAccountId: transfer.destination,
      appointmentId: context.appointmentId,
      shopId: context.shopId,
      shopName: context.shopName,
      eventId: event.id,
      action: "MANUAL_REVIEW_REQUIRED",
    });
  } else {
    console.error(
      "Transfer reversed but could not resolve appointment context",
      {
        transferId: transfer.id,
        amount: transfer.amount,
        destinationAccountId: transfer.destination,
        eventId: event.id,
        action: "MANUAL_REVIEW_REQUIRED",
      }
    );
  }
```

### Key decisions
- **`console.error`** (not `console.warn`) — a reversal is a money event requiring human attention
- **No `(event.type as string)` cast** — `transfer.reversed` is a real Stripe event with full TS types (spike finding)
- **`MANUAL_REVIEW_REQUIRED` action tag** — same pattern as the (now-removed) transfer.failed handler, but for a real event
- **`resolveTransferContext`** reused as-is — works for all transfer event types (spike finding)
- **No automated state changes** — observability-first; state automation is future work

### 2. Handler ordering
The branch order should be: `account.updated` → `transfer.created` → `transfer.reversed` → `else` (unexpected).
Spec 17 (transfer.updated) will slot between `transfer.reversed` and `else` in wave 6.

### 3. Verify
- `pnpm check` passes
- No type errors on `event.type === "transfer.reversed"` (no cast needed)

## Acceptance criteria
- [ ] `transfer.reversed` handler added to `connect-webhook/route.ts`
- [ ] Uses `console.error` with `MANUAL_REVIEW_REQUIRED` action tag
- [ ] Uses `resolveTransferContext` for appointment/shop context
- [ ] No `(event.type as string)` cast — direct comparison
- [ ] Handles both resolved and unresolved context paths
- [ ] `pnpm check` passes with zero new errors
