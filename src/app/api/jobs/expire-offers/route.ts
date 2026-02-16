import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { slotOffers, slotOpenings } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482174;
const BATCH_SIZE = 25;

/**
 * Expire sent slot offers that have passed their expiry and trigger the next offer.
 *
 * Authentication: x-cron-secret header.
 */
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
    const expiredOffers = await db
      .select({
        offerId: slotOffers.id,
        slotOpeningId: slotOffers.slotOpeningId,
      })
      .from(slotOffers)
      .innerJoin(slotOpenings, eq(slotOpenings.id, slotOffers.slotOpeningId))
      .where(
        and(
          eq(slotOffers.status, "sent"),
          sql`${slotOffers.expiresAt} <= now()`,
          eq(slotOpenings.status, "open")
        )
      )
      .limit(BATCH_SIZE);

    let expired = 0;
    let triggered = 0;
    const errors: string[] = [];

    const appUrl = process.env.APP_URL;
    const internalSecret = process.env.INTERNAL_SECRET;

    for (const offer of expiredOffers) {
      try {
        const updated = await db
          .update(slotOffers)
          .set({
            status: "expired",
            updatedAt: new Date(),
          })
          .where(and(eq(slotOffers.id, offer.offerId), eq(slotOffers.status, "sent")))
          .returning({ id: slotOffers.id });

        if (updated.length === 0) {
          continue;
        }

        expired += 1;

        if (!appUrl || !internalSecret) {
          errors.push(`Missing APP_URL or INTERNAL_SECRET for offer ${offer.offerId}`);
          continue;
        }

        const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ slotOpeningId: offer.slotOpeningId }),
        });

        if (response.ok) {
          triggered += 1;
          continue;
        }

        errors.push(
          `Failed to trigger offer loop for slot ${offer.slotOpeningId}: ${response.status}`
        );
      } catch (error) {
        errors.push(
          `Failed to process expired offer ${offer.offerId}: ${(error as Error).message ?? "Unknown error"}`
        );
      }
    }

    return Response.json({
      total: expiredOffers.length,
      expired,
      triggered,
      errors,
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
