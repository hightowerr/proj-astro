# Spike: Calendar Conflict Scanning Job (B7)

## Context

R4 requires: "System scans existing appointments and warns shop owners about calendar conflicts."

While real-time conflict detection (B3, B4) prevents NEW bookings from conflicting with calendar events, we also need to detect:
- Conflicts created when a shop owner adds a calendar event AFTER a booking was made
- Retroactive conflicts from calendar changes
- Manual bookings or system-created appointments that bypassed conflict validation

A background job should periodically scan for these conflicts and alert shop owners via dashboard.

---

## Goal

Determine the concrete steps to implement a conflict scanning job that:
- Runs on a schedule (proposed: daily)
- Fetches relevant appointments and calendar events
- Detects conflicts
- Creates dashboard alerts
- Allows shop owners to resolve conflicts

---

## Questions

| # | Question |
|---|----------|
| **B7-Q1** | Does the codebase already have a cron job pattern? Where are existing scheduled jobs defined? |
| **B7-Q2** | What is the query strategy: fetch all upcoming appointments first, then calendar events? Or fetch calendar events first? |
| **B7-Q3** | What time window should we scan? (Proposed: next 30 days - validate this is reasonable) |
| **B7-Q4** | How do we define a conflict? Same logic as B3 (any overlap, even 1 minute)? |
| **B7-Q5** | What data should the `calendar_conflict_alerts` table store? (appointmentId, calendar event details, detected time, resolved time, resolution action?) |
| **B7-Q6** | Where in the dashboard should conflict alerts appear? Should they block the shop owner or just show warnings? |
| **B7-Q7** | What actions can shop owners take on a conflict alert? (Cancel appointment? Ignore? Move appointment? Delete calendar event?) |
| **B7-Q8** | Should we alert for all conflict types or only certain severity (e.g., only full overlaps, not partial)? |
| **B7-Q9** | How do we mark a conflict as "resolved"? Manual dismiss? Automatic when appointment is cancelled? |
| **B7-Q10** | Should we de-duplicate alerts (don't re-alert for same conflict if already alerted)? |

---

## Initial Findings

### B7-Q1: Cron job pattern exists
✅ **Answer:** Yes, the codebase uses **Vercel Cron Jobs**.

**Location:** `vercel.json`

**Configuration:**
```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/recompute-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Pattern observed in existing jobs (e.g., `src/app/api/jobs/recompute-scores/route.ts`):**

1. **Authentication:**
   - Read `CRON_SECRET` from environment
   - Check incoming header `x-cron-secret` matches
   - Return 401 if unauthorized

2. **Distributed locking:**
   - Use PostgreSQL advisory locks: `pg_try_advisory_lock(lockId)`
   - Return early if lock not acquired (prevents concurrent runs)
   - Always release lock in `finally` block

3. **Batch processing:**
   - Iterate through shops
   - Process in batches (e.g., `BATCH_SIZE = 50`)
   - Track processed count and errors

4. **Response format:**
   ```json
   {
     "processed": 150,
     "errors": 2,
     "errorDetails": [...]
   }
   ```

**Implication:** We follow the same pattern for the conflict scanning job.

---

### B7-Q4: Conflict definition (proposed)

**Recommendation:** Same logic as availability filtering (B3).

**Conflict occurs when:**
- Appointment time range overlaps with calendar event time range by ANY amount (even 1 minute)
- Logic: `(appointment.startsAt < event.endsAt) && (appointment.endsAt > event.startsAt)`

**Special case:**
- All-day calendar events block the ENTIRE day (R9)
- Detection: `event.start.date` exists (Google Calendar all-day event format)

---

### B7-Q3: Time window (proposed)

**Recommendation:** Scan appointments in the next **30 days** from job execution time.

**Rationale:**
- Most shops schedule 2-4 weeks out
- 30 days provides buffer for early bookings
- Keeps query performance reasonable
- Aligns with typical calendar event horizon

**Implementation:**
```typescript
const now = new Date();
const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

// Query: appointments where startsAt BETWEEN now AND windowEnd
```

---

### B7-Q10: De-duplication (proposed)

**Recommendation:** Yes, de-duplicate alerts.

**Strategy:**
- Unique constraint on `(appointmentId, calendarEventId)` in `calendar_conflict_alerts` table
- Before creating alert, check if unresolved alert already exists for this appointment + event pair
- Only create new alert if none exists OR previous alert was resolved

**Rationale:**
- Prevents spam: job runs daily, same conflict shouldn't create multiple alerts
- Shop owner only sees each conflict once until resolved

---

### B7-Q2: Query strategy (decided)
✅ **Decision:** **Appointments first, then calendar events per shop.**

**Flow:**

1. Query all shops with calendar connections
2. For each shop:
   - Query upcoming appointments (next 30 days, status=booked)
   - If no appointments → skip to next shop
   - Fetch calendar events for date range covering all appointments
   - Compare appointments vs events to detect conflicts
   - Create alerts for new conflicts

**Query pattern:**
```typescript
// Step 1: Get shops with calendar connections
const shopsWithCalendars = await db
  .select({ shopId: calendarConnections.shopId })
  .from(calendarConnections)
  .where(eq(calendarConnections.provider, 'google'));

// Step 2: For each shop, get appointments
const now = new Date();
const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const appointments = await db
  .select({
    id: appointments.id,
    shopId: appointments.shopId,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
  })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, shopId),
      eq(appointments.status, 'booked'),
      gte(appointments.startsAt, now),
      lte(appointments.startsAt, windowEnd)
    )
  );

