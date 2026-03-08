import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { formatDateInTimeZone } from "@/lib/booking";
import { db } from "@/lib/db";
import {
  type CalendarEvent,
  fetchCalendarEventsWithCache,
  isAllDayEvent,
} from "@/lib/google-calendar-cache";
import { appointments, bookingSettings, calendarConflictAlerts } from "@/lib/schema";

const CONFLICT_BUFFER_MS = 5 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ConflictEventDetails = {
  summary: string;
  start: string;
  end: string;
};

export type ConflictSeverity = "full" | "high" | "partial" | "all_day";

const sanitizeEventSummary = (summary: string | undefined): string => {
  const normalized = (summary ?? "").trim();
  if (!normalized) {
    return "Busy";
  }

  return normalized.slice(0, 120);
};

const toConflictEventDetails = (
  event?: CalendarEvent
): ConflictEventDetails | null => {
  if (!event) {
    return null;
  }

  return {
    summary: sanitizeEventSummary(event.summary),
    start: event.start.dateTime ?? event.start.date ?? "",
    end: event.end.dateTime ?? event.end.date ?? "",
  };
};

function parseEventStart(event: CalendarEvent): Date | null {
  if (event.start.dateTime) {
    const parsed = Date.parse(event.start.dateTime);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }

  if (event.start.date) {
    const parsed = Date.parse(`${event.start.date}T00:00:00.000Z`);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }

  return null;
}

function parseEventEnd(event: CalendarEvent): Date | null {
  if (event.end.dateTime) {
    const parsed = Date.parse(event.end.dateTime);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }

  if (event.end.date) {
    const parsed = Date.parse(`${event.end.date}T00:00:00.000Z`);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }

  return null;
}

/**
 * Error thrown when a booking conflicts with an existing calendar event.
 */
export class CalendarConflictError extends Error {
  public readonly conflictingEvent: ConflictEventDetails | null;

  constructor(message: string, conflictingEvent?: CalendarEvent) {
    super(message);
    this.name = "CalendarConflictError";
    this.conflictingEvent = toConflictEventDetails(conflictingEvent);
  }
}

/**
 * Calculate overlap severity between appointment and calendar event.
 */
export function calculateOverlapSeverity(
  appointmentStart: Date,
  appointmentEnd: Date,
  eventStart: Date,
  eventEnd: Date,
  allDay: boolean
): ConflictSeverity {
  if (allDay) {
    return "all_day";
  }

  const appointmentDurationMs = appointmentEnd.getTime() - appointmentStart.getTime();
  if (appointmentDurationMs <= 0) {
    return "partial";
  }

  const overlapStart = Math.max(appointmentStart.getTime(), eventStart.getTime());
  const overlapEnd = Math.min(appointmentEnd.getTime(), eventEnd.getTime());
  const overlapMs = Math.max(0, overlapEnd - overlapStart);
  const overlapPercent = (overlapMs / appointmentDurationMs) * 100;

  if (overlapPercent >= 100) {
    return "full";
  }

  if (overlapPercent >= 50) {
    return "high";
  }

  return "partial";
}

/**
 * Validates whether the given booking overlaps with calendar events.
 *
 * Throws CalendarConflictError when conflict exists. For upstream API/cache
 * failures, logs and allows booking (graceful degradation).
 */
