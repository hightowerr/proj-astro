# V6: Scan Calendar Conflicts (Cron Job) - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 2 days
**Dependencies:** V1 (OAuth)
**Demo:** Background job detects appointment/calendar conflicts and creates alerts

---

## Overview

V6 introduces automated conflict detection between booked appointments and external Google Calendar events. This addresses scenarios where shop owners manually add events to their calendar that overlap with existing appointments, creating double-booking situations.

### Goal

Implement a scheduled cron job that:
1. **Scans** all active appointments for calendar conflicts
2. **Detects** overlaps with Google Calendar events
3. **Creates** conflict alerts in database
4. **Calculates** overlap severity (full, high, partial, all-day)
5. **De-duplicates** to avoid repeat alerts
6. **Auto-resolves** alerts for past appointments
7. **Cleans up** old alerts (30+ days)

This slice enables proactive conflict detection, setting the foundation for V7's conflicts dashboard.

---

## Current State Analysis

### Existing Infrastructure

**Calendar Integration (V1-V5):**
- OAuth connection in `calendar_connections` table
- Event creation/deletion in `src/lib/google-calendar.ts`
- Cache layer in `src/lib/google-calendar-cache.ts`
- Calendar event ID storage in `appointments.calendarEventId`

**Cron Jobs:**
- Existing jobs: `resolve-outcomes`, `recompute-scores`, `offer-loop`, `expire-offers`
- Pattern: `/api/jobs/{job-name}/route.ts` with CRON_SECRET auth
- Vercel cron configuration in `vercel.json`
- PostgreSQL advisory locks for concurrency control

**Existing Conflict Logic (V3/V4):**
- `filterSlotsForConflicts()` filters availability by calendar events
- `validateBookingConflict()` prevents booking conflicting slots
- Overlap detection logic exists but inline (not reusable)

### What's Missing (to be built)

1. **Conflict alerts table** - Store detected conflicts
2. **Reusable conflict detection logic** - Extract from V3/V4
3. **Severity calculation** - Classify overlap severity
4. **Conflict scanning service** - Batch check all appointments
5. **Cron job route** - Scheduled job endpoint
6. **Cleanup job** - Remove old alerts
7. **Auto-resolve logic** - Mark alerts for past appointments

---

## Requirements

### Functional Requirements

**FR1: Detect Conflicts**
- Scan all future appointments with status='booked'
- Load calendar events for appointment date range
- Detect overlaps between appointment time and calendar events
- Consider timezone when comparing times
- Skip appointments without calendar connection

**FR2: Calculate Severity**
- **Full Conflict:** Appointment completely overlaps event (100%)
- **High Conflict:** Appointment overlaps event ≥50%
- **Partial Conflict:** Appointment overlaps event <50%
- **All-Day Event:** Calendar event is all-day (blocks entire day)
- Severity helps shop owner prioritize which conflicts to address

**FR3: Create Alerts**
- Store alerts in `calendar_conflict_alerts` table
- Capture event snapshot (summary, start, end) for audit trail
- De-duplicate: skip if alert already exists for same appointment + event
- Include severity and detected timestamp
- Link to appointment via appointmentId

**FR4: Auto-Resolve Past Appointments**
- Auto-resolve alerts for appointments that already ended
- Status: 'auto_resolved_past'
- Reason: "Appointment already completed"
- Prevents cluttering dashboard with stale conflicts

**FR5: Cleanup Old Alerts**
- Delete alerts older than 30 days
- Run in same cron job
- Keeps database size manageable
- Preserves recent history for audit

**FR6: Concurrency Control**
- Use PostgreSQL advisory lock
- Prevent concurrent job runs (Vercel can invoke multiple times)
- Lock key: `SCAN_CALENDAR_CONFLICTS_LOCK = 987654321`
- Skip job if lock already held

### Non-Functional Requirements

**NFR1: Performance**
- Process all shops in single job run
- Batch query appointments per shop
- Cache calendar events (reuse V3 cache)
- Target: <30 seconds for 100 shops
- Timeout: 55 seconds (Vercel limit)

**NFR2: Reliability**
- Graceful degradation if calendar API fails
- Log errors but continue processing other shops
- Advisory lock prevents duplicate runs
- Idempotent: safe to run multiple times

**NFR3: Observability**
- Log start/end times
- Log conflicts detected per shop
- Log errors with shop context
- Log cleanup count

**NFR4: Security**
- Require CRON_SECRET header
- Return 401 if secret missing/invalid
- Don't expose sensitive data in logs

---

## Database Schema

### Table: `calendar_conflict_alerts`

**File:** `drizzle/0016_calendar_conflict_alerts.sql` (new migration)

```sql
CREATE TABLE calendar_conflict_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- Event snapshot (captured at detection time)
  calendar_event_id TEXT NOT NULL,
  event_summary TEXT,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,

  -- Conflict details
  severity TEXT NOT NULL CHECK (severity IN ('full', 'high', 'partial', 'all_day')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved', 'auto_resolved_past', 'auto_resolved_cancelled')),

  -- Metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- 'user', 'system_cancelled', 'system_past'

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate alerts for same conflict
  UNIQUE(appointment_id, calendar_event_id)
);

-- Index for dashboard queries
CREATE INDEX idx_conflict_alerts_shop_status ON calendar_conflict_alerts(shop_id, status) WHERE status = 'pending';

-- Index for cleanup job
CREATE INDEX idx_conflict_alerts_created_at ON calendar_conflict_alerts(created_at);
```

