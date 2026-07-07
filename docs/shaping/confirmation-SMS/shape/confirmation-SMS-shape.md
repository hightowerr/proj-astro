# Shape — Free Booking Confirmation SMS

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R0 | Free bookings must receive a confirmation SMS | current-issues.md |
| R1 | `sendBookingConfirmationSMS()` must not bail out when no payment record exists | Spec 02 |
| R2 | SMS body for free bookings must not contain `"Paid"` fragment | Spec 02 |
| R3 | Paid booking SMS must be unchanged (no regression) | Spec 01, 02 |
| R4 | Both booking routes (`/api/bookings/create`, `/api/appointments`) must trigger SMS for free bookings | Specs 03, 04 |
| R5 | Dedup key `booking_confirmation:<appointmentId>` must prevent double-send across call sites | Spec 03 |
| R6 | SMS failure must not fail the booking response | Specs 03, 04 |

## Shape A — Conditional `paidLine` variable (selected)

Single shape. The template uses `{{paid_line}}` (full string when paid, empty when free). The function builds `paidLine` conditionally. Call sites fire-and-forget for `!paymentRequired`.

No alternative shapes considered — the fix is a direct correction of a path-dependence bug, not an architectural choice.

## Fit Check

| Req | Shape A |
|-----|---------|
| R0 | YES — call sites in both routes trigger SMS for `!paymentRequired` |
| R1 | YES — `!payment` bail-out deleted |
| R2 | YES — `paidLine = ""` when no payment |
| R3 | YES — `paidLine = "Paid £X.XX. "` when payment exists (identical output) |
| R4 | YES — Specs 03 + 04 add calls to both routes |
| R5 | YES — dedup key unchanged, prevents cross-site duplicates |
| R6 | YES — try/catch pattern matches existing webhook SMS |

## Spikes

None needed. All code paths are well-understood from the existing codebase exploration:
- `sendBookingConfirmationSMS()` internals mapped (lines 237-373)
- Both booking routes read (line references verified)
- Dedup mechanism confirmed (inline insert with `onConflictDoNothing`)
- Template substitution chain located

## Decisions

- **Template version bump**: 1 → 2. Required because the token name changes (`{{amount}}` → `{{paid_line}}`). Existing v1 templates in `messageTemplates` table are unaffected — `DEFAULT_TEMPLATE_BODY` is only used when no DB template exists.
- **Atomic deploy**: Specs 01 + 02 must ship as a single commit. Either alone breaks paid SMS.
- **Out of scope**: Slot recovery SMS (`slot-recovery.ts:579-592`) — uses raw `sendTwilioSms()`, not the messaging stack. Fix when "Slot recovery bypasses Connect guard" ships.
