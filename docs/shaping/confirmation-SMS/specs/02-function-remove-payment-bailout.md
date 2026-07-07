# Spec 02 — Function: remove `!payment` bail-out, build `paidLine`

## Summary

Make `sendBookingConfirmationSMS()` proceed when no payment record exists. Replace the `amountLabel` variable with a conditional `paidLine` that produces `"Paid £X.XX. "` for paid bookings and `""` for free bookings. Pass `paid_line` instead of `amount` to template substitution.

## File

`src/lib/messages.ts`

## Changes

### 2a — Remove `!payment` bail-out (lines 321-329)

Delete the entire block:

```ts
// DELETE THIS:
if (!payment) {
  await db.insert(messageLog).values({
    ...baseLog,
    status: "failed",
    errorCode: "payment_missing",
    errorMessage: "Payment record missing",
  });
  return;
}
```

### 2b — Replace `amountLabel` with `paidLine` (lines 290-292)

```ts
// BEFORE:
const amountLabel = payment
  ? formatCurrency(payment.amountCents, payment.currency)
  : "amount unavailable";

// AFTER:
const paidLine = payment
  ? `Paid ${formatCurrency(payment.amountCents, payment.currency)}. `
  : "";
```

### 2c — Update template substitution

In the template rendering logic, replace the `amount` token with `paid_line`:

```ts
// BEFORE (in the replace chain):
.replace("{{amount}}", amountLabel)

// AFTER:
.replace("{{paid_line}}", paidLine)
```

## Dependencies

- **Spec 01** — template must use `{{paid_line}}` before this spec passes it.

## Deployment coupling

**MUST deploy atomically with Spec 01.**

## Behaviour

| Scenario | `payment` | `paidLine` | SMS body fragment |
|----------|-----------|------------|-------------------|
| Paid booking (deposit collected) | `{ amountCents: 1000, currency: "GBP" }` | `"Paid £10.00. "` | `"...10:00 (GMT). Paid £10.00. Policy:..."` |
| Free booking (Connect not set up) | `null` | `""` | `"...10:00 (GMT). Policy:..."` |
| Free booking (tier-waived deposit) | `null` | `""` | `"...10:00 (GMT). Policy:..."` |
| Free booking (policy-no-deposit) | `null` | `""` | `"...10:00 (GMT). Policy:..."` |

## Acceptance criteria

- `sendBookingConfirmationSMS()` does NOT return early when `payment` is null
- Paid bookings still produce `"Paid £X.XX. "` in SMS body (no regression)
- Free bookings produce SMS body with no `"Paid"` fragment — sentence flows from time to policy
- SMS opt-in check (`!prefs?.smsOptIn`) still runs for both paths
- Dedup key `booking_confirmation:<appointmentId>` still prevents double-send
- Message log entry created for both paid and free paths
- `pnpm check` passes
