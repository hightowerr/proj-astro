# Spec 17: Add `transfer.updated` Webhook Handler

**Priority**: P3 (MEDIUM — observability)

## Summary
`transfer.updated` fires when a transfer's metadata or status changes after creation. Less critical than `transfer.reversed` but completes the transfer event coverage (Option A from the analysis). Logs the event for manual review without automated state changes.

## Pre-requisite: Stripe Dashboard config
Register `transfer.updated` on the Connect webhook endpoint in the Stripe Dashboard.

## Behaviour
- In `connect-webhook/route.ts`, add an `else if (event.type === "transfer.updated")` branch after `transfer.reversed`
- Extract `Stripe.Transfer` from `event.data.object`
- Call `resolveTransferContext(transfer)` to get appointment/shop context
- Log at `console.warn` level (not error — updates are informational, not critical):
  ```
  console.warn("Transfer updated", {
    transferId, amount, currency, destinationAccountId,
    appointmentId: context?.appointmentId ?? "unknown",
    shopId: context?.shopId ?? "unknown",
    eventId: event.id,
  })
  ```

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.ts`

## Dependencies
- **Requires**: Spec 14 (dead code removed)
- **Should complete after**: Spec 15 (keeps handler ordering logical: created → reversed → updated)

## Out of scope
- Automated state changes based on transfer updates
- Differentiating specific update types (metadata vs. status)
