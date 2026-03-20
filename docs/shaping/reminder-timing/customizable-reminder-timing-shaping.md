# Customizable Reminder Timing — Shaping Document

**Date:** 2026-03-20
**Appetite:** 1-2 weeks (small batch)
**Status:** Shaping in progress

---

## Frame

### Source

From competitive analysis (`docs/shaping/gap-analysis/competitive-table-stakes-p0-p1.md`):

> **2. Customizable Reminder Timing**
>
> **What it is:**
> - Shop owners configure when reminders send (e.g., 24h, 48h, 1 week before)
> - Different timing for different appointment types
> - Allows for business-specific preferences
>
> **Current state:** ❌ Missing
> **Competitor coverage:**
> - Calendly: ✅ (per event type)
> - Timely: ✅ (per service)
> - Cal.com: ✅ (workflow configuration)
>
> **Priority justification:**
> Automated reminders without timing control are useless. This is core to reminder effectiveness.

### Problem

- **One-size-fits-all timing:** Current system sends reminders at hardcoded 23-25h before appointment
- **Different business workflows:** Therapists need 48h for case prep, hairstylists need 2h for "you're coming today" reminder, recruiters need 10min for phone calls
- **No flexibility:** Shop owners cannot adjust timing to match their industry norms or customer expectations
- **Manual workarounds:** Shop owners must manually message customers at different times, defeating automation purpose

### Outcome

