# Slice 1c: Suspension Sweep — Cancel Pending PaymentIntents

**Spec**: 07 | **Priority**: P3 | **File**: `src/app/api/stripe/connect-webhook/route.ts`

## Work

### 1. Add sweep logic after suspension status update
- **Where**: `account.updated` handler, after setting status to `"suspended"` (~line 82)
- **Trigger**: `charges_enabled` transitions to `false`
- **Query**: Find appointments for this shop where `paymentStatus === "pending"` AND `stripePaymentIntentId IS NOT NULL`
  ```typescript
  const pendingAppointments = await tx.query.appointments.findMany({
    where: (table, { and, eq, isNotNull }) => and(
      eq(table.shopId, shop.id),
      eq(table.paymentStatus, "pending"),
      isNotNull(table.stripePaymentIntentId),
    ),
  });
  ```

### 2. Cancel each PaymentIntent
- For each appointment: `stripe.paymentIntents.cancel(stripePaymentIntentId)`
- **Idempotent**: safe if PI already cancelled or succeeded
- **Error handling**: Catch per-PI errors (e.g., PI already succeeded in race window), `console.warn`, continue to next — do NOT throw
- Do NOT update appointment DB status here — let the existing `payment_intent.canceled` webhook handler handle the DB update

### 3. Log sweep results
- `console.warn` with shop ID and count of PIs cancelled
- Log individual PI IDs at warn level

## Acceptance criteria
- [ ] On `charges_enabled` → false, pending appointments with PI IDs are queried
- [ ] Each matching PI is cancelled via Stripe API
- [ ] If PI cancel fails (already succeeded/cancelled): logged as warning, continues to next
- [ ] Logging uses `console.warn` (not `console.info`)
- [ ] Non-suspension status changes (charges_enabled stays true) do NOT trigger sweep
- [ ] lint + type-check pass

## Dependencies
- None — uses existing appointment fields and Stripe API
