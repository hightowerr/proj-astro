# Spec 02: Handle `transfer.created` Event

## Summary
Add a `transfer.created` handler to `connect-webhook/route.ts`. Logs successful transfer outcomes — the happy-path observability that currently doesn't exist.

## Behaviour
When `event.type === "transfer.created"`:
1. Extract the `transfer` object from `event.data.object`
2. Call `resolveTransferContext(transfer)` (spec 01)
3. If context resolved: `console.warn` with structured payload (lint `no-console` rule forbids `console.info`; message text "Transfer succeeded" + `status: "succeeded"` field preserve intent):
   - `transferId`, `amount`, `currency`, `destinationAccountId`
   - `appointmentId`, `shopId`, `shopName` (from context)
   - `status: "succeeded"`
4. If context is `null`: `console.warn` — transfer arrived but couldn't correlate to an appointment (possible manual transfer or data inconsistency)

## Scope
- New `case "transfer.created":` block in `connect-webhook/route.ts`, after the existing `account.updated` block (~line 86)
- Uses the existing dedup mechanism (lines 37-43) — no changes to dedup logic
- `console.warn` not `console.error` — a created transfer is a success, not a failure. `console.info` was the original intent but lint `no-console` rule only allows `warn` and `error`.
- No DB writes — logging only (v1 observability)

## Dependencies
- **Prerequisites**: Spec 01 (transfer context lookup helper)
- **Stripe Dashboard**: `transfer.created` must be registered on the Connect webhook endpoint (spec 07) — but code ships first, events registered after deploy

## Out of scope
- `transfer.failed` handling (spec 03)
- Updating appointment or payment records based on transfer status (future — reconciliation features)
- Merchant notification on successful transfer (not needed — deposits just work)
