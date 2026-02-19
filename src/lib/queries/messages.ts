import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageLog } from "@/lib/schema";

/**
 * Returns true when a 24h reminder has already been logged for the appointment.
 */
export const checkReminderAlreadySent = async (
  appointmentId: string
): Promise<boolean> => {
  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.appointmentId, appointmentId),
        eq(messageLog.purpose, "appointment_reminder_24h")
      )
    )
    .limit(1);

  return existing.length > 0;
};
