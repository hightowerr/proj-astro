import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, calendarConflictAlerts, customers } from "@/lib/schema";

export type ConflictWithDetails = {
  id: string;
  appointmentId: string;
  appointmentStartsAt: Date;
  appointmentEndsAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  calendarEventId: string;
  eventSummary: string | null;
  eventStart: Date;
  eventEnd: Date;
  severity: "full" | "high" | "partial" | "all_day";
  detectedAt: Date;
};

/**
 * Returns the number of unresolved conflict alerts for a shop.
 */
export async function getConflictCount(shopId: string): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(calendarConflictAlerts)
    .where(
      and(
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    );

  return row?.count ?? 0;
}

/**
 * Returns pending conflicts with appointment/customer details for dashboard UI.
 */
export async function getConflicts(shopId: string): Promise<ConflictWithDetails[]> {
  return await db
    .select({
      id: calendarConflictAlerts.id,
      appointmentId: calendarConflictAlerts.appointmentId,
      appointmentStartsAt: appointments.startsAt,
      appointmentEndsAt: appointments.endsAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      calendarEventId: calendarConflictAlerts.calendarEventId,
      eventSummary: calendarConflictAlerts.eventSummary,
      eventStart: calendarConflictAlerts.eventStart,
      eventEnd: calendarConflictAlerts.eventEnd,
      severity: calendarConflictAlerts.severity,
      detectedAt: calendarConflictAlerts.detectedAt,
    })
    .from(calendarConflictAlerts)
    .innerJoin(appointments, eq(calendarConflictAlerts.appointmentId, appointments.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(
      and(
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    )
    .orderBy(asc(appointments.startsAt));
}

/**
 * Marks a pending alert as dismissed by the user.
 */
export async function dismissAlert(alertId: string, shopId: string): Promise<boolean> {
  const now = new Date();

  const updated = await db
    .update(calendarConflictAlerts)
    .set({
      status: "dismissed",
      resolvedAt: now,
      resolvedBy: "user",
      updatedAt: now,
    })
    .where(
      and(
        eq(calendarConflictAlerts.id, alertId),
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    )
    .returning({ id: calendarConflictAlerts.id });

  return updated.length > 0;
}

/**
 * Resolves all pending alerts tied to a cancelled appointment.
 */
export async function resolveAlertsForCancelledAppointment(
  appointmentId: string,
  shopId: string
): Promise<number> {
  const now = new Date();

  const updated = await db
    .update(calendarConflictAlerts)
    .set({
      status: "auto_resolved_cancelled",
      resolvedAt: now,
      resolvedBy: "system_cancelled",
      updatedAt: now,
    })
    .where(
      and(
        eq(calendarConflictAlerts.appointmentId, appointmentId),
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    )
    .returning({ id: calendarConflictAlerts.id });

  return updated.length;
}
