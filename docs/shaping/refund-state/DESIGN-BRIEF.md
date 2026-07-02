# Refund State — Design Brief

## Status: Designed

Design file: `Appointment Fee Breakdown.html` (interactive prototype with tab switcher)

## Page
`/app/appointments/[id]` — Appointment detail page

## Component
`PaymentCard` → `FeeBreakdown` (internal child)  
File: `src/components/appointments/payment-card.tsx`

## What to design
Three variants of the fee breakdown area inside PaymentCard. No new pages, no layout changes — just the line items and helper text within the existing card.

---

### Variant 1: Connect + Refunded (primary case)

**Current state:**
```
Deposit          £10.00
Platform fee     −£0.50
Your payout      £9.50
↗ Payout routed to your connected bank account.
```

**Refunded state:**
```
Deposit          £10.00
Platform fee     Returned
Your payout      £0.00
↩ Payout reversed to customer.
```

- Deposit line unchanged (customer was charged)
- Platform fee: amount replaced with "Returned" label (italic, same style as "Waived")
- Payout: zeroed to £0.00 (same bold weight as normal payout)
- Helper text: undo/reverse arrow icon + "Payout reversed to customer." (replaces the north_east arrow + bank account text)
- "Stripe Connect" badge stays in header
- Payment status / Outcome / Resolved metadata rows unchanged

---

### Variant 2: Waived + Refunded

**Current state:**
```
Deposit          £10.00
Platform fee     Waived
Your payout      £10.00
↗ Payout routed to your connected bank account.
```

**Refunded state:**
```
Deposit          £10.00
Platform fee     Returned
Your payout      £0.00
↩ Payout reversed to customer.
```

- Fee label switches from "Waived" → "Returned" (same italic style)
- Same helper text and icon swap as Variant 1
- Identical rendering to Connect + Refunded (the refund modifier flattens the visual difference)

---

### Variant 3: Legacy + Refunded

**Current state:**
No fee breakdown shown (legacy payments lack structured fee data)

**Refunded state:**
```
PAYMENT
Outcome          Refunded
```

- Entire card collapses to just the "Payment" header + single "Outcome: Refunded" row
- No deposit/fee/payout lines, no helper text, no payment status/resolved metadata
- No "Stripe Connect" badge (legacy has no connect context)
- Card is significantly shorter than other variants

---

## Design details from prototype

| Element | Style | Notes |
|---------|-------|-------|
| "Returned" label | Italic, same weight as "Waived" | Right-aligned in the fee value column |
| "£0.00" payout | Bold, same as normal payout amount | Not greyed out — same visual weight |
| Helper text icon | Material `undo` / reverse arrow | Replaces the `north_east` icon used for normal payouts |
| Helper text | Muted/secondary, same as existing helper | "Payout reversed to customer." |
| Card header | Unchanged | "Stripe Connect" badge persists for connect/waived |
| Metadata rows | Unchanged for connect/waived | Payment status, Outcome, Resolved stay visible |
| Legacy card | Minimal | Only header + outcome row, all other sections removed |