**Schema Updates:**

```typescript
// src/lib/schema.ts

export const calendarConflictAlerts = pgTable("calendar_conflict_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),

  // Event snapshot
  calendarEventId: text("calendar_event_id").notNull(),
  eventSummary: text("event_summary"),
  eventStart: timestamp("event_start", { withTimezone: true }).notNull(),
  eventEnd: timestamp("event_end", { withTimezone: true }).notNull(),

  // Conflict details
  severity: text("severity").notNull().$type<"full" | "high" | "partial" | "all_day">(),
  status: text("status").notNull().default("pending").$type<"pending" | "dismissed" | "resolved" | "auto_resolved_past" | "auto_resolved_cancelled">(),

  // Metadata
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").$type<"user" | "system_cancelled" | "system_past">(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate alerts
  uniqueAppointmentEvent: unique().on(table.appointmentId, table.calendarEventId),
  // Fast lookups
  shopStatusIdx: index("idx_conflict_alerts_shop_status").on(table.shopId, table.status).where(sql`${table.status} = 'pending'`),
  createdAtIdx: index("idx_conflict_alerts_created_at").on(table.createdAt),
}));

export type CalendarConflictAlert = typeof calendarConflictAlerts.$inferSelect;
export type NewCalendarConflictAlert = typeof calendarConflictAlerts.$inferInsert;
```

---

## Implementation Steps

### Step 1: Conflict Detection Service

**File:** `src/lib/calendar-conflicts.ts` (new file)

**Purpose:** Core conflict detection and severity calculation logic

