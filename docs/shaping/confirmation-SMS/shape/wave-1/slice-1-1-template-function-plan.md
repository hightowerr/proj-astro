# Slice 1-1 — Template + function update

**Specs**: 01 + 02 (atomic)
**File**: `src/lib/messages.ts`

## Steps

1. Change `DEFAULT_TEMPLATE_VERSION` from `1` to `2` (line 15)
2. In `DEFAULT_TEMPLATE_BODY` (line 16-17), replace `Paid {{amount}}.` with `{{paid_line}}`
3. Replace `amountLabel` variable (lines 290-292):
   ```ts
   const paidLine = payment
     ? `Paid ${formatCurrency(payment.amountCents, payment.currency)}. `
     : "";
   ```
4. Delete the `!payment` bail-out block (lines 321-329) — the entire `if (!payment) { ... return; }` block
5. Update template substitution: `.replace("{{amount}}", amountLabel)` → `.replace("{{paid_line}}", paidLine)`
6. Run `pnpm check`

## Acceptance criteria

- `DEFAULT_TEMPLATE_VERSION` is `2`
- `DEFAULT_TEMPLATE_BODY` contains `{{paid_line}}`, not `{{amount}}`
- No `if (!payment)` bail-out exists in `sendBookingConfirmationSMS()`
- Template substitution uses `.replace("{{paid_line}}", paidLine)`
- `pnpm check` passes
