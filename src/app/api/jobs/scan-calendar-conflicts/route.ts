import { isNull, sql } from "drizzle-orm";
import { cleanupOldAlerts, scanAndDetectConflicts } from "@/lib/calendar-conflicts";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const DEFAULT_LOCK_ID = 987654321;

const parseLockId = (req: Request): number => {
  const url = new URL(req.url);
  const queryLockId = url.searchParams.get("lockId");
  const envLockId = process.env.SCAN_CALENDAR_CONFLICTS_LOCK_ID;
  const raw =
    process.env.NODE_ENV === "production" ? envLockId : queryLockId ?? envLockId;

  if (!raw) {
    return DEFAULT_LOCK_ID;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_LOCK_ID;
  }

  return parsed;
};

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const lockId = parseLockId(req);
  const lockResult = await db.execute(sql`select pg_try_advisory_lock(${lockId}) as locked`);
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    const shopRows = await db
      .select({
        shopId: calendarConnections.shopId,
      })
      .from(calendarConnections)
      .where(isNull(calendarConnections.deletedAt))
      .groupBy(calendarConnections.shopId);

    let shopsProcessed = 0;
    let shopsErrored = 0;
    let conflictsDetected = 0;
    let alertsCreated = 0;
    let alertsAutoResolved = 0;

    for (const row of shopRows) {
      try {
        const result = await scanAndDetectConflicts(row.shopId);
        shopsProcessed += 1;
        conflictsDetected += result.conflictsDetected;
        alertsCreated += result.alertsCreated;
        alertsAutoResolved += result.alertsAutoResolved;
      } catch (error) {
        shopsErrored += 1;
        console.error("[scan-conflicts] Failed processing shop", {
          shopId: row.shopId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const alertsCleaned = await cleanupOldAlerts();
    const durationMs = Date.now() - startedAt;

    return Response.json({
      success: true,
      shopsProcessed,
      shopsErrored,
      conflictsDetected,
      alertsCreated,
      alertsAutoResolved,
      alertsCleaned,
      durationMs,
    });
  } catch (error) {
    console.error("[scan-conflicts] Job failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Job failed" }, { status: 500 });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${lockId})`);
  }
}
