# Verification Report — Confirmation SMS (All Waves)

**Date:** 2026-07-07  
**Verifier:** fresh session, read-only  
**Files inspected:** `src/lib/messages.ts`, `src/app/api/bookings/create/route.ts`, `src/app/api/appointments/route.ts`  
**`pnpm check` result:** PASS (no lint or type errors)

---

## Results

| Spec | Criterion | Status | Evidence |
|------|-----------|--------|----------|
| 01 | `DEFAULT_TEMPLATE_VERSION` is `2` | PASS | `messages.ts:15` — `const DEFAULT_TEMPLATE_VERSION = 2;` |
| 01 | `DEFAULT_TEMPLATE_BODY` contains `{{paid_line}}` | PASS | `messages.ts:17` — `"...{{timezone}}). {{paid_line}}Policy:..."` |
| 01 | `DEFAULT_TEMPLATE_BODY` does NOT contain `{{amount}}` | PASS | `messages.ts:16-17` — no `{{amount}}` in the string |
| 01 | All other tokens present: `{{shop_name}}`, `{{date}}`, `{{time}}`, `{{timezone}}`, `{{manage_link}}` | PASS | `messages.ts:16-17` — all five tokens present |
| 01 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 02 | `sendBookingConfirmationSMS()` does NOT return early when `payment` is null | PASS | `messages.ts:290` — `payment` only used in ternary `const paidLine = payment ? ... : ""`. No `if (!payment) return` anywhere in the function body. |
| 02 | Paid bookings produce `"Paid £X.XX. "` in SMS body | PASS | `messages.ts:290-292` — `const paidLine = payment ? \`Paid ${formatCurrency(payment.amountCents, payment.currency)}. \` : ""`; `formatCurrency` uses `Intl.NumberFormat("en-US", { style: "currency", currency: ... })` which renders GBP as `£X.XX` |
| 02 | Free bookings produce SMS body with no `"Paid"` fragment | PASS | `messages.ts:290-292` — `paidLine = ""` when `payment` is null; `renderTemplate` called with `collapseWhitespace: true` at `messages.ts:293-302` — double spaces collapse, no "Paid" residue |
| 02 | SMS opt-in check (`!prefs?.smsOptIn`) runs for both paid and free paths | PASS | `messages.ts:321` — `if (!prefs?.smsOptIn)` runs after `paidLine` is computed, unconditionally for every call |
| 02 | Dedup key `booking_confirmation:<appointmentId>` prevents double-send | PASS | `messages.ts:14` — `BOOKING_TEMPLATE_KEY = "booking_confirmation"`; `messages.ts:264` — `const dedupKey = \`${BOOKING_TEMPLATE_KEY}:${appointment.id}\`` → `"booking_confirmation:<id>"` |
| 02 | Message log entry created for both paid and free paths | PASS | `messages.ts:328-334` (consent_missing — logs `failed`), `messages.ts:343-347` (success — logs `sent`), `messages.ts:354-361` (Twilio error — logs `failed`). All paths log before/after SMS attempt. |
| 02 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 03 | `sendBookingConfirmationSMS` imported from `@/lib/messages` | PASS | `bookings/create/route.ts:9` — `import { sendBookingConfirmationSMS } from "@/lib/messages";` |
| 03 | SMS call guarded by `!result.paymentRequired && result.appointment.status === "booked"` | PASS | `bookings/create/route.ts:177` — exact guard condition present |
| 03 | try/catch wraps the call — failure doesn't break booking response | PASS | `bookings/create/route.ts:178-185` — inner try/catch catches SMS failure and logs it; outer function continues to return 200 JSON |
| 03 | `pnpm check` passes | PASS | Zero lint/typecheck errors |
| 04 | `sendBookingConfirmationSMS` imported from `@/lib/messages` | PASS | `appointments/route.ts:4` — `import { sendBookingConfirmationSMS } from "@/lib/messages";` |
| 04 | SMS call guarded by `!result.paymentRequired && result.appointment.status === "booked"` | PASS | `appointments/route.ts:91` — exact guard condition present |
| 04 | try/catch wraps the call — failure doesn't break booking response | PASS | `appointments/route.ts:92-99` — try/catch logs error and continues; outer handler returns 200 JSON |
| 04 | `pnpm check` passes | PASS | Zero lint/typecheck errors |

---

## Summary

**20 / 20 criteria PASS. 0 FAIL. 0 BLOCKED.**

No fix issues created.

---

## Notes

- The open issue **"Free bookings get no confirmation SMS"** in `docs/context/current-issues.md` is now fully resolved by this wave. All three fix components (C1 function logic, C2 template, C3 call sites × 2 routes) are implemented and verified. The issue can be moved to the Resolved section.
- `renderTemplate` is called with `{ collapseWhitespace: true, missingValue: "" }` at `messages.ts:293-302`. When `paidLine = ""`, the token `{{paid_line}}` is replaced with `""` and the resulting double space before `"Policy"` is collapsed to a single space — correct free-booking grammar confirmed.
- Both call sites (Spec 03 and 04) place the SMS call after `createAppointment()` returns and before the JSON response, outside the outer error handler — consistent with the fire-and-forget pattern used in `webhook/route.ts`.
