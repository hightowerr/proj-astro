# Slice 2A: Transfer Event Handlers (Created + Failed)

## Specs
02-handle-transfer-created, 03-handle-transfer-failed

Combined into one slice: both modify the same file (`connect-webhook/route.ts`), add adjacent cases in the same if/else chain, and share the same dependency (spec 01). Separate specs maintain distinct acceptance criteria.

## Files
- **Modify**: `src/app/api/stripe/connect-webhook/route.ts` (~after line 86)

## Implementation

After the `account.updated` block, add two new cases:

### transfer.created handler
```ts
} else if (event.type === "transfer.created") {
  const transfer = event.data.object as Stripe.Transfer;
  const context = await resolveTransferContext(transfer);

  if (context) {
    console.info("Transfer succeeded", {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destinationAccountId: transfer.destination,
      appointmentId: context.appointmentId,
      shopId: context.shopId,
      shopName: context.shopName,
      status: "succeeded",
    });
  } else {
    console.warn("Transfer created but could not resolve appointment context", {
      transferId: transfer.id,
      amount: transfer.amount,
      destinationAccountId: transfer.destination,
    });
  }
```

### transfer.failed handler
```ts
} else if (event.type === "transfer.failed") {
  const transfer = event.data.object as Stripe.Transfer;
  const context = await resolveTransferContext(transfer);

  console.error("Transfer failed — MANUAL_REVIEW_REQUIRED", {
    transferId: transfer.id,
    amount: transfer.amount,
    currency: transfer.currency,
    destinationAccountId: transfer.destination,
    failureMessage: (transfer as any).failure_message ?? "unknown",
    failureCode: (transfer as any).failure_code ?? "unknown",
    appointmentId: context?.appointmentId ?? "unknown",
    shopId: context?.shopId ?? "unknown",
    shopName: context?.shopName ?? "unknown",
    eventId: event.id,
    action: "MANUAL_REVIEW_REQUIRED",
  });
```

### Import
Add to top of file:
```ts
import { resolveTransferContext } from "@/lib/stripe-utils";
```

## Acceptance criteria

### transfer.created (spec 02)
- [ ] `transfer.created` event dispatches to the new handler
- [ ] With resolvable context: `console.info` logged with transferId, amount, appointmentId, shopId, status
- [ ] With unresolvable context: `console.warn` logged (transfer arrived but couldn't correlate)
- [ ] Dedup works: same event ID processed once

### transfer.failed (spec 03)
- [ ] `transfer.failed` event dispatches to the new handler
- [ ] `console.error` logged with `action: "MANUAL_REVIEW_REQUIRED"`, failure reason, full context
- [ ] With unresolvable context: `console.error` still fires with `"unknown"` fields (not downgraded to warn)
- [ ] Dedup works: same event ID processed once

### Both
- [ ] Existing `account.updated` handler unmodified
- [ ] Webhook still returns 200 for all event types
- [ ] lint + type-check pass

## Dependencies
- Spec 01 (slice 1A) — `resolveTransferContext` must exist
