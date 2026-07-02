# Spec 03: Handle `transfer.failed` Event

## Summary
Add a `transfer.failed` handler to `connect-webhook/route.ts`. This is the critical alerting path — `console.error` on failure so Vercel log monitoring catches it. Addresses 4 of 6 failure paths: account suspension, insufficient balance, chargeback freeze, routing misconfiguration.

## Behaviour
When `(event.type as string) === "transfer.failed"` (Stripe TS types omit `transfer.failed` — cast required, runtime behavior correct):
1. Extract the `transfer` object from `event.data.object`
2. Call `resolveTransferContext(transfer)` (spec 01)
3. `console.error` with structured payload:
   - `transferId`, `amount`, `currency`, `destinationAccountId`
   - `failureMessage`: `(transfer as any).failure_message ?? "unknown"` and `failureCode`: `(transfer as any).failure_code ?? "unknown"` (cast needed — Stripe types don't expose these on all transfer states)
   - `appointmentId`, `shopId`, `shopName` (from context, or `"unknown"` if context is `null`)
   - `eventId`: `event.id` (for Stripe Dashboard cross-reference)
   - `action: "MANUAL_REVIEW_REQUIRED"` — makes log grep easy
4. If context is `null`: still `console.error` — a failed transfer with no context is worse, not better

## Scope
- New `case "transfer.failed":` block in `connect-webhook/route.ts`, after the `transfer.created` block
- `console.error` not `console.warn` — a failed transfer means the merchant didn't get paid. This is a runtime event with financial consequences.
- No DB writes, no automated remediation — human reviews Vercel logs and intervenes manually (v1)
- No merchant notification email — build when a second notification use case appears (disputes). The disputes issue now provides that second use case, but the notification infra ships with that item, not this one.

## Dependencies
- **Prerequisites**: Spec 01 (transfer context lookup helper)
- **Stripe Dashboard**: `transfer.failed` must be registered on the Connect webhook endpoint (spec 07)

## Out of scope
- Automated refund on transfer failure (requires policy decision — does the platform refund the customer?)
- `transferHeld` flag on appointments (that's the "In-flight payments during Connect suspension" issue's P2)
- Merchant notification email (ships with the disputes issue, not this one)