export async function validateBookingConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<void> {
  const dateStr = formatDateInTimeZone(input.startsAt, input.timezone);

  try {
    const events = await fetchCalendarEventsWithCache(
      input.shopId,
      dateStr,
      input.timezone
    );
    if (events.length === 0) {
      return;
    }

    const allDayEvent = events.find(isAllDayEvent);
    if (allDayEvent) {
      throw new CalendarConflictError(
        "This date is blocked by an all-day calendar event",
        allDayEvent
      );
    }

    const bookingStart = input.startsAt.getTime();
    const bookingEnd = input.endsAt.getTime();

    for (const event of events) {
      if (isAllDayEvent(event)) {
        continue;
      }

      const eventStart = event.start.dateTime
        ? Date.parse(event.start.dateTime)
        : Number.NaN;
      const eventEnd = event.end.dateTime
        ? Date.parse(event.end.dateTime)
        : Number.NaN;

      if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || eventEnd <= eventStart) {
        continue;
      }

      const overlaps =
        eventStart < bookingEnd + CONFLICT_BUFFER_MS &&
        eventEnd > bookingStart - CONFLICT_BUFFER_MS;

      if (overlaps) {
        throw new CalendarConflictError(
          "This time conflicts with an existing calendar event",
          event
        );
      }
    }
  } catch (error) {
    if (error instanceof CalendarConflictError) {
      throw error;
    }

    console.error("[calendar-conflicts] Failed to validate booking conflict", {
      shopId: input.shopId,
      startsAt: input.startsAt.toISOString(),
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Returns whether a booking conflicts with calendar events without throwing.
 */
export async function hasCalendarConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<boolean> {
  try {
    await validateBookingConflict(input);
    return false;
  } catch (error) {
    if (error instanceof CalendarConflictError) {
      return true;
    }
    return false;
  }
}

/**
 * Scan future booked appointments for a shop and create conflict alerts.
 */
export async function scanAndDetectConflicts(shopId: string): Promise<{
  conflictsDetected: number;
  alertsCreated: number;
  alertsAutoResolved: number;
}> {
  const now = new Date();
  const settings = await db.query.bookingSettings.findFirst({
    where: eq(bookingSettings.shopId, shopId),
  });

  if (!settings) {
    console.warn("[conflict-scan] Missing booking settings; skipping shop", { shopId });
    return { conflictsDetected: 0, alertsCreated: 0, alertsAutoResolved: 0 };
  }

  const timezone = settings.timezone ?? "UTC";
  const futureAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.shopId, shopId),
      eq(appointments.status, "booked"),
      gte(appointments.startsAt, now)
    ),
    columns: {
      id: true,
      startsAt: true,
      endsAt: true,
      calendarEventId: true,
    },
  });

  const appointmentsByDate = new Map<string, typeof futureAppointments>();
  for (const appointment of futureAppointments) {
    const dateStr = formatDateInTimeZone(appointment.startsAt, timezone);
    const existing = appointmentsByDate.get(dateStr) ?? [];
    existing.push(appointment);
    appointmentsByDate.set(dateStr, existing);
  }

  let conflictsDetected = 0;
  let alertsCreated = 0;

  for (const [dateStr, dateAppointments] of appointmentsByDate) {
    try {
      const calendarEvents = await fetchCalendarEventsWithCache(
        shopId,
        dateStr,
        timezone
      );
      if (calendarEvents.length === 0) {
        continue;
      }

      for (const appointment of dateAppointments) {
        for (const event of calendarEvents) {
          if (appointment.calendarEventId && appointment.calendarEventId === event.id) {
            continue;
          }

          const eventStart = parseEventStart(event);
          const eventEnd = parseEventEnd(event);
          const allDay = isAllDayEvent(event);
          if (!eventStart || !eventEnd || eventEnd <= eventStart) {
            continue;
          }

          const hasOverlap = allDay
            ? true
            : eventStart.getTime() < appointment.endsAt.getTime() &&
              eventEnd.getTime() > appointment.startsAt.getTime();

          if (!hasOverlap) {
            continue;
          }

          conflictsDetected += 1;
          const severity = calculateOverlapSeverity(
            appointment.startsAt,
            appointment.endsAt,
            eventStart,
            eventEnd,
            allDay
          );

          const inserted = await db
            .insert(calendarConflictAlerts)
            .values({
              shopId,
              appointmentId: appointment.id,
              calendarEventId: event.id,
              eventSummary: event.summary || null,
              eventStart,
              eventEnd,
              severity,
              status: "pending",
              detectedAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: calendarConflictAlerts.id });

          if (inserted.length > 0) {
            alertsCreated += 1;
          }
        }
      }
    } catch (error) {
      console.error("[conflict-scan] Failed processing date", {
        shopId,
        dateStr,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const pastAppointmentIds = await db.query.appointments.findMany({
    where: and(eq(appointments.shopId, shopId), lte(appointments.endsAt, now)),
    columns: {
      id: true,
    },
  });

  let alertsAutoResolved = 0;
  if (pastAppointmentIds.length > 0) {
    const updateResult = await db
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
          inArray(
            calendarConflictAlerts.appointmentId,
            pastAppointmentIds.map((appointment) => appointment.id)
          )
        )
      )
      .returning({ id: calendarConflictAlerts.id });

    alertsAutoResolved = updateResult.length;
  }

  return {
    conflictsDetected,
    alertsCreated,
    alertsAutoResolved,
  };
}

/**
 * Delete conflict alerts older than 30 days.
 */
export async function cleanupOldAlerts(): Promise<number> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const deleted = await db
    .delete(calendarConflictAlerts)
    .where(lte(calendarConflictAlerts.createdAt, cutoff))
    .returning({ id: calendarConflictAlerts.id });

  return deleted.length;
}