// Step 3: Fetch calendar events for date range
const minDate = appointments[0].startsAt;
const maxDate = appointments[appointments.length - 1].endsAt;
const calendarEvents = await fetchCalendarEventsForRange(connection, minDate, maxDate);

// Step 4: Detect conflicts
```

**Rationale:**
- More efficient: Only fetch calendar events for shops with upcoming appointments
- Bounded queries: Appointment count limits the scope
- Batch-friendly: Process shops independently (can parallelize later)
- Aligns with existing cron job pattern (iterate shops → process batch)

---

### B7-Q5: Database schema (decided)
✅ **Decision:** Create `calendar_conflict_alerts` table with full event context.

**Schema:**
```typescript
export const calendarConflictAlerts = pgTable(
  "calendar_conflict_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    calendarEventId: text("calendar_event_id").notNull(),
    calendarEventSummary: text("calendar_event_summary"),
    calendarEventStart: timestamp("calendar_event_start", { withTimezone: true }).notNull(),
    calendarEventEnd: timestamp("calendar_event_end", { withTimezone: true }).notNull(),
    isAllDayEvent: boolean("is_all_day_event").default(false).notNull(),
    status: text("status")
      .$type<"pending" | "dismissed" | "auto_resolved">()
      .default("pending")
      .notNull(),
    resolutionAction: text("resolution_action")
      .$type<"dismissed" | "appointment_cancelled" | "appointment_ended" | null>(),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("calendar_conflict_alerts_unique").on(
      table.appointmentId,
      table.calendarEventId,
      table.status
    ),
    index("calendar_conflict_alerts_shop_status_idx").on(
      table.shopId,
      table.status
    ),
    index("calendar_conflict_alerts_appointment_idx").on(table.appointmentId),
    check(
      "calendar_conflict_alerts_status_check",
      sql`${table.status} in ('pending', 'dismissed', 'auto_resolved')`
    ),
  ]
);
```

**Key design decisions:**

1. **Store calendar event details:** Summary, start, end, all-day flag
   - Rationale: Event might change/delete in Google Calendar; we need snapshot for alert UI

2. **Unique constraint:** `(appointmentId, calendarEventId, status)`
   - Rationale: Same appointment + event can have multiple alerts over time (resolved, then conflict again)
   - Only one PENDING alert per appointment+event pair

3. **Status enum:** pending | dismissed | auto_resolved
   - `pending`: Unresolved conflict requiring action
   - `dismissed`: Shop owner manually dismissed
   - `auto_resolved`: System resolved (appointment cancelled/ended)

4. **Resolution action tracking:** Records HOW conflict was resolved
   - Audit trail for shop owner behavior
   - Analytics: how often do conflicts get dismissed vs cancelled?

---

### B7-Q6: Dashboard UI location (decided)
✅ **Decision:** **Alert banner at top of Appointments page + dedicated Conflicts tab.**

**Primary location: Appointments page banner**

Location: `src/app/app/appointments/page.tsx`

```tsx
{conflictCount > 0 && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Calendar Conflicts Detected</AlertTitle>
    <AlertDescription>
      {conflictCount} appointment{conflictCount > 1 ? 's' : ''} conflict with your Google Calendar.
      <Link href="/app/conflicts" className="ml-2 underline">
        View conflicts →
      </Link>
    </AlertDescription>
  </Alert>
)}
```

**Secondary location: Dedicated Conflicts page**

New route: `/app/conflicts`

Shows:
- Table of all pending conflicts
- Columns: Appointment time, Customer name, Conflicting event, Actions
- Sort by appointment date (nearest first)
- Filter: Show resolved conflicts (last 30 days)

**Rationale:**
- Banner: Immediate visibility when shop owner checks appointments (main workflow)
- Dedicated page: Detailed view for resolving multiple conflicts
- Non-blocking: Warnings, not errors (shop can still use dashboard)

---

### B7-Q7: Shop owner actions (decided)
✅ **Decision:** **Two actions: Dismiss or Cancel appointment.**

**Action 1: Dismiss (Ignore conflict)**

Button: "Dismiss" or "Keep Appointment"

Behavior:
- Marks alert as `status='dismissed'`, `resolutionAction='dismissed'`
- Sets `resolvedAt = now`
- Keeps appointment booked
- Hides alert from pending list

Use case: Shop owner knows about conflict and will handle it manually (e.g., reschedule calendar event)

**Action 2: Cancel Appointment**

Button: "Cancel Appointment"

Behavior:
- Triggers cancel flow (same as customer cancel)
- Determines refund eligibility based on cancellation policy
- Processes refund if eligible
- Marks alert as `status='auto_resolved'`, `resolutionAction='appointment_cancelled'`
- Deletes calendar event (booking was the conflict source)

Use case: Calendar event takes priority, appointment needs to be cancelled

**Future actions (out of scope for V1):**
- Reschedule appointment to different time
- Delete/edit calendar event from dashboard
- Contact customer (send message about conflict)

**UI pattern:**
```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => dismissAlert(alertId)}>
    Keep Appointment
  </Button>
  <Button variant="destructive" onClick={() => cancelAppointment(appointmentId, alertId)}>
    Cancel Appointment
  </Button>
