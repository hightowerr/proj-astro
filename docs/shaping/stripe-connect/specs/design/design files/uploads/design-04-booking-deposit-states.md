# Design Brief 04 — Booking Page: Deposit States

**Type:** Updated page (subtle customer-facing change)
**Route:** `/book/[slug]`
**Priority:** P1 — affects what customers see
**Spec refs:** 14

---

## Context

The public booking page is where customers select a service, pick a time, and pay. Currently, `paymentsEnabled` is hardcoded to `true` — the Stripe Elements card form always shows. After Connect, this prop becomes dynamic: `true` only when the shop has completed Connect onboarding.

**This brief covers what the CUSTOMER sees.** The shop owner's view of the consequences is covered in Brief 02 (dashboard card) and Brief 05 (appointment detail).

**Existing page design:** Narrow column layout (`max-w-[624px]`), dark-themed Stripe Elements for card input, background `bg-al-surface`.

---

## Two states

### State A: Deposits enabled (Connect complete)

**No design change.** This is the current experience:
- Service selection → date/time picker → customer details → Stripe card form → "Book & Pay" button
- Stripe Elements renders with the existing dark theme
- Deposit amount shown clearly before payment

### State B: Deposits disabled (Connect not complete)

**What changes:** The Stripe card form is not rendered. The booking flow skips the payment step entirely.

```
Service selection → date/time picker → customer details → "Book" button
```

**Design notes:**
- **No card form, no deposit amount display** — the payment section is simply absent
- **CTA button:** Label changes from "Book & Pay £X" to "Book" (or "Confirm booking")
- **No explanation shown to the customer** — the customer should NOT see "Stripe not connected" or "deposits coming soon" or any indication of a backend configuration issue. From the customer's perspective, this shop simply doesn't require a deposit.

### Why no customer-facing messaging

The customer doesn't know (or care) about Stripe Connect. Showing "deposits are temporarily unavailable" would:
1. Confuse customers who have never booked here before
2. Undermine trust in the business ("are they having payment problems?")
3. Create an expectation that they should have been charged

The shop owner handles the deposit-less state through their own awareness (dashboard card, appointment detail signals).

---

## Design change scope

| Element | Deposits enabled | Deposits disabled |
|---------|-----------------|-------------------|
| Service selection | No change | No change |
| Date/time picker | No change | No change |
| Customer details form | No change | No change |
| Deposit amount display | Shows "Deposit: £X.XX" | Hidden |
| Stripe Elements card form | Rendered | Not rendered |
| CTA button label | "Book & Pay £{amount}" | "Book" / "Confirm booking" |
| CTA button style | Same primary style | Same primary style |
| Confirmation message | "Your booking is confirmed. £X.XX deposit paid." | "Your booking is confirmed." |

### Confirmation screen / message

After successful booking:
- **With deposit:** "Your booking is confirmed. £{amount} deposit paid." + receipt details
- **Without deposit:** "Your booking is confirmed." — no mention of deposits or payments

---

## No new design work needed

This brief is primarily informational for the designer — the visual change is minimal (card form presence/absence, button label). The booking page layout, typography, colors, and flow are unchanged. The key design decision is **what NOT to show** rather than what to add.

If the designer wants to review the two states, they should test:
1. A shop with `stripeOnboardingStatus === "complete"` → full payment flow
2. A shop with `stripeOnboardingStatus === "not_started"` → free booking flow

Both should feel intentional and complete — neither should feel broken or missing something.