```typescript
import { db } from "@/lib/db";
import { appointments, calendarConflictAlerts, shops, bookingSettings } from "@/lib/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { fetchCalendarEventsWithCache } from "@/lib/google-calendar-cache";
import { formatDateInTimeZone } from "@/lib/booking";
import { areIntervalsOverlapping, differenceInMinutes, parseISO } from "date-fns";

export type ConflictSeverity = "full" | "high" | "partial" | "all_day";

export interface ConflictDetectionResult {
  appointmentId: string;
  calendarEventId: string;
  eventSummary: string | null;
  eventStart: Date;
  eventEnd: Date;
  severity: ConflictSeverity;
}

/**
 * Calculate overlap severity between appointment and calendar event
 */
export function calculateOverlapSeverity(
  appointmentStart: Date,
  appointmentEnd: Date,
  eventStart: Date,
  eventEnd: Date,
  isAllDay: boolean
): ConflictSeverity {
  // All-day events take precedence
  if (isAllDay) {
    return "all_day";
  }

  const appointmentDuration = differenceInMinutes(appointmentEnd, appointmentStart);

  // Calculate overlap window
  const overlapStart = appointmentStart > eventStart ? appointmentStart : eventStart;
  const overlapEnd = appointmentEnd < eventEnd ? appointmentEnd : eventEnd;
  const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);

  // Calculate overlap percentage
  const overlapPercent = (overlapMinutes / appointmentDuration) * 100;

  if (overlapPercent >= 100) {
    return "full";
  } else if (overlapPercent >= 50) {
    return "high";
  } else {
    return "partial";
  }
}

/**
 * Scan appointments for a single shop and detect calendar conflicts
 */
export async function scanAndDetectConflicts(shopId: string): Promise<{
  conflictsDetected: number;
  alertsCreated: number;
  alertsAutoResolved: number;
}> {
  const now = new Date();

  // Load shop timezone
  const shopSettings = await db.query.bookingSettings.findFirst({
    where: eq(bookingSettings.shopId, shopId),
  });

  if (!shopSettings) {
    console.log(`[conflict-scan] No booking settings for shop ${shopId}, skipping`);
    return { conflictsDetected: 0, alertsCreated: 0, alertsAutoResolved: 0 };
  }

  const timezone = shopSettings.timezone ?? "UTC";

  // Load all future booked appointments
  const futureAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.shopId, shopId),
      eq(appointments.status, "booked"),
      gte(appointments.startsAt, now)
    ),
  });

  if (futureAppointments.length === 0) {
    console.log(`[conflict-scan] No future appointments for shop ${shopId}`);
    return { conflictsDetected: 0, alertsCreated: 0, alertsAutoResolved: 0 };
  }

  let conflictsDetected = 0;
  let alertsCreated = 0;
  let alertsAutoResolved = 0;

  // Group appointments by date to optimize calendar API calls
  const appointmentsByDate = new Map<string, typeof futureAppointments>();

  for (const appointment of futureAppointments) {
    const dateStr = formatDateInTimeZone(appointment.startsAt, timezone);

    if (!appointmentsByDate.has(dateStr)) {
      appointmentsByDate.set(dateStr, []);
    }

    appointmentsByDate.get(dateStr)!.push(appointment);
  }

  // Process each date
  for (const [dateStr, dateAppointments] of appointmentsByDate) {
    try {
      // Fetch calendar events for date (uses cache)
      const calendarEvents = await fetchCalendarEventsWithCache(shopId, dateStr);

      if (!calendarEvents || calendarEvents.length === 0) {
        continue; // No events this day
      }

      // Check each appointment against calendar events
      for (const appointment of dateAppointments) {
        for (const event of calendarEvents) {
          // Skip events created by our system (they have our event ID)
          if (appointment.calendarEventId && event.id === appointment.calendarEventId) {
            continue;
          }

          const eventStart = parseISO(event.start.dateTime || event.start.date);
          const eventEnd = parseISO(event.end.dateTime || event.end.date);
          const isAllDay = !event.start.dateTime; // All-day if no time component

          // Check for overlap
          const hasOverlap = areIntervalsOverlapping(
            { start: appointment.startsAt, end: appointment.endsAt },
            { start: eventStart, end: eventEnd },
            { inclusive: false } // Touching boundaries don't count
          );

          if (!hasOverlap) {
            continue; // No conflict
          }

          conflictsDetected++;

          // Calculate severity
          const severity = calculateOverlapSeverity(
            appointment.startsAt,
            appointment.endsAt,
            eventStart,
            eventEnd,
            isAllDay
          );

          // Check if alert already exists
          const existingAlert = await db.query.calendarConflictAlerts.findFirst({
            where: and(
              eq(calendarConflictAlerts.appointmentId, appointment.id),
              eq(calendarConflictAlerts.calendarEventId, event.id)
            ),
          });

          if (existingAlert) {
            // Alert already exists, skip
            continue;
          }

          // Create new alert
          await db.insert(calendarConflictAlerts).values({
            shopId: shopId,
            appointmentId: appointment.id,
            calendarEventId: event.id,
            eventSummary: event.summary || null,
            eventStart: eventStart,
            eventEnd: eventEnd,
            severity: severity,
            status: "pending",
            detectedAt: now,
          });

          alertsCreated++;

          console.log(
            `[conflict-scan] Created ${severity} conflict alert for appointment ${appointment.id} ` +
            `(event: ${event.summary || event.id})`
          );
        }
      }
    } catch (error) {
      console.error(
        `[conflict-scan] Error processing date ${dateStr} for shop ${shopId}:`,
        error
      );
      // Continue processing other dates
    }
  }

  // Auto-resolve alerts for past appointments
  const pastAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.shopId, shopId),
      lte(appointments.endsAt, now)
    ),
    columns: {
      id: true,
    },
  });

  if (pastAppointments.length > 0) {
    const pastIds = pastAppointments.map(a => a.id);

    const autoResolveResult = await db
      .update(calendarConflictAlerts)
      .set({
        status: "auto_resolved_past",
        resolvedAt: now,
        resolvedBy: "system_past",
        updatedAt: now,
      })
      .where(
        and(
          eq(calendarConflictAlerts.shopId, shopId),
          eq(calendarConflictAlerts.status, "pending"),
          sql`${calendarConflictAlerts.appointmentId} = ANY(${pastIds})`
        )
      )
      .returning({ id: calendarConflictAlerts.id });

    alertsAutoResolved = autoResolveResult.length;
  }

  return { conflictsDetected, alertsCreated, alertsAutoResolved };
}

/**
 * Clean up old conflict alerts (30+ days)
 */
export async function cleanupOldAlerts(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const deleteResult = await db
    .delete(calendarConflictAlerts)
    .where(lte(calendarConflictAlerts.createdAt, cutoffDate))
    .returning({ id: calendarConflictAlerts.id });

  return deleteResult.length;
}
```

**Key Design Decisions:**
- **Date grouping:** Minimizes calendar API calls by batching appointments
- **Cache reuse:** Uses existing `fetchCalendarEventsWithCache()` from V3
- **De-duplication:** Checks for existing alerts before creating new ones
- **Event snapshot:** Captures event details at detection time (audit trail)
- **Skip own events:** Ignores events created by our system
- **Auto-resolve past:** Prevents cluttering dashboard with stale conflicts

---

### Step 2: Cron Job Route

**File:** `src/app/api/jobs/scan-calendar-conflicts/route.ts` (new file)

**Purpose:** HTTP endpoint for scheduled conflict scanning

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shops, calendarConnections } from "@/lib/schema";
import { eq, isNotNull } from "drizzle-orm";
import { scanAndDetectConflicts, cleanupOldAlerts } from "@/lib/calendar-conflicts";
import { env } from "@/lib/env";

const LOCK_ID = 987654321; // PostgreSQL advisory lock ID

