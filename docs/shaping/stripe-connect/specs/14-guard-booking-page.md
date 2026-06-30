# 14 — Guard: Booking Page

## Summary
Make `paymentsEnabled` dynamic on the booking page — only enable deposits when the shop has completed Stripe Connect onboarding. Adapts customer-facing CTA, confirmation screen, and reassurance copy.

## Design references
- Brief: `design/design-04-booking-deposit-states.md`
- Mock: `design/design files/Booking Deposit States.dc.html`

## Prerequisites
- Depends on: 01 (schema), 02 (migration)

## Changes

**File:** `src/app/book/[slug]/page.tsx` (lines 79, 111, 158)

### Before (current)
```tsx
paymentsEnabled={true}  // hardcoded in three places
```

### After
```tsx
// In the server component, after fetching the shop:
const canAcceptPayments = shop.stripeOnboardingStatus === "complete";

// Then in the three BookingForm/ServiceSelector renders:
paymentsEnabled={canAcceptPayments}
```

### What happens when `paymentsEnabled=false`
The existing flow already handles this gracefully:
- `booking-form.tsx:759`: submits to `/api/appointments` (free booking) instead of `/api/bookings/create` (paid booking)
- No Stripe Elements rendered — no card form shown
- Appointment created with `paymentRequired: false`, `paymentStatus: "unpaid"`, status `"booked"`
- Customer can still book, just without a deposit

### Shop query change
The `getShopBySlug()` query needs to return `stripeOnboardingStatus`. Check if it already selects all columns or if it needs an explicit column addition.

**File:** `src/lib/queries/shops.ts` — add `stripeOnboardingStatus` to the selected columns if the query uses explicit column selection.

### Customer-facing UX changes

**Design references:** `design/design-04-booking-deposit-states.md`, `design/design files/Booking Deposit States.dc.html`

The customer should NEVER see any indication of Stripe Connect status. No "Stripe not connected", no "deposits coming soon", no backend configuration messages. From the customer's perspective, this shop simply doesn't require a deposit.

| Element | Deposits enabled | Deposits disabled |
|---------|-----------------|-------------------|
| Deposit section (eyebrow + summary card + card form) | Rendered with deposit amount, Stripe Elements, security line | **Not rendered** — section absent |
| CTA button label | "Book & Pay {amount}" | "Confirm booking" |
| CTA button style | Same primary gradient-cta | Same primary gradient-cta |
| Reassurance text | "You won't be charged the full service price today — only the deposit above." | "No payment required — your slot is reserved as soon as you confirm." |
| Confirmation heading | "Your booking is confirmed." | "Your booking is confirmed." |
| Confirmation subtitle | "{amount} deposit paid. The balance is settled in studio after your appointment." | "We've reserved your slot. See you on the day." |
| Confirmation receipt card | Shows Deposit paid + Card rows | Omits Deposit/Card rows |

### Feedback signal for unprotected bookings
When a booking is created without a deposit because `stripeOnboardingStatus !== "complete"`, the appointment record should carry a signal that the deposit was skipped due to Connect status (not because the shop policy is "no deposit"). This enables:
- Spec 15's Tier 2 warning to count unprotected bookings accurately
- The appointment detail page to show the correct payment card state (spec 12 "skipped" vs "policy")

Implementation: add a `depositSkippedReason` field or flag to the appointment creation context. This can be as simple as a metadata field on the appointment: `{ depositSkipped: "connect_not_complete" }` vs `{ depositSkipped: "policy_none" }` vs `null` (deposit was collected).

## Acceptance
- Shops with `stripeOnboardingStatus === "complete"` show the full deposit flow (card form, "Book & Pay")
- Shops without Connect show free booking flow ("Confirm booking", no card input, no deposit section)
- Customer sees no mention of Stripe, Connect, or payment configuration in either path
- Confirmation screen adapts copy and receipt card based on whether deposit was collected
- Appointments created without deposit due to Connect status carry a `depositSkipped: "connect_not_complete"` signal
- Appointment detail page distinguishes "no deposit (Stripe not connected)" from "no deposit (policy)" via spec 12's 5-state payment card
- No errors or broken UI for either path
