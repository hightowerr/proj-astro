# Spike: Stripe Transfer Event Types

**Date**: 2026-07-03
**Specs**: 14, 15, 16, 17, 18

## Question
Do `transfer.reversed` and `transfer.updated` have full Stripe TS type coverage, or do they need `(event.type as string)` casts like `transfer.failed`?

## Findings

### 1. `transfer.reversed` and `transfer.updated` are fully typed
Both events exist in `node_modules/stripe/types/EventTypes.d.ts` (lines 3533-3560) and `Events.d.ts` (lines 242-243). They have dedicated interfaces:
- `TransferReversedEvent` — `type: 'transfer.reversed'`, `data.object: Stripe.Transfer`
- `TransferUpdatedEvent` — `type: 'transfer.updated'`, `data.object: Stripe.Transfer`

No `(event.type as string)` cast needed. Standard `event.type === "transfer.reversed"` compiles cleanly.

### 2. `transfer.failed` does NOT exist in Stripe types
Confirmed: `transfer.failed` is absent from `Events.d.ts` and `EventTypes.d.ts`. The original implementation's `(event.type as string)` cast was a workaround for a type that correctly doesn't exist — the event itself doesn't exist.

### 3. All three transfer events share identical data shape
`transfer.created`, `transfer.reversed`, `transfer.updated` all have `data.object: Stripe.Transfer` with optional `previous_attributes: Partial<Stripe.Transfer>`. The existing `resolveTransferContext(transfer)` helper works for all three without modification.

### 4. `transfer.updated` only fires for description/metadata changes
Per Stripe's JSDoc: "Occurs whenever a transfer's description or metadata is updated." This is informational only — no money movement. `console.warn` is the correct severity.

### 5. `transfer.reversed` fires for partial reversals too
Per Stripe's JSDoc: "Occurs whenever a transfer is reversed, including partial reversals." The handler should log `transfer.amount` (which reflects the original transfer amount) but the reversal details are in `transfer.reversals` (a list). For v1, logging the event with `console.error` is sufficient — parsing individual reversal amounts is future work.

## Impact on specs
- Spec 15: Use `event.type === "transfer.reversed"` (no cast). `data.object` typed as `Stripe.Transfer`.
- Spec 17: Use `event.type === "transfer.updated"` (no cast). `data.object` typed as `Stripe.Transfer`.
- Spec 14: Removal of `(event.type as string) === "transfer.failed"` is correct — this was masking a non-existent event.
- All: `resolveTransferContext()` works as-is for all transfer event types.

## No changes needed to specs
Spike confirms all spec assumptions hold. No modifications required.