/**
 * Cron job: Scan calendar conflicts
 *
 * Schedule: Daily at 4:00 AM UTC (vercel.json)
 *
 * Scans all shops with calendar connections for conflicts between
 * appointments and external calendar events.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("x-cron-secret");

  if (authHeader !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[scan-conflicts] Job started");

  try {
    // Acquire advisory lock
    const lockResult = await db.execute(
      sql`SELECT pg_try_advisory_lock(${LOCK_ID}) as acquired`
    );

    const lockAcquired = lockResult.rows[0]?.acquired;

    if (!lockAcquired) {
      console.log("[scan-conflicts] Job already running (lock held), skipping");
      return NextResponse.json({
        skipped: true,
        reason: "Job already running",
      });
    }

    try {
      // Load all shops with calendar connections
      const shopsWithCalendar = await db
        .select({
          shopId: calendarConnections.shopId,
        })
        .from(calendarConnections)
        .where(isNotNull(calendarConnections.accessTokenEncrypted))
        .groupBy(calendarConnections.shopId);

      console.log(
        `[scan-conflicts] Processing ${shopsWithCalendar.length} shops with calendar connections`
      );

      let totalConflicts = 0;
      let totalAlertsCreated = 0;
      let totalAlertsAutoResolved = 0;
      let shopsProcessed = 0;
      let shopsErrored = 0;

      // Process each shop
      for (const { shopId } of shopsWithCalendar) {
        try {
          const result = await scanAndDetectConflicts(shopId);

          totalConflicts += result.conflictsDetected;
          totalAlertsCreated += result.alertsCreated;
          totalAlertsAutoResolved += result.alertsAutoResolved;
          shopsProcessed++;

          if (result.alertsCreated > 0 || result.alertsAutoResolved > 0) {
            console.log(
              `[scan-conflicts] Shop ${shopId}: ` +
              `${result.conflictsDetected} conflicts, ` +
              `${result.alertsCreated} alerts created, ` +
              `${result.alertsAutoResolved} auto-resolved`
            );
          }
        } catch (error) {
          shopsErrored++;
          console.error(`[scan-conflicts] Error processing shop ${shopId}:`, error);
          // Continue processing other shops
        }
      }

      // Cleanup old alerts
      const deletedCount = await cleanupOldAlerts();

      console.log(`[scan-conflicts] Cleaned up ${deletedCount} old alerts`);

      const duration = Date.now() - startTime;

      console.log(
        `[scan-conflicts] Job completed in ${duration}ms: ` +
        `${shopsProcessed} shops processed, ` +
        `${totalConflicts} conflicts detected, ` +
        `${totalAlertsCreated} alerts created, ` +
        `${totalAlertsAutoResolved} auto-resolved, ` +
        `${deletedCount} cleaned up`
      );

      return NextResponse.json({
        success: true,
        shopsProcessed,
        shopsErrored,
        conflictsDetected: totalConflicts,
        alertsCreated: totalAlertsCreated,
        alertsAutoResolved: totalAlertsAutoResolved,
        alertsCleaned: deletedCount,
        durationMs: duration,
      });

    } finally {
      // Release advisory lock
      await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_ID})`);
    }

  } catch (error) {
    console.error("[scan-conflicts] Job failed:", error);

    return NextResponse.json(
      {
        error: "Job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Key Design Decisions:**
- **Advisory lock:** Prevents concurrent runs (Vercel can invoke multiple times)
- **Error isolation:** Shop-level errors don't stop job
- **Cleanup integration:** Runs in same job for efficiency
- **Detailed logging:** Helps debug issues per shop
- **Timeout safety:** Should complete in <55s (Vercel limit)

---

### Step 3: Vercel Cron Configuration

**File:** `vercel.json` (update)

**Purpose:** Schedule conflict scanning job

```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/jobs/recompute-scores",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/jobs/offer-loop",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/jobs/scan-calendar-conflicts",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**Schedule:** Daily at 4:00 AM UTC

**Rationale:**
- Low traffic time
- Before business hours in most timezones
- Sufficient frequency (conflicts don't need real-time detection)
- Leaves time for V7 dashboard review before day starts

---

### Step 4: Auto-Resolve on Cancellation (Update V5)

**File:** `src/lib/google-calendar.ts` (update V5 stub)

**Purpose:** Implement auto-resolve alert logic

```typescript
import { db } from "@/lib/db";
import { calendarConflictAlerts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * Auto-resolves conflict alerts after event deletion.
 * Called when appointments are cancelled.
 *
 * @param shopId - Shop UUID
 * @param calendarEventId - Google Calendar event ID
 */
