import { sql } from "drizzle-orm";
import {
  expirePendingConfirmation,
  findExpiredConfirmationAppointments,
} from "@/lib/confirmation";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482180;
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
    const appointments = await findExpiredConfirmationAppointments(BATCH_SIZE);
    let cancelled = 0;
    let refunded = 0;
    let skipped = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appointment of appointments) {
      try {
        const result = await expirePendingConfirmation(appointment.appointmentId);

        if (!result.cancelled) {
          skipped += 1;
          continue;
        }

        cancelled += 1;
        if (result.refunded) {
          refunded += 1;
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
      cancelled,
      refunded,
      skipped,
      failed: errors.length,
      errorDetails: errors.slice(0, 10),
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
