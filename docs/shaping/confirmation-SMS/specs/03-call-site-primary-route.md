# Spec 03 — Call site: free-booking SMS in primary booking route

## Summary

Add a `sendBookingConfirmationSMS()` call for free bookings in the primary booking creation route. When `!result.paymentRequired && result.appointment.status === "booked"`, fire-and-forget the SMS with try/catch — matching the webhook SMS pattern.

## File

`src/app/api/bookings/create/route.ts`

## Changes

After `createAppointment()` returns (line ~175), before the JSON response:

```ts
// Send confirmation SMS for free bookings (paid bookings get SMS via payment webhook)
if (!result.paymentRequired && result.appointment.status === "booked") {
  try {
    await sendBookingConfirmationSMS(result.appointment.id);
  } catch (error) {
    console.error("Failed to send booking confirmation SMS", {
      appointmentId: result.appointment.id,
      error,
    });
  }
}
```

Add import at top:

```ts
import { sendBookingConfirmationSMS } from "@/lib/messages";
```

## Dependencies

- **Spec 02** — function must handle no-payment records before this route calls it for free bookings.

## No double-send risk

- Free bookings: no Stripe webhook fires → only this call site sends SMS
- Paid bookings: `paymentRequired === true` → this code path skipped → webhook sends SMS
- Belt-and-suspenders: `messageDedup` table with key `booking_confirmation:<appointmentId>` prevents duplicates even if both paths fire

## Acceptance criteria

- Free bookings created via `/api/bookings/create` receive confirmation SMS
- Paid bookings are NOT affected (guard condition skips them)
- SMS failure does not fail the booking response (try/catch)
- Import added, `pnpm check` passes