export async function autoResolveAlert(
  shopId: string,
  calendarEventId: string
): Promise<void> {
  try {
    const now = new Date();

    const updateResult = await db
      .update(calendarConflictAlerts)
      .set({
        status: "auto_resolved_cancelled",
        resolvedAt: now,
        resolvedBy: "system_cancelled",
        updatedAt: now,
      })
      .where(
        and(
          eq(calendarConflictAlerts.shopId, shopId),
          eq(calendarConflictAlerts.calendarEventId, calendarEventId),
          eq(calendarConflictAlerts.status, "pending")
        )
      )
      .returning({ id: calendarConflictAlerts.id });

    if (updateResult.length > 0) {
      console.log(
        `[calendar] Auto-resolved ${updateResult.length} conflict alert(s) for event ${calendarEventId}`
      );
    }
  } catch (error) {
    // Log but don't throw (graceful degradation)
    console.error(
      `[calendar] Failed to auto-resolve alerts for event ${calendarEventId}:`,
      error
    );
  }
}
```

**Changes from V5 stub:**
- Queries `calendarConflictAlerts` table
- Updates status to `auto_resolved_cancelled`
- Marks resolve timestamp and reason
- Logs resolution count

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/calendar-conflicts.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateOverlapSeverity,
  scanAndDetectConflicts,
  cleanupOldAlerts,
} from "@/lib/calendar-conflicts";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  appointments,
  calendarConflictAlerts,
  policyVersions,
  customers,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { addHours, addDays, subDays } from "date-fns";
import * as cacheModule from "@/lib/google-calendar-cache";
import { vi } from "vitest";

vi.mock("@/lib/google-calendar-cache");

describe("calculateOverlapSeverity", () => {
  it("should return 'all_day' for all-day events", () => {
    const appointmentStart = new Date("2024-03-15T10:00:00Z");
    const appointmentEnd = new Date("2024-03-15T11:00:00Z");
    const eventStart = new Date("2024-03-15T00:00:00Z");
    const eventEnd = new Date("2024-03-16T00:00:00Z");

    const severity = calculateOverlapSeverity(
      appointmentStart,
      appointmentEnd,
      eventStart,
      eventEnd,
      true // isAllDay
    );

    expect(severity).toBe("all_day");
  });

  it("should return 'full' for 100% overlap", () => {
    const appointmentStart = new Date("2024-03-15T10:00:00Z");
    const appointmentEnd = new Date("2024-03-15T11:00:00Z");
    const eventStart = new Date("2024-03-15T10:00:00Z");
    const eventEnd = new Date("2024-03-15T11:00:00Z");

    const severity = calculateOverlapSeverity(
      appointmentStart,
      appointmentEnd,
      eventStart,
      eventEnd,
      false
    );

    expect(severity).toBe("full");
  });

  it("should return 'high' for >=50% overlap", () => {
    const appointmentStart = new Date("2024-03-15T10:00:00Z");
    const appointmentEnd = new Date("2024-03-15T11:00:00Z");
    const eventStart = new Date("2024-03-15T10:00:00Z");
    const eventEnd = new Date("2024-03-15T10:30:00Z"); // 50% overlap

    const severity = calculateOverlapSeverity(
      appointmentStart,
      appointmentEnd,
      eventStart,
      eventEnd,
      false
    );

    expect(severity).toBe("high");
  });

  it("should return 'partial' for <50% overlap", () => {
    const appointmentStart = new Date("2024-03-15T10:00:00Z");
    const appointmentEnd = new Date("2024-03-15T11:00:00Z");
    const eventStart = new Date("2024-03-15T10:00:00Z");
    const eventEnd = new Date("2024-03-15T10:20:00Z"); // 33% overlap

    const severity = calculateOverlapSeverity(
      appointmentStart,
      appointmentEnd,
      eventStart,
      eventEnd,
      false
    );

    expect(severity).toBe("partial");
  });
});

describe("scanAndDetectConflicts", () => {
  let testShopId: string;
  let testAppointmentId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Conflict Scan Test",
        slug: "conflict-scan-test",
        currency: "USD",
        ownerId: "owner-test",
        status: "active",
      })
      .returning();

    testShopId = shop.id;

    // Create booking settings
    await db.insert(bookingSettings).values({
      shopId: testShopId,
      timezone: "America/New_York",
      slotMinutes: 60,
    });

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@test.com",
      })
      .returning();

    // Create policy version
    const [policy] = await db
      .insert(policyVersions)
      .values({
        shopId: testShopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
      })
      .returning();

    // Create future appointment
    const tomorrow = addDays(new Date(), 1);
    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: tomorrow,
        endsAt: addHours(tomorrow, 1),
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
      })
      .returning();

    testAppointmentId = appointment.id;
  });

  afterEach(async () => {
    await db.delete(calendarConflictAlerts).where(eq(calendarConflictAlerts.shopId, testShopId));
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(policyVersions).where(eq(policyVersions.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  it("should detect conflicts and create alerts", async () => {
    const tomorrow = addDays(new Date(), 1);

    // Mock calendar events with conflict
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([
      {
        id: "event-123",
        summary: "Team Meeting",
        start: { dateTime: tomorrow.toISOString() },
        end: { dateTime: addHours(tomorrow, 1).toISOString() },
      },
    ]);

    const result = await scanAndDetectConflicts(testShopId);

    expect(result.conflictsDetected).toBe(1);
    expect(result.alertsCreated).toBe(1);
    expect(result.alertsAutoResolved).toBe(0);

    // Verify alert in database
    const alerts = await db.query.calendarConflictAlerts.findMany({
      where: eq(calendarConflictAlerts.shopId, testShopId),
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].appointmentId).toBe(testAppointmentId);
    expect(alerts[0].calendarEventId).toBe("event-123");
    expect(alerts[0].severity).toBe("full");
    expect(alerts[0].status).toBe("pending");
  });

  it("should skip duplicate alerts", async () => {
    const tomorrow = addDays(new Date(), 1);

    // Create existing alert
    await db.insert(calendarConflictAlerts).values({
      shopId: testShopId,
      appointmentId: testAppointmentId,
      calendarEventId: "event-123",
      eventSummary: "Existing",
      eventStart: tomorrow,
      eventEnd: addHours(tomorrow, 1),
      severity: "full",
      status: "pending",
    });

    // Mock same conflict
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([
      {
        id: "event-123",
        summary: "Team Meeting",
        start: { dateTime: tomorrow.toISOString() },
        end: { dateTime: addHours(tomorrow, 1).toISOString() },
      },
    ]);

    const result = await scanAndDetectConflicts(testShopId);

    expect(result.conflictsDetected).toBe(1);
    expect(result.alertsCreated).toBe(0); // Skip duplicate

    // Verify still only 1 alert
    const alerts = await db.query.calendarConflictAlerts.findMany({
      where: eq(calendarConflictAlerts.shopId, testShopId),
    });

    expect(alerts).toHaveLength(1);
  });

  it("should auto-resolve alerts for past appointments", async () => {
    // Create past appointment
    const yesterday = subDays(new Date(), 1);

    const [customer] = await db.query.customers.findMany({
      where: eq(customers.shopId, testShopId),
      limit: 1,
    });

    const [policy] = await db.query.policyVersions.findMany({
      where: eq(policyVersions.shopId, testShopId),
      limit: 1,
    });

    const [pastAppointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: yesterday,
        endsAt: addHours(yesterday, 1),
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
      })
      .returning();

    // Create pending alert for past appointment
    await db.insert(calendarConflictAlerts).values({
      shopId: testShopId,
      appointmentId: pastAppointment.id,
      calendarEventId: "event-past",
      eventSummary: "Past Event",
      eventStart: yesterday,
      eventEnd: addHours(yesterday, 1),
      severity: "full",
      status: "pending",
    });

    // Mock no current conflicts
    vi.spyOn(cacheModule, "fetchCalendarEventsWithCache").mockResolvedValue([]);

    const result = await scanAndDetectConflicts(testShopId);

    expect(result.alertsAutoResolved).toBe(1);

    // Verify alert auto-resolved
    const alert = await db.query.calendarConflictAlerts.findFirst({
      where: eq(calendarConflictAlerts.appointmentId, pastAppointment.id),
    });

    expect(alert?.status).toBe("auto_resolved_past");
    expect(alert?.resolvedBy).toBe("system_past");
  });
});

describe("cleanupOldAlerts", () => {
  it("should delete alerts older than 30 days", async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Cleanup Test",
        slug: "cleanup-test",
        currency: "USD",
        ownerId: "owner-cleanup",
        status: "active",
      })
      .returning();

    // Create old alert (35 days ago)
    const oldDate = subDays(new Date(), 35);

    await db.insert(calendarConflictAlerts).values({
      shopId: shop.id,
      appointmentId: "00000000-0000-0000-0000-000000000000", // Dummy ID
      calendarEventId: "old-event",
      eventSummary: "Old",
      eventStart: oldDate,
      eventEnd: addHours(oldDate, 1),
      severity: "full",
      status: "pending",
      createdAt: oldDate,
    });

    // Create recent alert (5 days ago)
    const recentDate = subDays(new Date(), 5);

    await db.insert(calendarConflictAlerts).values({
      shopId: shop.id,
      appointmentId: "00000000-0000-0000-0000-000000000001", // Dummy ID
      calendarEventId: "recent-event",
      eventSummary: "Recent",
      eventStart: recentDate,
      eventEnd: addHours(recentDate, 1),
      severity: "full",
      status: "pending",
      createdAt: recentDate,
    });

    const deletedCount = await cleanupOldAlerts();

    expect(deletedCount).toBe(1);

    // Verify recent alert still exists
    const remainingAlerts = await db.query.calendarConflictAlerts.findMany({
      where: eq(calendarConflictAlerts.shopId, shop.id),
    });

    expect(remainingAlerts).toHaveLength(1);
    expect(remainingAlerts[0].calendarEventId).toBe("recent-event");

    // Cleanup
    await db.delete(calendarConflictAlerts).where(eq(calendarConflictAlerts.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
  });
});
```

