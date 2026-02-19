import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendAppointmentReminderSMS } from "@/lib/messages";
import { findHighRiskAppointments } from "@/lib/queries/appointments";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482178;

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockResult = await db.execute(sql`select pg_try_advisory_lock(${LOCK_ID}) as locked`);
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    const appointments = await findHighRiskAppointments();
    let sent = 0;
    let skipped = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appointment of appointments) {
      try {
        const result = await sendAppointmentReminderSMS({
          appointmentId: appointment.appointmentId,
          shopId: appointment.shopId,
          customerId: appointment.customerId,
          customerName: appointment.customerName,
          customerPhone: appointment.customerPhone,
          startsAt: appointment.startsAt,
          bookingUrl: appointment.bookingUrl,
          shopName: appointment.shopName,
          shopTimezone: appointment.shopTimezone,
        });

        if (result === "sent") {
          sent += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        errors.push({
          appointmentId: appointment.appointmentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({
      total: appointments.length,
      sent,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
