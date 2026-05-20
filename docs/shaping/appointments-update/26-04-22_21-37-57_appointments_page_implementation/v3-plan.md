# V3 Implementation Plan — Payment Status Badge

**Slice:** V3: Payment Status Badge  
**Appetite:** ~30 minutes  
**Prerequisite:** V1 and V2 complete (`pnpm lint && pnpm typecheck` passing)  
**File changed:** `src/app/app/appointments/page.tsx` (one file only)  
**Satisfies:** R6 (Nice-to-have)  
**Tests:** No new unit tests — pure style map. `pnpm lint && pnpm typecheck` are the gates.

---

## Current Payment Cell (lines 127–137)

```tsx
<td className="px-4 py-3">
  <div className="font-medium capitalize">
    {appointment.paymentStatus}
  </div>
  <div className="text-xs text-[var(--color-text-secondary)]">
    {currencyFormatter(
      appointment.paymentAmountCents,
      appointment.paymentCurrency
    ) ?? (appointment.paymentRequired ? "—" : "No charge")}
  </div>
</td>
```

Two lines in the cell: status label (top) and amount (bottom). Only the status label is replaced. The amount line is untouched.

---

## Change Order

```
1. Add PaymentStatusBadge component (at bottom of file, alongside FinancialOutcomeBadge)
2. Swap the status label div for the badge in the payment <td>
```

Two changes. That's the entire slice.

---

## Step 1 — Add `PaymentStatusBadge` Component

Add at the bottom of `page.tsx`, alongside `FinancialOutcomeBadge` and `SlotStatusBadge`. Same pattern as both.

```tsx
function PaymentStatusBadge({
  status,
}: {
  status: "unpaid" | "pending" | "paid" | "failed";
}) {
  const styles: Record<typeof status, React.CSSProperties> = {
    paid: {
      background: "var(--color-success-subtle)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success-border)",
    },
    pending: {
      background: "var(--color-brand-subtle)",
      color: "var(--color-brand)",
      border: "1px solid var(--color-brand-border)",
    },
    unpaid: {
      background: "var(--color-surface-overlay)",
      color: "var(--color-text-tertiary)",
      border: "1px solid var(--color-border-subtle)",
    },
    failed: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
      border: "1px solid var(--color-error-border)",
    },
  };

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize"
      style={styles[status]}
    >
      {status}
    </span>
  );
}
```

**Severity rationale:**
- `failed` → error red — the only state requiring immediate owner attention
- `paid` → success green — positive, resolved
- `pending` → brand teal — neutral in-progress (same as slot `open`)
- `unpaid` → muted — no charge required; lowest information value

**TypeScript note:** `appointment.paymentStatus` is inferred from `appointments.$inferSelect.paymentStatus` — a 4-value enum matching this union exactly. Any mismatch will be a compile error.

---

## Step 2 — Replace Status Label in Payment `<td>`

Find:

```tsx
<td className="px-4 py-3">
  <div className="font-medium capitalize">
    {appointment.paymentStatus}
  </div>
  <div className="text-xs text-[var(--color-text-secondary)]">
    {currencyFormatter(
      appointment.paymentAmountCents,
      appointment.paymentCurrency
    ) ?? (appointment.paymentRequired ? "—" : "No charge")}
  </div>
</td>
```

Replace with:

```tsx
<td className="px-4 py-3">
  <PaymentStatusBadge status={appointment.paymentStatus} />
  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
    {currencyFormatter(
      appointment.paymentAmountCents,
      appointment.paymentCurrency
    ) ?? (appointment.paymentRequired ? "—" : "No charge")}
  </div>
</td>
```

**Two changes from the original:**
1. `<div className="font-medium capitalize">{appointment.paymentStatus}</div>` → `<PaymentStatusBadge status={appointment.paymentStatus} />`
2. `<div className="text-xs...">` gains `mt-1` — adds a small gap between the badge (which has its own padding) and the amount line below it

The `currencyFormatter` call and its fallback logic are completely untouched.

---

## Verification Sequence

### Gate 1 — TypeScript

```bash
pnpm typecheck
```

**What to look for:**
- No error on `<PaymentStatusBadge status={appointment.paymentStatus} />` — confirms the 4-value union aligns with the schema enum
- No regressions from V1 or V2

### Gate 2 — Lint

```bash
pnpm lint
```

**What to look for:** `PaymentStatusBadge` is used in Step 2 — no unused-declaration warning. 0 warnings, 0 errors.

### Gate 3 — Manual Code Checklist

- [ ] `PaymentStatusBadge` defined at bottom of file alongside `FinancialOutcomeBadge` and `SlotStatusBadge`
- [ ] All 4 statuses have an entry in the styles map: `paid`, `pending`, `unpaid`, `failed`
- [ ] Payment `<td>`: no `<div className="font-medium capitalize">` remains
- [ ] Payment `<td>`: `<PaymentStatusBadge>` is the first child
- [ ] Payment `<td>`: amount `<div>` is the second child, now with `mt-1`
- [ ] `currencyFormatter` call and its fallback (`?? (appointment.paymentRequired ? "—" : "No charge")`) are byte-for-byte identical to before

### Gate 4 — Combined Pass

```bash
pnpm lint && pnpm typecheck
```

Both exit 0. Shipping gate for V3 and for the full feature.

---

## What Is NOT Changing in V3

| Item | Why not touched |
|------|-----------------|
| `FinancialOutcomeBadge` | V1's work |
| `SlotStatusBadge` | Existing, correct |
| `NoShowRiskBadge` | Existing, correct |
| Section structure and empty states | V2's work |
| Amount sub-row logic | Intentionally preserved — `currencyFormatter` and its fallback are business logic |
| All 5 data queries | Untouched |
| Slot Recovery table | No payment column there — V3 only touches the appointments table |

---

## Sufficient Conditions Checklist (R × V3)

- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] Payment column renders `PaymentStatusBadge` not plain text
- [ ] `failed` renders error red
- [ ] `paid` renders success green
- [ ] `pending` renders brand teal
- [ ] `unpaid` renders muted (surface-overlay)
- [ ] Amount sub-row still renders below the badge in the same cell
- [ ] `mt-1` gap present between badge and amount line
- [ ] R6 satisfied: `paymentStatus` renders as styled badge with semantic color
- [ ] R7 satisfied: no other files modified, all queries preserved
- [ ] All V1 and V2 requirements remain satisfied (no regressions)
