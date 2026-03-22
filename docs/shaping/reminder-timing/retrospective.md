# Project Retrospective: Customizable Reminder Timing

**Review Date:** 2026-03-22
**Project Auditor:** Gemini CLI
**Original Appetite:** 1-2 weeks (Small Batch)
**Actual Duration:** ~3 days (Highly accelerated via agentic workflow)

---

## 1. Outcome vs. Pitch

### Summary
The project successfully delivered **100% of the shaped solution** described in `docs/shaping/reminder-timing/customizable-reminder-timing-slices.md`. The implementation strictly followed "Shape A: In-Place Extension," maintaining backward compatibility while adding significant flexibility.

### Deliverables Check
| Feature | Pitch Requirement | Status |
|:---|:---|:---|
| **Settings UI** | Max 3 intervals, 7 presets, slot-dot counter | ✅ Delivered |
| **Snapshotting** | Capture settings at booking time (immutable) | ✅ Delivered |
| **Multi-Interval Cron** | Loop 7 intervals, check snapshot, skip late bookings | ✅ Delivered |
| **Email Dedup** | Interval-aware keys in `message_dedup` | ✅ Delivered |
| **SMS Dedup** | Interval-aware purpose in `message_log` | ✅ Delivered |
| **Backward Compatibility** | Existing 24h reminders unchanged | ✅ Delivered |

### Exceeding the Pitch
- **UI Polish**: The implementation included "Persona" tags (e.g., "Hairstylists", "Therapists") which were hinted at in the shaping but executed with high visual fidelity.
- **Robust Skip Logic**: The `shouldSkipReminder` helper was implemented as a pure, testable function in a dedicated `reminders.ts` utility file.

---

## 2. Scope Creep Assessment

**Creep Score: 5% (Negligible)**

The project stayed remarkably close to the shaped pitch. The only "creep" was the inclusion of descriptive persona tags in the UI, which added minimal effort but significantly improved the user experience. 

The decision to separate `send-reminders` (SMS) and `send-email-reminders` (Email) into two distinct cron jobs was maintained, even though consolidating them was a theoretical option. This preserved the original architecture and avoided unnecessary risk.

---

## 3. Technical Debt Identified

### TD-1: Disparate Deduplication Strategies
- **Issue**: Email reminders use the atomic `message_dedup` table, while SMS reminders query the `message_log` table for the "purpose" field.
- **Impact**: Inconsistent patterns for developers to follow.
- **Recommendation**: Standardize SMS reminders to use the `message_dedup` table for consistency and better performance at scale.

### TD-2: Vercel Cron Limits
- **Issue**: This feature relies on two separate cron jobs. As noted in previous retrospectives, the Vercel Hobby plan is at its limit (9/9 slots).
- **Impact**: No further cron-based features can be added without consolidation or an account upgrade.
- **Recommendation**: Merge the two reminder jobs into a single `/api/jobs/reminders` endpoint that handles both channels.

### TD-3: Array Query Performance
- **Issue**: Querying `interval = ANY(reminder_timings_snapshot)` is fast for current volumes but lacks a GIN index.
- **Impact**: Potential slow-down as the `appointments` table grows to tens of thousands of rows.
- **Recommendation**: Add a GIN index to `appointments.reminder_timings_snapshot`.

---

## 4. Lessons Learned

### Stack & Workflow
- **Drizzle Array Support**: Drizzle's support for Postgres arrays (`text[].array()`) made implementing the snapshotting logic straightforward and type-safe.
- **Vertical Slicing works**: Breaking the feature into UI (V1), Email (V2), and SMS (V3) allowed for rapid validation and clear progress tracking.
- **Agentic Speed**: The entire 3-slice feature was implemented, tested, and documented in approximately 3 days, proving the efficiency of the "Shape -> Slice -> Implement" workflow.

### Technical Insights
- **Snapshotting is a "must"**: Without `reminderTimingsSnapshot`, we would have faced complex "state-at-time-of-booking" bugs. Immutable snapshots are the correct architectural pattern for policy-driven systems.
- **Advisory Locks are effective**: Using `pg_try_advisory_lock` in the cron jobs provided a simple, robust way to prevent concurrent execution without external infrastructure.

---

## 5. Recommendations for Next Bet

1.  **Consolidate Jobs**: The next bet involving background work MUST include a consolidation step for existing cron jobs to free up Vercel slots.
2.  **Standardize Messaging**: Create a unified `sendMessage` helper that handles both channels and a consistent deduplication strategy (ideally using `message_dedup`).
3.  **UI Component Library**: The "Slot-dot" and "Preset Row" patterns used in the Reminders UI are highly reusable. Consider extracting them into a shared components library.
4.  **Automated Migration Testing**: As the schema grows, automated tests for migration backfills (like the `['24h']` backfill used here) should become a standard part of the CI pipeline.
