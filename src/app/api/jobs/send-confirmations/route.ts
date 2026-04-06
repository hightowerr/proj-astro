import { sql } from "drizzle-orm";
import {
  findAppointmentsNeedingConfirmation,
  sendConfirmationRequest,
} from "@/lib/confirmation";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482179;
const BATCH_SIZE = 25;

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
    const appointments = await findAppointmentsNeedingConfirmation(BATCH_SIZE);
    let sent = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appointment of appointments) {
      try {
        await sendConfirmationRequest(appointment.appointmentId);
        sent += 1;
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
      failed: errors.length,
      errorDetails: errors.slice(0, 10),
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