---

### Integration Tests

**File:** `src/app/api/jobs/__tests__/scan-calendar-conflicts.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../scan-calendar-conflicts/route";
import { db } from "@/lib/db";
import { shops, bookingSettings, calendarConnections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import * as conflictModule from "@/lib/calendar-conflicts";
import { vi } from "vitest";

vi.mock("@/lib/calendar-conflicts");

describe("POST /api/jobs/scan-calendar-conflicts", () => {
  it("should require CRON_SECRET", async () => {
    const request = new Request("http://localhost:3000/api/jobs/scan-calendar-conflicts", {
      method: "POST",
      headers: {
        "x-cron-secret": "wrong-secret",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("should process shops with calendar connections", async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Scan Test",
        slug: "scan-test",
        currency: "USD",
        ownerId: "owner-scan",
        status: "active",
      })
      .returning();

    // Create calendar connection
    await db.insert(calendarConnections).values({
      shopId: shop.id,
      calendarId: "primary",
      calendarName: "Test Calendar",
      accessTokenEncrypted: JSON.stringify({ encrypted: "mock" }),
      refreshTokenEncrypted: JSON.stringify({ encrypted: "mock" }),
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    });

    // Mock conflict detection
    vi.spyOn(conflictModule, "scanAndDetectConflicts").mockResolvedValue({
      conflictsDetected: 2,
      alertsCreated: 2,
      alertsAutoResolved: 0,
    });

    vi.spyOn(conflictModule, "cleanupOldAlerts").mockResolvedValue(5);

    const request = new Request("http://localhost:3000/api/jobs/scan-calendar-conflicts", {
      method: "POST",
      headers: {
        "x-cron-secret": env.CRON_SECRET,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(result.shopsProcessed).toBe(1);
    expect(result.conflictsDetected).toBe(2);
    expect(result.alertsCreated).toBe(2);
    expect(result.alertsCleaned).toBe(5);

    expect(conflictModule.scanAndDetectConflicts).toHaveBeenCalledWith(shop.id);
    expect(conflictModule.cleanupOldAlerts).toHaveBeenCalled();

    // Cleanup
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
  });

  it("should use advisory lock to prevent concurrent runs", async () => {
    const request = new Request("http://localhost:3000/api/jobs/scan-calendar-conflicts", {
      method: "POST",
      headers: {
        "x-cron-secret": env.CRON_SECRET,
      },
    });

    // Simulate lock already held
    vi.spyOn(db, "execute").mockResolvedValueOnce({
      rows: [{ acquired: false }],
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("Job already running");
  });
});
```

