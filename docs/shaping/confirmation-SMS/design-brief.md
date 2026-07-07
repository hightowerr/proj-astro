# Confirmation SMS — Design Brief

## Overview

Free bookings currently receive no confirmation SMS. This fix makes `sendBookingConfirmationSMS()` work for bookings without a payment record.

## What changes for the customer

### SMS message — paid booking (no change)

```
Booked with [Shop Name]: 15 Jul at 10:00 (GMT). Paid £10.00. Policy: see booking link. [manage link] Reply STOP to opt out.
```

### SMS message — free booking (new)

```
Booked with [Shop Name]: 15 Jul at 10:00 (GMT). Policy: see booking link. [manage link] Reply STOP to opt out.
```

The only difference: the `"Paid £X.XX. "` fragment is omitted. The rest of the message is identical.

## Pages impacted

**None.** This is entirely backend (SMS delivery logic + booking API routes). No UI components, screens, or styles change.

## Mock-ups needed

**Minimal.** If the designer wants to visualise the customer experience:

1. **SMS preview mock-up (optional)**: Show both message variants side-by-side in a phone SMS bubble. Useful for copy review but not blocking — the template is a single string in code.

## Three categories of free bookings that now receive SMS

| Category | Why no payment | Frequency |
|----------|---------------|-----------|
| Connect not set up | Merchant hasn't completed Stripe onboarding | Every booking during setup window |
| Tier-waived deposit | Top-tier customer gets deposit waived | Per merchant tier config |
| Policy: no deposit | Shop policy set to `"none"` | All bookings for that shop |

## Copy considerations

- The free-booking SMS says `"Policy: see booking link"` — this references the cancellation policy. Still relevant for free bookings (merchant may still have a no-show policy).
- No special "free booking" language needed. The absence of `"Paid"` is sufficient — customers don't need to be told "this was free."
- `"Reply STOP to opt out"` remains for compliance.