- Shop owners can configure when reminders send based on their business workflow
- System supports multiple reminders per appointment (e.g., 1 week + 24h pattern)
- Reminder timing aligns with industry norms for each business type
- Changes apply to new bookings only (existing appointments keep original timing)
- No customer spam (max 3 reminders enforced)

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| **R0** | Shop owners can configure when reminders send before appointments | Core goal |
| **R1** | Shop owners can select up to 3 reminder timings (max enforcement) | Must-have |
| **R2** | Support preset timing intervals: 10min, 15min, 1h, 2h, 4h, 24h, 48h, 1 week | Must-have |
| **R3** | Reminder timing applies to both SMS and email channels uniformly | Must-have |
| **R4** | Appointments booked within a reminder window skip that reminder (don't send retroactively) | Must-have |
| **R5** | Reminder timing captured at booking time (immutable per appointment) | Must-have |
| **R6** | Each reminder window sends only once per appointment (deduplication per window) | Must-have |
| **R7** | All time calculations use shop timezone, not customer or server timezone | Must-have |
| **R8** | Changing shop timing settings affects only new bookings, not existing ones | Must-have |
| **R9** | UI enforces max 3 selections with clear warning when approaching limit | Must-have |
| **R10** | Backward compatible with existing 24h reminder dedup keys and message logs | Must-have |
| **R11** | Delivery within 1-2 week appetite (disciplined scope) | Constraint |
| **R12** | System warns/prevents spam (too many reminders) | Must-have |
| **R13** | Default timing for new shops is 24h (backward compatible) | Must-have |

---

## Current System (CURRENT)

### Implementation Details

**Hardcoded Timing:**
- Email reminders: 23-25h window before appointment
- SMS reminders: 23-25h window before appointment (HIGH-risk customers only)
- Cron schedule: Email job runs at 02:00 UTC daily

**Deduplication Strategy:**
- Email: `messageDedup` table with atomic PK constraint
  - Key format: `appointment_reminder_24h:email:{appointmentId}`
- SMS: Query `messageLog` table for existing records (read-then-write, less safe)
  - Purpose field: `appointment_reminder_24h`

**Query Pattern:**
```typescript
const windowStart = new Date(now + 23 * 60 * 60 * 1000);
const windowEnd = new Date(now + 25 * 60 * 60 * 1000);
// Query appointments WHERE startsAt BETWEEN windowStart AND windowEnd
```

**Cron Jobs:**
- `/api/jobs/send-email-reminders` - All customers with emailOptIn
- `/api/jobs/send-reminders` - Only HIGH-risk customers with smsOptIn
- Both use PostgreSQL advisory locks to prevent concurrent execution

### What Works

| Aspect | Current State |
|--------|---------------|
| Automated sending | ✅ Both email and SMS work |
| Deduplication | ✅ Prevents duplicate sends |
| Opt-in/opt-out | ✅ Respects customer preferences |
| Timezone handling | ✅ Uses shop timezone |
| Message logging | ✅ Comprehensive audit trail |

### What's Missing

| Aspect | Gap |
|--------|-----|
| Configurable timing | ❌ Hardcoded 23-25h window |
| Multiple reminders | ❌ Only one reminder per appointment |
| Late booking handling | ❌ Doesn't skip if booked within window |
| Per-interval dedup | ❌ Dedup key assumes single "24h" timing |

---

## Shapes (Solution Options)

### A: In-Place Extension (Minimal Change)

**Core idea:** Extend existing system with minimal structural changes

| Part | Mechanism |
|------|-----------|
| **A1** | Add `reminderTimings` array to `bookingSettings` table (default `["24h"]`) |
| **A2** | Add `reminderTimingsSnapshot` array to `appointments` table (captured at booking) |
| **A3** | Update dedup key format: `appointment_reminder_{interval}:email:{id}` |
| **A4** | Modify query to loop over intervals, scan window per interval (interval ± 1h) |
| **A5** | Add `shouldSkipReminder()` check if booked within window |
| **A6** | Simple checkbox UI in settings with max-3 enforcement |

**Pros:**
- Minimal code changes (extend, don't replace)
- Backward compatible (24h keys identical)
- Reuses existing dedup tables
- Fits 1-2 week appetite

**Cons:**
- Cron job loops over intervals (potential performance impact)
- Multiple queries per job run

---

### B: Dedicated Reminder Schedule Table

**Core idea:** New table to store reminder schedules separately

| Part | Mechanism |
|------|-----------|
| **B1** | Create `appointmentReminders` table: appointmentId, interval, sentAt, status |
| **B2** | Populate at booking time based on shop settings |
| **B3** | Cron queries `appointmentReminders` WHERE sendAt BETWEEN now AND now+5min |
| **B4** | Mark as sent after delivery |
| **B5** | UI same as Shape A (checkbox settings) |

**Pros:**
- Single query per cron run (performance)
- Explicit reminder schedule per appointment
- Easy to audit ("what reminders will this appointment get?")

**Cons:**
- New table + schema complexity
- Requires data migration for existing appointments
- More code to write (create/update/delete reminders)
- Violates 1-2 week appetite

---

### C: Event-Driven Reminder Queue

**Core idea:** Use job queue system for scheduled reminders

| Part | Mechanism |
|------|-----------|
| **C1** | Enqueue reminder jobs at booking time (e.g., Vercel Cron, Inngest, etc.) |
| **C2** | Each job scheduled for `appointmentStartsAt - interval` |
| **C3** | Job handler sends reminder, marks as sent |
| **C4** | Dedup via job idempotency keys |

**Pros:**
- Precise timing (not 5-min cron window)
- Scales better (distributed job processing)
- No scanning queries

**Cons:**
- Requires job queue infrastructure (not in codebase)
- Complexity explosion (queue setup, monitoring, retries)
- Violates appetite (multiple weeks to implement)
- Overkill for current scale

---

## Fit Check

| Req | Requirement | Status | A | B | C |
|-----|-------------|--------|---|---|---|
| R0 | Shop owners can configure when reminders send before appointments | Core goal | ✅ | ✅ | ✅ |
| R1 | Shop owners can select up to 3 reminder timings (max enforcement) | Must-have | ✅ | ✅ | ✅ |
| R2 | Support preset timing intervals: 10min, 15min, 1h, 2h, 4h, 24h, 48h, 1 week | Must-have | ✅ | ✅ | ✅ |
| R3 | Reminder timing applies to both SMS and email channels uniformly | Must-have | ✅ | ✅ | ✅ |
| R4 | Appointments booked within a reminder window skip that reminder | Must-have | ✅ | ✅ | ✅ |
| R5 | Reminder timing captured at booking time (immutable per appointment) | Must-have | ✅ | ✅ | ✅ |
| R6 | Each reminder window sends only once per appointment (dedup per window) | Must-have | ✅ | ✅ | ✅ |
| R7 | All time calculations use shop timezone | Must-have | ✅ | ✅ | ✅ |
| R8 | Changing shop timing settings affects only new bookings | Must-have | ✅ | ✅ | ✅ |
| R9 | UI enforces max 3 selections with clear warning | Must-have | ✅ | ✅ | ✅ |
| R10 | Backward compatible with existing 24h dedup keys | Must-have | ✅ | ❌ | ⚠️ |
| R11 | Delivery within 1-2 week appetite | Constraint | ✅ | ❌ | ❌ |
| R12 | System warns/prevents spam (too many reminders) | Must-have | ✅ | ✅ | ✅ |
| R13 | Default timing for new shops is 24h | Must-have | ✅ | ✅ | ✅ |

**Notes:**
- **Shape B fails R10:** New table breaks existing dedup mechanism
- **Shape B fails R11:** New table + migration logic exceeds 1-2 week appetite
- **Shape C fails R11:** Job queue infrastructure is multi-week effort
- **Shape C partial R10:** Depends on implementation (could preserve keys or break them)

---

## Selected Shape: A (In-Place Extension)

**Rationale:**
- Only shape that passes all must-haves
- Minimal code changes = fits appetite
- Backward compatible (critical for production safety)
- Reuses existing, proven dedup mechanism
- Performance acceptable (8 intervals × ~100ms query = <1 second total)

**Decision:** Proceed with Shape A for detailed breadboarding

---

## Detail A: In-Place Extension

### Database Schema Changes

**bookingSettings table:**
```typescript
export const bookingSettings = pgTable(
  "booking_settings",
  {
    shopId: uuid("shop_id").primaryKey().references(() => shops.id),
    slotMinutes: integer("slot_minutes").notNull(),
    timezone: text("timezone").notNull(),
    // NEW:
    reminderTimings: text("reminder_timings")
      .array()
      .notNull()
      .default(sql`ARRAY['24h']::text[]`),
  },
  (table) => [
    check("slot_minutes_valid", sql`${table.slotMinutes} in (15, 30, 45, 60, 90, 120)`),
    // NEW CONSTRAINTS:
    check("reminder_timings_max", sql`array_length(${table.reminderTimings}, 1) <= 3`),
    check("reminder_timings_min", sql`array_length(${table.reminderTimings}, 1) >= 1`),
    check(
      "reminder_timings_valid",
      sql`${table.reminderTimings} <@ ARRAY['10min','15min','1h','2h','4h','24h','48h','1w']::text[]`
    ),
  ]
);
```

**appointments table:**
```typescript
export const appointments = pgTable("appointments", {
  // ... existing fields ...
  // NEW:
  reminderTimingsSnapshot: text("reminder_timings_snapshot")
    .array()
    .notNull()
    .default(sql`ARRAY['24h']::text[]`),
});
```

### Core Logic Changes

**Snapshot Capture (at booking time):**
```typescript
// src/lib/queries/appointments.ts - createAppointment()
const settings = await ensureBookingSettings(tx, input.shopId);
const reminderTimingsSnapshot = settings?.reminderTimings ?? ["24h"];

const appointmentValues = {
  // ... existing fields ...
  reminderTimingsSnapshot,
};
```

**Multi-Window Query:**
```typescript
// src/lib/queries/appointments.ts - findAppointmentsForEmailReminder()
export const findAppointmentsForEmailReminder = async () => {
  const now = Date.now();
  const results = [];
  const intervals = ["10min", "15min", "1h", "2h", "4h", "24h", "48h", "1w"];

  for (const interval of intervals) {
    const intervalMinutes = parseReminderInterval(interval);
    const windowStart = new Date(now + (intervalMinutes - 60) * 60 * 1000);
    const windowEnd = new Date(now + (intervalMinutes + 60) * 60 * 1000);

    const rows = await db
      .select({...})
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "booked"),
          gte(appointments.startsAt, windowStart),
          lte(appointments.startsAt, windowEnd),
          sql`${interval} = ANY(${appointments.reminderTimingsSnapshot})`
        )
      );

    for (const row of rows) {
      if (shouldSkipReminder(row.startsAt, row.createdAt, interval)) continue;
      results.push({ ...row, reminderInterval: interval });
    }
  }

  return results;
};
```

**Skip Logic:**
```typescript
// src/lib/booking.ts
export const shouldSkipReminder = (
  appointmentStartsAt: Date,
  appointmentCreatedAt: Date,
  reminderInterval: string
): boolean => {
  const intervalMinutes = parseReminderInterval(reminderInterval);
  if (!intervalMinutes) return false;

  const leadTimeMs = appointmentStartsAt.getTime() - appointmentCreatedAt.getTime();
  const leadTimeMinutes = leadTimeMs / (1000 * 60);

  return leadTimeMinutes < intervalMinutes;
};
```

**Updated Dedup Key:**
```typescript
// src/lib/messages.ts - sendAppointmentReminderEmail()
const dedupKey = `appointment_reminder_${reminderInterval}:email:${appointmentId}`;
// Example for 24h: "appointment_reminder_24h:email:abc123" (identical to old format)
// Example for 2h: "appointment_reminder_2h:email:abc123"
```

### UI Components

**Settings Page (`/app/settings/reminders`):**
- Server component with requireAuth()
- Loads current `bookingSettings.reminderTimings`
- Server action to update (with zod validation)
- Renders `ReminderTimingsForm`

**Form Component:**
```typescript
// src/components/settings/reminder-timings-form.tsx
const PRESETS = [
  { value: "10min", label: "10 minutes before", persona: "Recruiters" },
  { value: "15min", label: "15 minutes before", persona: "General" },
  { value: "1h", label: "1 hour before", persona: "General" },
  { value: "2h", label: "2 hours before", persona: "Hairstylists" },
  { value: "4h", label: "4 hours before", persona: "General" },
  { value: "24h", label: "24 hours before", persona: "Most common" },
  { value: "48h", label: "48 hours before", persona: "Therapists" },
  { value: "1w", label: "1 week before", persona: "Therapists" },
];

// Client component with:
// - useState for selected array
// - Max-3 enforcement (disable checkboxes when 3 selected)
// - Warning banner when 3/3 selected
// - Checkbox list with persona hints
```

---

## Risks and Rabbit Holes

### Risk 1: Performance (Multiple Queries)

**Concern:** Looping over 8 intervals means 8 queries per cron run

**Mitigation:**
- Each query is fast (<100ms) with proper indexing
- Total time: 8 × 100ms = 800ms (acceptable for cron)
- Alternative: UNION ALL query (more complex, marginal gain)

**Decision:** Accept loop pattern for simplicity

### Risk 2: Timezone Confusion

**Concern:** "24 hours before" in what timezone?

**Mitigation:**
- Always use `bookingSettings.timezone`
- Existing pattern already established in codebase
- All appointment times stored as UTC, converted to shop timezone for display

**Decision:** Follow existing timezone pattern

### Risk 3: Race Conditions (SMS Dedup)

**Concern:** SMS uses read-then-write dedup (not atomic like email)

**Mitigation:**
- PostgreSQL advisory locks on cron jobs prevent concurrent execution
- Single job instance = no race condition
- Future improvement: Adopt email's atomic dedup pattern for SMS

**Decision:** Acceptable for 1-2 week appetite, add to future enhancements

### Risk 4: Migration Breaking Existing Reminders

**Concern:** Schema changes could disrupt current 24h reminders

**Mitigation:**
- Default `["24h"]` for all existing shops and appointments
- Dedup key format identical for 24h interval
- Backward compatible query (filter by snapshot array)
- Test on staging before production

**Decision:** Zero-disruption migration plan

---

## Edge Cases

| Scenario | Behavior | Handled By |
|----------|----------|------------|
| Customer books 30min before appointment | Skip reminders > 30min (1h, 24h, etc.) | `shouldSkipReminder()` |
| Shop changes reminder settings | Existing appointments keep old snapshot | Immutable snapshot |
| Cron job restarts mid-run | No duplicate sends | Existing dedup table |
| Shop selects 0 timings | Form validation prevents submission | Schema + UI validation |
| Shop tries 4+ timings | UI prevents, schema rejects | Max-3 at UI + schema |
| Invalid interval in database | Parser returns null, skips | Schema constraint + fallback |
| Appointment exactly at threshold (1h booked 1h before) | Don't skip (>= threshold is OK) | `shouldSkipReminder()` |

---

## No-Gos (Out of Scope)

**❌ NOT doing in this shape:**
- Per-event-type timing overrides (requires Multiple Event Types feature first)
- Per-customer timing preferences (requires customer segmentation)
- Time-of-day restrictions (e.g., "only send 9am-5pm")
- Custom interval input (e.g., "3.5 days before")
- A/B testing optimal timing (analytics feature)
- AI-suggested timing (overthinking)
- Different timing for SMS vs email
- Analytics/reporting on reminder effectiveness

---

## Success Criteria

**Functional:**
- Shop owners can select 1-3 reminder timings from presets
- UI enforces max 3 (disables 4th checkbox)
- Schema enforces max 3 (check constraint)
- Appointments capture timing snapshot at booking time
- Changing shop settings affects only new bookings
- Reminders send at all configured intervals
- Late bookings skip impossible reminders
- Deduplication works per interval
- 24h reminder keys match old format
- All calculations use shop timezone

**Non-functional:**
- Migration completes in <5 seconds
- Query performance <200ms per interval window
- Cron job completes in <10 seconds for 1000 appointments
- Settings UI loads in <1 second
- Zero disruption to existing 24h reminders

---

## Next Steps

1. **Breadboard the selected shape** - Map UI/Non-UI affordances and wiring
2. **Create spike for migration** - Investigate backward compatibility approach
3. **Slice into vertical increments** - Break down for iterative delivery
4. **Create Big Picture document** - One-page summary for driver/developer
