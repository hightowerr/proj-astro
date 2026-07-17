# Spec 05 — P4a: Payment card `disputed` modifier

## Priority

P4 — LOW. Depends on P2.

## Summary

Add a `disputed` boolean modifier to `PaymentCard` and `FeeBreakdown`, following the existing `refunded` modifier pattern. Derived from `financialOutcome === "disputed"`. Orthogonal flag — not a 6th `FeeState`.

## Changes

- **File:** `src/components/appointments/payment-card.tsx`

### 1. Derive `disputed` flag (alongside `refunded`)

```ts
// Line ~177, after: const refunded = financialOutcome === "refunded";
const disputed = financialOutcome === "disputed";
```

### 2. Extend helper functions

**`resolvePayoutDisplay()`** — add `disputed` parameter:
```ts
function resolvePayoutDisplay(
  amountCents: number,
  waived: boolean,
  refunded: boolean,
  transferHeld: boolean,
  disputed: boolean,  // NEW
): string {
  if (disputed) return "Disputed";
  if (transferHeld) return "Held";
  // ... existing logic
}
```

**`resolveHelperIcon()`** — add `disputed`:
```ts
function resolveHelperIcon(refunded: boolean, transferHeld: boolean, disputed: boolean): string {
  if (disputed) return "gavel";
  if (refunded) return "undo";
  if (transferHeld) return "pause_circle";
  return "north_east";
}
```

**`resolveHelperText()`** — add `disputed`:
```ts
function resolveHelperText(refunded: boolean, transferHeld: boolean, disputed: boolean): string {
  if (disputed) return "This deposit is under dispute. Respond via your Stripe Dashboard.";
  if (refunded) return "Payout reversed to customer.";
  if (transferHeld) return "Payment received but transfer paused — Stripe is reviewing your account.";
  return "Payout routed to your connected bank account.";
}
```

### 3. Extend `FeeBreakdown` props

```ts
// Add disputed prop alongside refunded
function FeeBreakdown({
  amountCents,
  waived = false,
  refunded = false,
  transferHeld = false,
  disputed = false,  // NEW
}: { ... })
```

### 4. Thread `disputed` through render

Pass `disputed` to all three helper functions and to `FeeBreakdown` where it's called in `PaymentCard`.

## Design Notes (for designer)

### Visual spec for disputed state

| Element | Value |
|---------|-------|
| Payout line | "Disputed" in `--al-error-soft` (#a8294a) italic (same pattern as "Returned" for refunded) |
| Helper icon | `gavel` material symbol |
| Helper text | "This deposit is under dispute. Respond via your Stripe Dashboard." |
| Platform fee | Shown as normal (fee was already collected — dispute may be won) |

### Comparison with refunded modifier

| Element | Refunded | Disputed |
|---------|----------|----------|
| Payout text | "Returned" | "Disputed" |
| Payout color | `--al-error-soft` italic | `--al-error-soft` italic |
| Icon | `undo` | `gavel` |
| Helper text | "Payout reversed to customer." | "This deposit is under dispute. Respond via your Stripe Dashboard." |

### Pages impacted

- `/app/appointments/[id]` — appointment detail page (renders `PaymentCard`)

## Acceptance Criteria

- [ ] `disputed` derived from `financialOutcome === "disputed"`
- [ ] Payout display shows "Disputed" when disputed is true
- [ ] Helper icon is `gavel`
- [ ] Helper text references Stripe Dashboard
- [ ] `FeeBreakdown` accepts `disputed` prop
- [ ] Disputed takes priority over refunded/transferHeld in helper resolution order
- [ ] `pnpm check` passes

## Prerequisites

- Spec 02 (financialOutcome must be set to "disputed" by the webhook for this to ever render)

## Dependencies

Depends on: spec 02 (data dependency — without the webhook, `financialOutcome` is never `"disputed"`).
