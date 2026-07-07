# Confirmation SMS — Architecture Doc Updates

Record these changes in `docs/context/` when the feature loop closes. **Do not update until implementation is verified.**

## `docs/context/architecture-context.md`

### Invariants section — add:

> **SMS confirmation is call-site-triggered, not payment-coupled.** Booking confirmation SMS is sent from the booking route (for free bookings) and the payment webhook (for paid bookings). `sendBookingConfirmationSMS()` handles both paths — the `messageDedup` table with key `booking_confirmation:<appointmentId>` prevents double-send across call sites. When adding a new entry point into `createAppointment()`, include the same SMS call pattern for the `!paymentRequired` branch.

### Message template versioning — add:

> `DEFAULT_TEMPLATE_VERSION` tracks breaking template changes. Version 1 → 2: `Paid {{amount}}` replaced by `{{paid_line}}` (conditional: full string for paid, empty for free). Template version is stored in `messageLog.templateVersion` for audit.

## `docs/context/progress-tracker.md`

- Move "Free bookings get no confirmation SMS" from open issues to completed
- Note: slot recovery SMS remains a separate issue (raw `sendTwilioSms()` call, not using the messaging stack)

## `docs/context/current-issues.md`

- Move the "Free bookings get no confirmation SMS" entry from Open to Resolved with date, summary, and verification report reference
- Update the "Slot recovery bypasses Connect guard" cross-dependency note to reflect that confirmation SMS infrastructure is now in place (F3 dependency satisfied)
