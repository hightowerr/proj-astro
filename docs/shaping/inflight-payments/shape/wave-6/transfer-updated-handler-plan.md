# Slice 6b: Add `transfer.updated` Webhook Handler

**Spec**: 17
**File(s)**: `src/app/api/stripe/connect-webhook/route.ts`
**Dependencies**: Spec 14 (dead code removed)

## What to do

### 1. Add handler branch (`route.ts`)
After the `transfer.reversed` handler (spec 15), add a new `else if (event.type === "transfer.updated")` branch.

```typescript
} else if (event.type === "transfer.updated") {
  const transfer = event.data.object as Stripe.Transfer;
  const context = await resolveTransferContext(transfer);

  console.warn("Transfer updated", {
    transferId: transfer.id,
    amount: transfer.amount,
    currency: transfer.currency,
    destinationAccountId: transfer.destination,
    appointmentId: context?.appointmentId ?? "unknown",
    shopId: context?.shopId ?? "unknown",
    eventId: event.id,
  });
```

### Key decisions
- **`console.warn`** (not `console.error`) — updates are informational (metadata/description changes), not money events
- **Single log path** — unlike `transfer.reversed`, no separate branch for unresolved context (just uses "unknown" fallbacks)
- **No `(event.type as string)` cast** — fully typed (spike finding)
- **Simpler logging** — fewer fields than reversed handler (no `action: MANUAL_REVIEW_REQUIRED`)

### 2. Handler ordering
Final order: `account.updated` → `transfer.created` → `transfer.reversed` → `transfer.updated` → `else`.

### 3. File contention note
This slice modifies the same file as slice 6a (spec 15). Both are in wave 6, which means they CANNOT run in parallel via worktrees. **Implementation note**: run these sequentially (6a then 6b) or have a single agent do both.

### 4. Verify
- `pnpm check` passes

## Acceptance criteria
- [ ] `transfer.updated` handler added to `connect-webhook/route.ts`
- [ ] Uses `console.warn` (not `console.error`)
- [ ] Uses `resolveTransferContext` for appointment/shop context
- [ ] No `(event.type as string)` cast
- [ ] `pnpm check` passes with zero new errors