---

## Manual Testing Checklist

### Preparation

- [ ] Complete V1 (OAuth connection working)
- [ ] Connect Google Calendar
- [ ] Create test appointments

### Test Scenarios

**Scenario 1: Full Conflict Detection**

1. Create appointment for tomorrow at 2:00 PM
2. Manually add calendar event in Google Calendar for tomorrow at 2:00 PM
3. Trigger cron job manually:
   ```bash
   curl -X POST http://localhost:3000/api/jobs/scan-calendar-conflicts \
     -H "x-cron-secret: $CRON_SECRET"
   ```
4. Check database:
   ```sql
   SELECT * FROM calendar_conflict_alerts;
   ```
5. Verify alert created with severity='full'

**Scenario 2: Partial Conflict Detection**

1. Create appointment for tomorrow at 2:00 PM - 3:00 PM
2. Add calendar event for tomorrow at 2:30 PM - 3:00 PM
3. Trigger cron job
4. Verify alert created with severity='high' or 'partial'

**Scenario 3: All-Day Event**

1. Create appointment for tomorrow at 2:00 PM
2. Add all-day calendar event for tomorrow
3. Trigger cron job
4. Verify alert created with severity='all_day'

**Scenario 4: De-duplication**

1. Create conflict (appointment + event)
2. Trigger cron job (alert created)
3. Trigger cron job again
4. Verify only one alert in database

**Scenario 5: Auto-Resolve Past**

1. Create past appointment with conflict alert
2. Trigger cron job
3. Verify alert status changed to 'auto_resolved_past'

**Scenario 6: Cleanup Old Alerts**

1. Create alert with created_at = 35 days ago
2. Trigger cron job
3. Verify alert deleted

**Scenario 7: Auto-Resolve on Cancel**

1. Create appointment with conflict alert
2. Cancel appointment
3. Verify alert status changed to 'auto_resolved_cancelled'

---

## Regression Prevention

### Critical Test Files to Monitor

```bash
# Unit tests - Conflict detection
pnpm test src/lib/__tests__/calendar-conflicts.test.ts

# Integration tests - Cron job
pnpm test src/app/api/jobs/__tests__/scan-calendar-conflicts.test.ts

# Existing cron jobs
pnpm test src/app/api/jobs/__tests__/resolve-outcomes.test.ts
pnpm test src/app/api/jobs/__tests__/recompute-scores.test.ts

# All tests
pnpm test
pnpm test:e2e
```

### Expected Behavior

- Existing booking/availability tests unaffected
- V5 cancellation tests still pass
- No changes to booking creation flow
- Calendar cache layer works unchanged

---

## Implementation Checklist

### Database

- [ ] Create migration `drizzle/0016_calendar_conflict_alerts.sql`
- [ ] Update `src/lib/schema.ts` with new table
- [ ] Run `pnpm db:migrate`
- [ ] Verify table created in database

### Core Logic

- [ ] Create `src/lib/calendar-conflicts.ts`
- [ ] Implement `calculateOverlapSeverity()`
- [ ] Implement `scanAndDetectConflicts()`
- [ ] Implement `cleanupOldAlerts()`
- [ ] Add date grouping optimization
- [ ] Add de-duplication logic
- [ ] Add auto-resolve for past appointments

### Cron Job

- [ ] Create `src/app/api/jobs/scan-calendar-conflicts/route.ts`
- [ ] Implement POST handler
- [ ] Add CRON_SECRET authentication
- [ ] Add PostgreSQL advisory lock
- [ ] Add shop-level error isolation
- [ ] Add detailed logging

