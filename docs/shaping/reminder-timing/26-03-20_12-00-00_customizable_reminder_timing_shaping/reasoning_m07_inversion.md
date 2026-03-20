# Reasoning: Inversion (m07_inversion.md)

## Goal: Successfully implement Customizable Reminder Timing within 1-2 weeks.

## 1. Invert the Problem: "How can we GUARANTEE failure?"
- Send 10 reminders for a single appointment (Spam).
- Send 0 reminders because the cron job crashed (System failure).
- Reminders send at the wrong time (Timezone/Logic error).
- Customers receive SMS/Email late (Network/Provider delay).
- Database migration fails, locking the `shopSettings` table (Infrastructure failure).
- The 1-2 week project takes 4 weeks (Scope creep).
- Shop owner settings are ignored (Config synchronization failure).

## 2. Brainstorm Potential Failure Points
- **Spamming:** If a shop owner selects all 7 presets, a customer might receive 7 reminders. If settings change mid-day, logic might double-count.
- **Timezones:** The shop is in PST, the server is in UTC, and the customer is in EST. If the comparison logic uses inconsistent offsets, reminders send at "random" times.
- **Idempotency:** Relying on separate logging tables is good, but what if the log insert fails *after* the message is sent? (Duplicate send next run).
- **Scope Creep:** Stakeholders demand "per-event overrides" or "custom timing" mid-build, extending the schedule.
- **Cron Performance:** A query checking multiple windows for thousands of appointments might exceed the cron timeout if not optimized.
- **Data Migration:** Adding `reminderTimings: string[]` to existing shops. If we don't set a default, existing appointments might stop getting reminders.

## 3. Avoidance List (The "Not-To-Do" List)
1. **DO NOT** launch without a "Max 3" UI warning or restriction for reminder intervals.
2. **DO NOT** use anything other than the `shop.timezone` for interval calculations.
3. **DO NOT** update the `appointments` table with flags; stick to the existing logging table pattern but ensure "Sent" check happens BEFORE the provider call.
4. **DO NOT** accept any new requirements (per-event, custom inputs) once the sprint starts. This is a strategic circuit breaker.
5. **DO NOT** ship without a default migration that sets existing shops to the current 24h behavior.
6. **DO NOT** use a "fuzzy" query window (e.g., `BETWEEN now() AND 1w`) that could re-pick appointments. Ensure the logic is "Is within window AND NOT in logging table for this interval."

## 4. Evidence/Observations
- **Current State:** The system already handles 23-25h reminders via logging tables. This is a strong starting point for idempotency.
- **Risk Mitigation:** The "sent flag per timing window" mentioned in the shaping document is a direct counter-measure to the "Duplicate logic" failure.
