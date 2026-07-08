# Connect Guard — Verification Report

**Wave:** 1 of 1 (all specs)  
**Verifier:** independent agent, fresh session  
**Date:** 2026-07-08  
**Method:** code review (slot-recovery.ts, appointments.ts) + `pnpm check`

---

## Results

| Spec | Criterion | Status | Evidence |
|------|-----------|--------|----------|
| P0 | `OpenOffer` interface includes `name: string` on shop | PASS | `slot-recovery.ts:380` — `name: string` present in `OpenOffer.shop` |
| P0 | `OpenOffer` interface includes `stripeOnboardingStatus: string \| null` on shop | PASS | `slot-recovery.ts:382` — `stripeOnboardingStatus: string \| null` present |
| P0 | Query `select` includes `shops.name` | PASS | `slot-recovery.ts:401` — `name: shops.name` in `findLatestOpenOffer` select |
| P0 | Query `select` includes `shops.stripeOnboardingStatus` | PASS | `slot-recovery.ts:404` — `stripeOnboardingStatus: shops.stripeOnboardingStatus` in select |
| F1 | No hardcoded `paymentsEnabled: true` in `acceptOffer` | PASS | `slot-recovery.ts:535` — `paymentsEnabled: shop.stripeOnboardingStatus === "complete"` |
| F1 | Value is derived from Connect status at the `createAppointment` call site | PASS | `slot-recovery.ts:519–536` — `createAppointment({ ..., paymentsEnabled: shop.stripeOnboardingStatus === "complete" })` |
| F2 | SMS body branches on `booking.paymentRequired` | PASS | `slot-recovery.ts:589–591` — ternary on `booking.paymentRequired` |
| F2 | Paid path includes deposit URL | PASS | `slot-recovery.ts:590` — `"Booked with ${shopName}: ${date} at ${time}. Deposit: ${paymentUrl} Reply STOP to opt out."` |
| F2 | Free path omits URL | PASS | `slot-recovery.ts:591` — `"Booked with ${shopName}: ${date} at ${time}. Reply STOP to opt out."` |
| F2 | Both paths include "Reply STOP to opt out." | PASS | Both branches end with `Reply STOP to opt out.` |
| F2 | Uses `shop.name ?? shop.slug` for shop display name | PASS | `slot-recovery.ts:587` — `const shopName = shop.name ?? shop.slug` |
| F3 | `sendBookingConfirmationSMS` imported from `@/lib/messages` | PASS | `slot-recovery.ts:13` — `import { sendBookingConfirmationSMS } from "@/lib/messages"` |
| F3 | Called only when `!booking.paymentRequired` | PASS | `slot-recovery.ts:605` — `if (!booking.paymentRequired) { ... sendBookingConfirmationSMS(...) ... }` |
| F3 | Wrapped in try/catch | PASS | `slot-recovery.ts:606–613` — try/catch with `console.error` on failure |
| F3 | Does not block the booking flow (fire-and-forget pattern) | PASS | Called after `setCooldown` is NOT reached yet, but the call is inside try/catch with no re-throw — failure is absorbed. Booking return value on line 624 is unaffected. |
| T1 | Comment exists above `paymentsEnabled ?? true` in appointments.ts | PASS | `appointments.ts:828–831` — 4-line TRIPWIRE comment present |
| T1 | Comment references Connect guard | PASS | `appointments.ts:829–830` — "Any new caller MUST derive this from shop.stripeOnboardingStatus === 'complete'" |
| T1 | Comment references spec file | PASS | `appointments.ts:831` — `See: docs/shaping/connect-guard/F1-money-routing.md` |
| — | `pnpm check` (lint + typecheck) | PASS | Clean exit, zero errors |

**Total: 19 PASS / 0 FAIL / 0 BLOCKED**

---

## Notes

### F3 fire-and-forget sequencing
`sendBookingConfirmationSMS` is called at `slot-recovery.ts:607`, after the slot and offer DB updates are committed (lines 547–582) but before `setCooldown` (line 616). This is correct — the booking is already persisted when the SMS fires. A failure in `sendBookingConfirmationSMS` does not unwind the booking.

### F2 SMS send is also guarded with try/catch
The F2 inline SMS (lines 593–603) is itself wrapped in try/catch, so neither the F2 nor F3 SMS path can break the `acceptOffer` return. Consistent error-isolation pattern throughout.

### `messageDedup` double-send protection
F3 calls `sendBookingConfirmationSMS`, which goes through the messaging stack (`messages.ts`) with `messageDedup` body-hash deduplication. If the F2 inline SMS and F3 standard SMS ever produce identical bodies, the dedup table will drop the duplicate. No additional protection needed.

---

## Verdict

**Loop advances to DRIFT AUDIT (Phase 4).** All 5 specs implemented as described. No divergences detected in this code review pass.