</div>
```

---

### B7-Q8: Alert severity filtering (decided)
✅ **Decision:** **Alert for ALL overlaps, display severity in UI.**

**Alert creation rule:**
- Create alert for ANY time overlap (even 1 minute)
- Include all-day events that block appointments
- No filtering by severity at creation time

**Display severity in UI:**

Calculate overlap percentage:
```typescript
function calculateOverlapSeverity(
  apptStart: Date,
  apptEnd: Date,
  eventStart: Date,
  eventEnd: Date
): 'full' | 'high' | 'partial' {
  const apptDuration = apptEnd.getTime() - apptStart.getTime();
  const overlapStart = Math.max(apptStart.getTime(), eventStart.getTime());
  const overlapEnd = Math.min(apptEnd.getTime(), eventEnd.getTime());
  const overlapDuration = overlapEnd - overlapStart;

  const overlapPercent = (overlapDuration / apptDuration) * 100;

  if (overlapPercent >= 100) return 'full';     // Entire appointment overlaps
  if (overlapPercent >= 50) return 'high';      // 50%+ overlap
  return 'partial';                             // < 50% overlap
}
```

**UI indicators:**
- Full overlap: Red badge "Full Conflict"
- High overlap (50%+): Orange badge "High Conflict"
- Partial overlap: Yellow badge "Partial Conflict"
- All-day event: Purple badge "All-Day Block"

**Rationale:**
- Simple alert creation logic (no filtering)
- Shop owner can see ALL conflicts and decide priority
- Visual severity helps triage multiple conflicts
- Analytics: track which severity types get dismissed vs cancelled

---

### B7-Q9: Alert resolution (decided)
✅ **Decision:** **Three resolution paths: Manual dismiss, Auto-resolve on cancel, Auto-cleanup after appointment ends.**

**Resolution Path 1: Manual Dismiss**

Trigger: Shop owner clicks "Dismiss" / "Keep Appointment" button

Action:
```typescript
await db
  .update(calendarConflictAlerts)
  .set({
    status: 'dismissed',
    resolutionAction: 'dismissed',
    resolvedAt: new Date(),
  })
  .where(eq(calendarConflictAlerts.id, alertId));
