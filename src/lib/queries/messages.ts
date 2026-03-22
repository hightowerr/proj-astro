import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageLog } from "@/lib/schema";

/**
 * Returns true when a reminder for the given interval has already been logged
 * for the appointment.
 */
export const checkReminderAlreadySent = async (
  appointmentId: string,
  interval: string
): Promise<boolean> => {
  const purpose =
    `appointment_reminder_${interval}` as typeof messageLog.$inferInsert.purpose;

  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.appointmentId, appointmentId),
        eq(messageLog.purpose, purpose)
      )
    )
    .limit(1);

  return existing.length > 0;
};
