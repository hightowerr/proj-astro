# F3 — Standard SMS confirmation for free slot-recovery bookings

## Classification
**Type:** Cross-dependency — integrates with "Free bookings get no confirmation SMS" fix
**Risk:** Low — additive call with dedup safety net
**File:** `src/lib/slot-recovery.ts`

## Problem
When "Free bookings get no confirmation SMS" ships (separate issue), slot-recovery's free bookings should also use the standard `sendBookingConfirmationSMS()` function for consistency. F2's inline SMS is a stopgap; F3 replaces/supplements it with the canonical confirmation path.

## Change
In `acceptOffer()`, after the F2 SMS branch, add for the `!booking.paymentRequired` case:

```typescript
if (!booking.paymentRequired) {
  try {
    await sendBookingConfirmationSMS(booking.appointment.id);
  } catch (error) {
    console.error(
      `Failed to send standard confirmation SMS for slot-recovery appointment ${booking.appointment.id}:`,
      error
    );
  }
}
```

**Safety:** `messageDedup` (existing infra) prevents double-send with the F2 inline SMS. Fire-and-forget with try/catch — failure does not block the booking.

## Dependencies
- **Requires:** F1 + F2 shipped first
- **Requires:** "Free bookings get no confirmation SMS" fix shipped (separate issue — provides `sendBookingConfirmationSMS`)
- **Blocks:** nothing

## Verification
- `pnpm check` passes
- Unit test: mock `sendBookingConfirmationSMS` — assert called when `paymentRequired: false`
- Unit test: assert NOT called when `paymentRequired: true`
- Integration: verify `messageDedup` prevents duplicate SMS when both F2 inline and F3 standard fire

## Design impact
None — uses the standard confirmation SMS template defined by the separate "Free bookings" fix.
