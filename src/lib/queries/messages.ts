import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageLog } from "@/lib/schema";

/**
 * Returns true when a reminder for the given interval has already been sent
 * on the given channel for the appointment.
 */
export const checkReminderAlreadySent = async (
  appointmentId: string,
  interval: string,
  channel: typeof messageLog.$inferInsert.channel
): Promise<boolean> => {
  const purpose =
    `appointment_reminder_${interval}` as typeof messageLog.$inferInsert.purpose;

  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.appointmentId, appointmentId),
        eq(messageLog.purpose, purpose),
        eq(messageLog.channel, channel),
        eq(messageLog.status, "sent")
      )
    )
    .limit(1);

  return existing.length > 0;
};
