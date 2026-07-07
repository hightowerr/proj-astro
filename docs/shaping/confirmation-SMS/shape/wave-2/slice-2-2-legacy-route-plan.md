# Slice 2-2 — Free-booking SMS in legacy booking route

**Spec**: 04
**File**: `src/app/api/appointments/route.ts`

## Steps

1. Add import: `import { sendBookingConfirmationSMS } from "@/lib/messages";`
2. After `createAppointment()` returns (line ~88), before the JSON response, add:
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
- try/catch wraps the call
- `pnpm check` passes
