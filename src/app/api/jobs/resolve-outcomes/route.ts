import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { backfillCancelledOutcome, resolveFinancialOutcome } from "@/lib/outcomes";
import {
  appointmentEvents,
  appointments,
  customerNoShowStats,
  payments,
  shopPolicies,
} from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const DEFAULT_LOCK_ID = 482173;

const parseLimit = (req: Request) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
};

const parseLockId = (req: Request) => {
  const url = new URL(req.url);
  const queryLockId = url.searchParams.get("lockId");
  const envLockId = process.env.RESOLVE_OUTCOMES_LOCK_ID;

  // Allow query override only outside production for test isolation.
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

/**
 * Resolve financial outcomes for ended appointments.
 *
 * Response:
 * - total: number of non-cancelled candidates found
 * - resolved: number successfully resolved
 * - skipped: number skipped (already resolved concurrently)
 * - backfilled: number of cancelled unresolved appointments backfilled
 * - errors: array of error messages
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

  const limit = parseLimit(req);
  const lockId = parseLockId(req);

  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${lockId}) as locked, pg_backend_pid() as pid`
  );
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    const candidates = await db
      .select({
        id: appointments.id,
        shopId: appointments.shopId,
        customerId: appointments.customerId,
        paymentRequired: appointments.paymentRequired,
        policyVersionId: appointments.policyVersionId,
        endsAt: appointments.endsAt,
        status: appointments.status,
        paymentId: payments.id,
        paymentStatus: payments.status,
        graceMinutes: shopPolicies.resolutionGraceMinutes,
      })
      .from(appointments)
      .innerJoin(shopPolicies, eq(shopPolicies.shopId, appointments.shopId))
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.financialOutcome, "unresolved"),
          eq(appointments.status, "booked"),
          sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
        )
      )
      .orderBy(asc(appointments.endsAt))
      .limit(limit);

    let resolved = 0;
    let skipped = 0;
    let backfilled = 0;
    let noShowsDetected = 0;
    const errors: string[] = [];

    for (const appointment of candidates) {
      try {
        const { financialOutcome, resolutionReason } =
          resolveFinancialOutcome({
            paymentRequired: appointment.paymentRequired,
            paymentStatus: appointment.paymentStatus ?? null,
          });
        const resolvedAt = new Date();

        const outcome = await db.transaction(async (tx) => {
          const updated = await tx
            .update(appointments)
            .set({
              financialOutcome,
              resolvedAt,
              resolutionReason,
              status: "ended",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(appointments.id, appointment.id),
                eq(appointments.financialOutcome, "unresolved"),
                eq(appointments.status, "booked")
              )
            )
            .returning({ id: appointments.id });

          if (updated.length === 0) {
            return { resolved: false, noShowDetected: false } as const;
          }

          const [event] = await tx
            .insert(appointmentEvents)
            .values({
              shopId: appointment.shopId,
              appointmentId: appointment.id,
              type: "outcome_resolved",
              occurredAt: resolvedAt,
              meta: {
                policyVersionId: appointment.policyVersionId ?? null,
                paymentId: appointment.paymentId ?? null,
                paymentStatus: appointment.paymentStatus ?? null,
                financialOutcome,
                resolutionReason,
              },
            })
            .onConflictDoNothing()
            .returning({ id: appointmentEvents.id });

          if (event?.id) {
            await tx
              .update(appointments)
              .set({ lastEventId: event.id, updatedAt: new Date() })
              .where(eq(appointments.id, appointment.id));
          }

          const shouldRecordNoShow =
            appointment.status === "booked" && financialOutcome === "voided";

          if (shouldRecordNoShow) {
            await detectAndRecordNoShow(tx, {
              customerId: appointment.customerId,
              shopId: appointment.shopId,
              noShowAt: appointment.endsAt,
            });
          }

          return {
            resolved: true,
            noShowDetected: shouldRecordNoShow,
          } as const;
        });

        if (outcome.resolved) {
          resolved += 1;
          if (outcome.noShowDetected) {
            noShowsDetected += 1;
          }
        } else {
          skipped += 1;
        }
      } catch (error) {
        errors.push(
          `Failed to resolve ${appointment.id}: ${(error as Error).message ?? "Unknown error"}`
        );
      }
    }

    const orphanedCancellations = await db
      .select({
        id: appointments.id,
        shopId: appointments.shopId,
        policyVersionId: appointments.policyVersionId,
        paymentId: payments.id,
        paymentStatus: payments.status,
        refundedAmountCents: payments.refundedAmountCents,
        stripeRefundId: payments.stripeRefundId,
      })
      .from(appointments)
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.status, "cancelled"),
          eq(appointments.financialOutcome, "unresolved")
        )
      )
      .limit(50);

    for (const appointment of orphanedCancellations) {
      try {
        const { financialOutcome, resolutionReason } = backfillCancelledOutcome({
          refundedAmountCents: appointment.refundedAmountCents ?? 0,
          stripeRefundId: appointment.stripeRefundId,
          paymentStatus: appointment.paymentStatus ?? null,
        });
        const resolvedAt = new Date();

        const didBackfill = await db.transaction(async (tx) => {
          const updated = await tx
            .update(appointments)
            .set({
              financialOutcome,
              resolvedAt,
              resolutionReason,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(appointments.id, appointment.id),
                eq(appointments.status, "cancelled"),
                eq(appointments.financialOutcome, "unresolved")
              )
            )
            .returning({ id: appointments.id });

          if (updated.length === 0) {
            return false;
          }

          const [event] = await tx
            .insert(appointmentEvents)
            .values({
              shopId: appointment.shopId,
              appointmentId: appointment.id,
              type: "outcome_resolved",
              occurredAt: resolvedAt,
              meta: {
                policyVersionId: appointment.policyVersionId ?? null,
                paymentId: appointment.paymentId ?? null,
                paymentStatus: appointment.paymentStatus ?? null,
                financialOutcome,
                resolutionReason,
                backfilled: true,
              },
            })
            .onConflictDoNothing()
            .returning({ id: appointmentEvents.id });

          if (event?.id) {
            await tx
              .update(appointments)
              .set({ lastEventId: event.id, updatedAt: new Date() })
              .where(eq(appointments.id, appointment.id));
          }

          return true;
        });

        if (didBackfill) {
          backfilled += 1;
        }
      } catch (error) {
        errors.push(
          `Failed to backfill ${appointment.id}: ${(error as Error).message ?? "Unknown error"}`
        );
      }
    }

    return Response.json({
      total: candidates.length,
      resolved,
      skipped,
      backfilled,
      noShowsDetected,
      errors,
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${lockId})`);
  }
}

async function detectAndRecordNoShow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    customerId: string;
    shopId: string;
    noShowAt: Date;
  }
): Promise<void> {
  const { customerId, shopId, noShowAt } = params;

  await tx
    .insert(customerNoShowStats)
    .values({
      customerId,
      shopId,
      totalAppointments: 1,
      noShowCount: 1,
      lateCancelCount: 0,
      onTimeCancelCount: 0,
      completedCount: 0,
      lastNoShowAt: noShowAt,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [customerNoShowStats.customerId, customerNoShowStats.shopId],
      set: {
        noShowCount: sql`${customerNoShowStats.noShowCount} + 1`,
        lastNoShowAt: noShowAt,
        updatedAt: new Date(),
      },
    });
}