### Integration

- [ ] Update `src/lib/google-calendar.ts`
- [ ] Implement `autoResolveAlert()` (replace V5 stub)
- [ ] Update `vercel.json` with cron schedule
- [ ] Add environment variable documentation

### Testing

- [ ] Create `src/lib/__tests__/calendar-conflicts.test.ts`
- [ ] Write unit tests for severity calculation
- [ ] Write unit tests for conflict detection
- [ ] Write unit tests for cleanup
- [ ] Create `src/app/api/jobs/__tests__/scan-calendar-conflicts.test.ts`
- [ ] Write integration tests for cron job
- [ ] Write integration tests for advisory lock
- [ ] Run all tests: `pnpm test`

### Code Quality

- [ ] Run `pnpm lint` and fix errors
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Add logging for debugging
- [ ] Review error handling
- [ ] Add code comments

### Manual Testing

- [ ] Test full conflict detection
- [ ] Test partial conflict detection
- [ ] Test all-day event detection
- [ ] Test de-duplication
- [ ] Test auto-resolve past
- [ ] Test cleanup old alerts
- [ ] Test auto-resolve on cancel
- [ ] Test advisory lock behavior

### Documentation

- [ ] Update README.md with cron job info
- [ ] Update CLAUDE.md with V6 notes
- [ ] Add inline comments to detection logic
- [ ] Document severity levels

---

## Demo Script

### Preparation

1. Complete V1-V5
2. Connect Google Calendar
3. Deploy to Vercel (or run locally)
4. Set up CRON_SECRET environment variable

### Demo Flow

1. **Create Conflicting Scenario**
   - Create appointment for tomorrow at 2:00 PM
   - Open Google Calendar
   - Manually add event for tomorrow at 2:00 PM ("Team Meeting")

2. **Trigger Cron Job**
   ```bash
   curl -X POST https://your-app.vercel.app/api/jobs/scan-calendar-conflicts \
     -H "x-cron-secret: $CRON_SECRET"
   ```

3. **Verify Alert Created**
   ```sql
   SELECT
     id,
     appointment_id,
     calendar_event_id,
     event_summary,
     severity,
     status,
     detected_at
   FROM calendar_conflict_alerts
   WHERE status = 'pending';
   ```

4. **Show De-duplication**
   - Trigger cron job again
   - Verify no duplicate alerts created

5. **Show Auto-Resolve on Cancel**
   - Cancel appointment
   - Check alert status changed to 'auto_resolved_cancelled'

6. **Show Auto-Resolve Past**
   - Wait for appointment to end (or create past appointment)
   - Trigger cron job
   - Verify alert auto-resolved

---

## Success Criteria

V6 is complete when:

✅ Conflict scanning cron job runs successfully
✅ Conflicts detected between appointments and calendar events
✅ Alerts created in database with correct severity
✅ De-duplication prevents duplicate alerts
✅ Auto-resolve works for past appointments
✅ Auto-resolve works on cancellation
✅ Cleanup removes old alerts (30+ days)
✅ Advisory lock prevents concurrent runs
✅ All unit tests pass
✅ All integration tests pass
✅ No regression in existing tests
✅ Code quality checks pass
✅ Vercel cron configured
✅ Manual testing verified

---

## Estimated Timeline

**Total: 2 days**

**Day 1:**
- Morning: Database schema, conflict detection logic (4 hours)
- Afternoon: Cron job route, advisory lock, cleanup (4 hours)

**Day 2:**
- Morning: Auto-resolve integration, testing (4 hours)
- Afternoon: Manual verification, documentation (4 hours)

**Buffer:** 1 day (conflict detection can be complex)

---

## Known Limitations (V6)

1. **No Real-Time Detection** - Runs daily, not on calendar event creation
2. **No Notification** - Alerts stored in database only (V7 adds UI)
3. **No Event Modification Detection** - Only detects on initial scan
4. **30-Day History** - Older alerts deleted (sufficient for most cases)
5. **Single Calendar Per Shop** - Multi-calendar support future enhancement

---

## Next Steps After V6

**V7: Conflicts Dashboard**
- Build alert banner on `/app/appointments` page
- Create `/app/conflicts` page with conflicts table
- Add "Keep Appointment" / "Cancel Appointment" actions
- Implement alert dismissal
- Integrate cancellation flow with alert resolution

**Prerequisites from V6:**
- `calendar_conflict_alerts` table exists
- Conflict detection working
- Auto-resolve logic functional
- Severity calculation accurate

---

## Rollback Plan

If V6 needs to be rolled back:

1. **Database Rollback:**
   ```bash
   # Manually drop table
   DROP TABLE calendar_conflict_alerts CASCADE;
   ```

2. **Code Rollback:**
   - Remove `src/lib/calendar-conflicts.ts`
   - Remove `src/app/api/jobs/scan-calendar-conflicts/route.ts`
   - Revert `src/lib/google-calendar.ts` (restore V5 stub)
   - Revert `vercel.json` cron configuration
   - Remove test files

3. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All V1-V5 functionality remains unchanged.
