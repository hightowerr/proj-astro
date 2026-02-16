import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aggregateAppointmentCounts, upsertCustomerScore } from "@/lib/queries/scoring";
import { customers, shops } from "@/lib/schema";
import { calculateScore, assignTier, flattenRecencyData } from "@/lib/scoring";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const BATCH_SIZE = 50;
const DEFAULT_LOCK_ID = 482175;

const parseLockId = (req: Request) => {
  const url = new URL(req.url);
  const queryLockId = url.searchParams.get("lockId");
  const envLockId = process.env.RECOMPUTE_SCORES_LOCK_ID;

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

  const lockId = parseLockId(req);
  const lockResult = await db.execute(sql`select pg_try_advisory_lock(${lockId}) as locked`);
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
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.shopId, shop.id));

      for (let i = 0; i < shopCustomers.length; i += BATCH_SIZE) {
        const batch = shopCustomers.slice(i, i + BATCH_SIZE);

        for (const customer of batch) {
          try {
            await computeScoreAndTier(customer.id, shop.id);
            processed += 1;
          } catch (error) {
            errors.push({
              customerId: customer.id,
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
    await db.execute(sql`select pg_advisory_unlock(${lockId})`);
  }
}

export async function computeScoreAndTier(
  customerId: string,
  shopId: string
): Promise<void> {
  try {
    const { recencyData, lastActivityAt, voidedLast90Days } = await aggregateAppointmentCounts(
      customerId,
      shopId,
      180
    );
    const score = calculateScore(recencyData);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score computed: ${score}`);
    }

    const tier = assignTier(score, voidedLast90Days);
    const totals = flattenRecencyData(recencyData);

    await upsertCustomerScore({
      customerId,
      shopId,
      score,
      tier,
      windowDays: 180,
      stats: {
        ...totals,
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
        voidedLast90Days,
      },
    });

  } catch (error) {
    console.error(`[recompute-scores] failed customer=${customerId} shop=${shopId}`, error);
    throw error;
  }
}
