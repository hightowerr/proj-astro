import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { flattenRecencyBuckets } from "@/lib/no-show-scoring";
import { scanAppointmentsByOutcome, upsertNoShowStats } from "@/lib/queries/no-show-scoring";
import { appointments, shops } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482177;
const BATCH_SIZE = 50;

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
    let processed = 0;
    const errors: Array<{ customerId: string; shopId: string; error: string }> = [];

    const allShops = await db.select({ id: shops.id }).from(shops);

    for (const shop of allShops) {
      const shopCustomers = await db
        .selectDistinct({ customerId: appointments.customerId })
        .from(appointments)
        .where(eq(appointments.shopId, shop.id));

      for (let i = 0; i < shopCustomers.length; i += BATCH_SIZE) {
        const batch = shopCustomers.slice(i, i + BATCH_SIZE);

        for (const customer of batch) {
          try {
            await computeNoShowStatsForCustomer(customer.customerId, shop.id);
            processed += 1;
          } catch (error) {
            errors.push({
              customerId: customer.customerId,
              shopId: shop.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    return Response.json({
      processed,
      errors: errors.length,
      errorDetails: errors.slice(0, 25),
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}

export async function computeNoShowStatsForCustomer(
  customerId: string,
  shopId: string
): Promise<void> {
  const { recencyBuckets, lastNoShowAt } = await scanAppointmentsByOutcome(customerId, shopId, 180);
  const totals = flattenRecencyBuckets(recencyBuckets);

  const totalAppointments =
    totals.completed + totals.noShows + totals.lateCancels + totals.onTimeCancels;

  await upsertNoShowStats({
    customerId,
    shopId,
    stats: {
      totalAppointments,
      noShowCount: totals.noShows,
      lateCancelCount: totals.lateCancels,
      onTimeCancelCount: totals.onTimeCancels,
      completedCount: totals.completed,
      lastNoShowAt: lastNoShowAt ? lastNoShowAt.toISOString() : null,
    },
  });
}
