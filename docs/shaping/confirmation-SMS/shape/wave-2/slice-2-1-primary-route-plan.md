# Slice 2-1 — Free-booking SMS in primary booking route

**Spec**: 03
**File**: `src/app/api/bookings/create/route.ts`

## Steps

1. Add import: `import { sendBookingConfirmationSMS } from "@/lib/messages";`
2. After `createAppointment()` returns (line ~175), before the JSON response, add:
   ```ts
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
3. Run `pnpm check`

## Acceptance criteria

- Import present
- SMS call guarded by `!paymentRequired && status === "booked"`
- try/catch wraps the call (failure doesn't break booking response)
- `pnpm check` passes
