# Problem Diagnosis: Customizable Reminder Timing Shaping (Updated)

## Problem Summary
The "Customizable Reminder Timing" feature addresses a critical limitation in the current automated notification system: a one-size-fits-all timing for reminders (hardcoded to a 23-25 hour window before appointments) that does not align with the diverse operational needs of different business types (therapists needing 48h prep, stylists 2h pings, and recruiters/call-based businesses needing Calendly-like flexibility). Shop owners need control over the *when* of reminders at a shop-level using preset intervals (15m, 1h, 2h, 4h, 24h, 48h, 1w) and support for multiple reminders per appointment.

## Core Challenge
The main challenge is to provide this flexibility within a strict 1-2 week appetite ("Small batch") while avoiding:
1. **Scope Creep:** Resisting the urge to add per-event/customer overrides, custom intervals, or AI-driven timing mid-build. This appetite is a strategic decision specifically to limit scope creep.
2. **Technical Pitfalls:** Preventing duplicate reminders if settings change and ensuring correct timezone handling. The system currently uses separate logging tables for "sent" state tracking, rather than flags on the `appointments` table.
3. **User Spam:** Mitigating the risk of shop owners over-scheduling reminders, which could lead to customer annoyance.

## Objectives
- Implement shop-level reminder timing configuration.
- Update the cron job to support multiple intervals.
- Maintain idempotent message delivery using the existing logging table approach.
- Ensure the solution is table-stakes (phase 1) without unnecessary complexity.

## Constraints
- **Appetite:** 1-2 weeks (Strategic limit).
- **Current State:** Hardcoded 23-25h window for both email and SMS.
- **In-Scope:** Preset intervals, shop-level defaults, multiple reminders, simple UI.
- **Out-of-Scope:** Per-event/customer overrides, dynamic/AI timing, time-of-day restrictions, custom intervals.