```

**Resolution Path 2: Auto-resolve on appointment cancellation**

Trigger: Appointment is cancelled (any source: customer, admin, system)

Action in cancel flow:
```typescript
// In /api/manage/[token]/cancel after successful cancellation
await db
  .update(calendarConflictAlerts)
  .set({
    status: 'auto_resolved',
    resolutionAction: 'appointment_cancelled',
    resolvedAt: new Date(),
  })
  .where(
    and(
      eq(calendarConflictAlerts.appointmentId, appointmentId),
      eq(calendarConflictAlerts.status, 'pending')
    )
  );
```

**Resolution Path 3: Auto-cleanup after appointment ends**

Trigger: Cron job detects appointment has ended (in the past)

Action in scan-conflicts job:
```typescript
// Auto-resolve alerts for past appointments
await db
  .update(calendarConflictAlerts)
  .set({
    status: 'auto_resolved',
    resolutionAction: 'appointment_ended',
    resolvedAt: new Date(),
  })
  .where(
    and(
      eq(calendarConflictAlerts.status, 'pending'),
      sql`${appointments.endsAt} < now()`
    )
  );
```

**Cleanup: Delete old resolved alerts**

After 30 days, delete resolved alerts (keep pending):
```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

await db
  .delete(calendarConflictAlerts)
  .where(
    and(
      inArray(calendarConflictAlerts.status, ['dismissed', 'auto_resolved']),
      lte(calendarConflictAlerts.resolvedAt, thirtyDaysAgo)
    )
  );
```

**Rationale:**
- Manual dismiss: Shop owner control
- Auto-resolve on cancel: Conflict is gone when appointment cancelled
- Auto-cleanup: Past appointments are no longer relevant conflicts
- 30-day retention: Audit trail without bloating database

---

## Acceptance

Spike is complete when we can describe:
- ✅ The cron job scheduling mechanism (Vercel cron, manual trigger, or other)
- ✅ The query strategy for fetching appointments and calendar events
- ✅ The conflict detection algorithm and edge cases
- ✅ The database schema for `calendar_conflict_alerts` table
- ✅ The dashboard UI location and alert presentation
- ✅ The shop owner actions available for resolving conflicts
- ✅ The alert lifecycle (creation → resolution → cleanup)

**Status:** ✅ **SPIKE COMPLETE**

---

## Summary: Complete Conflict Scanning Strategy

**1. Cron Job Schedule:** Daily at 4:00 AM UTC (`0 4 * * *`)

**2. Query Flow:**
   - Fetch shops with Google Calendar connections
   - For each shop: query upcoming booked appointments (30 days)
   - Fetch calendar events for appointment date range
   - Detect conflicts (any overlap)
   - Create/update alerts

**3. Database Table:** `calendar_conflict_alerts`
   - Stores: appointment + event snapshot + status + resolution
   - Unique constraint: `(appointmentId, calendarEventId, status)`
   - Indexes: shop+status, appointment

**4. Dashboard UI:**
   - Primary: Alert banner on `/app/appointments` page
   - Secondary: Dedicated `/app/conflicts` page with table view
   - Shows severity badges (full, high, partial, all-day)

**5. Shop Owner Actions:**
   - Dismiss (keep appointment, ignore conflict)
   - Cancel Appointment (refund if eligible)

**6. Alert Lifecycle:**
   - Created: When conflict detected by cron job
   - Resolved: Manual dismiss OR auto (appointment cancelled/ended)
   - Deleted: 30 days after resolution

**7. Implementation Location:**
   - Cron job: `src/app/api/jobs/scan-calendar-conflicts/route.ts`
   - UI: `src/app/app/conflicts/page.tsx`
   - Schema: Add to `src/lib/schema.ts`
