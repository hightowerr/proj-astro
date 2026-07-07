# Spec 04 — Call site: free-booking SMS in legacy booking route

## Summary

Add a `sendBookingConfirmationSMS()` call for free bookings in the legacy booking route (`/api/appointments/route.ts`), matching the pattern from Spec 03.

## File

`src/app/api/appointments/route.ts`

## Changes

After `createAppointment()` returns (line ~88), before the JSON response:

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

## Acceptance criteria

- Free bookings created via `/api/appointments` receive confirmation SMS
- Paid bookings are NOT affected
- SMS failure does not fail the booking response
- Import added, `pnpm check` passes
