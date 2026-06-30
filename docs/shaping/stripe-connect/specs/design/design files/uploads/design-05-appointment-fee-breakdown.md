# Design Brief 05 — Appointment Detail: Fee Breakdown

**Type:** Updated section on existing page
**Route:** `/app/app/appointments/[id]`
**Priority:** P2 — trust and transparency
**Spec refs:** 12, 14

---

## Context

The appointment detail page shows the full record of a booking: status, payment, financial outcome, and message log. Currently, the Payment section shows amount, payment status, financial outcome, and resolved timestamp. This brief adds two new capabilities:

1. **Fee breakdown** for Connect payments (deposit, platform fee, net payout)
2. **Deposit-skipped signal** for bookings that didn't collect a deposit because Connect wasn't set up

**Existing page design:** Simple card-based layout (`rounded-lg border p-4 space-y-2`), metadata labels in default text, values inline. No fancy styling — functional admin UI.

---

## Change 1: Fee Breakdown (Connect payments)

### When shown
When the appointment has a payment AND the payment used Connect (i.e., `transfer_data.destination` was set on the PaymentIntent).

### Current Payment card

```
┌────────────────────────────────┐
│ Payment                        │
│                                │
│ Amount          £10.00         │
│ Status          Succeeded      │
│ Outcome         Settled        │
│ Resolved        2026-06-27...  │
└────────────────────────────────┘
```

### Updated Payment card

```
┌────────────────────────────────┐
│ Payment                        │
│                                │
│ Deposit         £10.00         │
│ Platform fee    −£0.50         │  ← NEW
│ Your payout     £9.50          │  ← NEW
│                                │
│ Status          Succeeded      │
│ Outcome         Settled        │
│ Resolved        2026-06-27...  │
└────────────────────────────────┘
```

### Design notes

- **"Deposit"** replaces "Amount" label — more descriptive for the shop owner context
- **"Platform fee"** line: Prefixed with minus sign. Use `text-al-on-surface-variant` (muted) — it's a deduction, not a charge. Don't use red — it's not an error
- **"Your payout"** line: Use `font-semibold` or `font-bold` — this is the number the owner cares about. Use standard text color (not green — avoid overloading color semantics)
- **Visual separator:** A thin dotted or dashed line between "Platform fee" and "Your payout" if needed for clarity, like a receipt total line
- **Alignment:** Right-align amounts for scanability (£10.00 / −£0.50 / £9.50 should column-align on the decimal)

### Edge case: fee waived (≤50p deposit)

When the deposit amount is ≤50p and the platform fee was waived:

```
Deposit         £0.50
Platform fee    waived
Your payout     £0.50
```

"Waived" in `text-al-on-surface-variant`, italic or lighter weight. Don't silently omit the line — consistency prevents confusion when the owner compares transactions.

### Non-Connect payments (pre-Connect or mock)

For payments that didn't use Connect (no `transfer_data`):

```
Amount          £10.00
Status          Succeeded
Outcome         Settled
```

No fee breakdown shown. Use "Amount" (not "Deposit") since the money went to the platform account, not the merchant's connected account. This maintains backward compatibility with pre-Connect payment records.

---

## Change 2: Deposit-Skipped Signal

### When shown
When an appointment was created without a deposit AND the reason was Connect not being set up (not because the shop's policy doesn't require deposits).

### Layout

Replace the Payment card with a minimal info block:

```
┌────────────────────────────────┐
│ Payment                        │
│                                │
│ No deposit collected            │
│ Stripe was not connected when  │  ← muted explanatory text
│ this booking was made.         │
│                                │
│ Connect Stripe →               │  ← link (if still not connected)
└────────────────────────────────┘
```

### Design notes

- **"No deposit collected"** — bold or semibold, standard text color
- **Explanation:** `text-al-on-surface-variant`, smaller font (text-sm). Factual, not blaming
- **"Connect Stripe →" link:** Only shown if `stripeOnboardingStatus !== "complete"` at the time of viewing. `text-al-primary` with underline-offset. Once connected, this link disappears (the owner doesn't need to be reminded on historical records)
- **No red/error styling** — this isn't an error, it's a factual record. Use the same neutral card styling as the rest of the page

### Distinguishing from policy-based "no deposit"

If the shop's payment policy is set to "no deposit required" (regardless of Connect status), the Payment section should show:

```
┌────────────────────────────────┐
│ Payment                        │
│                                │
│ No deposit required             │
│ (per your payment policy)      │
└────────────────────────────────┘
```

This distinction matters — the owner should be able to tell "I chose not to require deposits" from "deposits would have been collected but Stripe wasn't connected."

---

## Psychology: System 1 and System 2

> The Blinkist case study showed that hidden fees and fine-print discrepancies trigger System 2 "deceptive T&C" pattern recognition. Even when the 50p fee was disclosed in the settings page, if it's not visible at the transaction level, the owner discovers discrepancies between what customers paid and what they received — then loses trust. Showing the breakdown at the point of each transaction prevents this.

## Psychology: Feedback Loops

> The Zapier and Letterboxd case studies showed that making consequences visible drives behavior change. When the owner sees "No deposit collected — Stripe was not connected" on an actual appointment, the cost of not connecting becomes concrete and personal (reinforcing the dashboard card's count).

---

## Responsive behavior

No special responsive considerations — the appointment detail page is a single-column layout that works the same on all screen sizes.

---

## Accessibility

- Fee breakdown: Use a `<dl>` (description list) for label/value pairs
- Right-aligned amounts: Ensure `text-align: right` doesn't break screen reader flow — amounts should read after their labels
- Deposit-skipped link: Standard `<a>` with descriptive text
