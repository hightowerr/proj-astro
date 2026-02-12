import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { backfillCancelledOutcome, resolveFinancialOutcome } from "@/lib/outcomes";
import {
  appointmentEvents,
  appointments,
  payments,
  shopPolicies,
} from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const LOCK_ID = 482173;

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

  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${LOCK_ID}) as locked, pg_backend_pid() as pid`
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
        paymentRequired: appointments.paymentRequired,
        policyVersionId: appointments.policyVersionId,
        endsAt: appointments.endsAt,
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
          ne(appointments.status, "cancelled"),
          sql`${appointments.endsAt} <= now() - (${shopPolicies.resolutionGraceMinutes} * interval '1 minute')`
        )
      )
      .orderBy(asc(appointments.endsAt))
      .limit(limit);

    let resolved = 0;
    let skipped = 0;
    let backfilled = 0;
    const errors: string[] = [];

    for (const appointment of candidates) {
      try {
        const { financialOutcome, resolutionReason } =
          resolveFinancialOutcome({
            paymentRequired: appointment.paymentRequired,
            paymentStatus: appointment.paymentStatus ?? null,
          });
        const resolvedAt = new Date();

        const didResolve = await db.transaction(async (tx) => {
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

        if (didResolve) {
          resolved += 1;
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
      errors,
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
