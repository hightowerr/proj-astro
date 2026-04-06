import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, slotOffers, slotOpenings } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482176;
const BATCH_SIZE = 25;
const DEFAULT_TTL_HOURS = 2;

/**
 * Expire pending slot-recovery appointments that were abandoned: the customer replied YES
 * to an SMS offer but never completed payment within the TTL window.
 *
 * For each abandoned appointment:
 * 1. Cancels the appointment (only if still pending — idempotent)
 * 2. Reopens the slot opening (only if currently filled)
 * 3. Declines the customer's accepted offer
 * 4. Triggers the offer loop for the reopened slot
 *
 * Authentication: x-cron-secret header.
 * Optional query param: ?ttlHours=N (overrides default 2h, non-production use)
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ttlHours = Math.max(
    0,
    Number(url.searchParams.get("ttlHours") ?? DEFAULT_TTL_HOURS)
  );
  const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${LOCK_ID}) as locked`
  );
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    const abandoned = await db
      .select({
        appointmentId: appointments.id,
        customerId: appointments.customerId,
        sourceSlotOpeningId: appointments.sourceSlotOpeningId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.source, "slot_recovery"),
          eq(appointments.status, "pending"),
          isNotNull(appointments.sourceSlotOpeningId),
          lt(appointments.createdAt, cutoff)
        )
      )
      .limit(BATCH_SIZE);

    let expired = 0;
    const reopenedSlots: string[] = [];
    const errors: string[] = [];

    for (const appt of abandoned) {
      try {
        await db.transaction(async (tx) => {
          const [cancelled] = await tx
            .update(appointments)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(
              and(
                eq(appointments.id, appt.appointmentId),
                eq(appointments.status, "pending")
              )
            )
            .returning({ id: appointments.id });

          if (!cancelled) return;
          expired += 1;

          const slotOpeningId = appt.sourceSlotOpeningId!;

          const [reopened] = await tx
            .update(slotOpenings)
            .set({ status: "open", updatedAt: new Date() })
            .where(
              and(
                eq(slotOpenings.id, slotOpeningId),
                eq(slotOpenings.status, "filled")
              )
            )
            .returning({ id: slotOpenings.id });

          await tx
            .update(slotOffers)
            .set({ status: "declined", updatedAt: new Date() })
            .where(
              and(
                eq(slotOffers.slotOpeningId, slotOpeningId),
                eq(slotOffers.customerId, appt.customerId),
                inArray(slotOffers.status, ["sent", "accepted"])
              )
            );

          if (reopened) {
            reopenedSlots.push(reopened.id);
          }
        });
      } catch (error) {
        errors.push(
          `Failed to expire appointment ${appt.appointmentId}: ${(error as Error).message ?? "Unknown error"}`
        );
      }
    }

    const appUrl = process.env.APP_URL;
    const internalSecret = process.env.INTERNAL_SECRET;
    let triggered = 0;

    for (const slotId of reopenedSlots) {
      if (!appUrl || !internalSecret) {
        errors.push(`Missing APP_URL or INTERNAL_SECRET for slot ${slotId}`);
        continue;
      }

      try {
        const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ slotOpeningId: slotId }),
        });

        if (response.ok) {
          triggered += 1;
        } else {
          errors.push(
            `Failed to trigger offer loop for slot ${slotId}: ${response.status}`
          );
        }
      } catch (error) {
        errors.push(
          `Failed to trigger offer loop for slot ${slotId}: ${(error as Error).message ?? "Unknown error"}`
        );
      }
    }

    return Response.json({
      expired,
      reopened: reopenedSlots.length,
      triggered,
      errors,
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
