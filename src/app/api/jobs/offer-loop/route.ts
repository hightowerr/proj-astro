import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slotOpenings } from "@/lib/schema";
import { getEligibleCustomers, sendOffer } from "@/lib/slot-recovery";

export const runtime = "nodejs";

const INTERNAL_SECRET_HEADER = "x-internal-secret";

type OfferLoopBody = {
  slotOpeningId: string;
};

const parseBody = async (req: Request): Promise<OfferLoopBody | null> => {
  try {
    const body = (await req.json()) as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { slotOpeningId?: unknown }).slotOpeningId !== "string" ||
      (body as { slotOpeningId: string }).slotOpeningId.trim() === ""
    ) {
      return null;
    }

    return {
      slotOpeningId: (body as { slotOpeningId: string }).slotOpeningId,
    };
  } catch {
    return null;
  }
};

/**
 * Offer loop job: send an offer to the next eligible customer.
 *
 * Authentication: x-internal-secret header.
 */
export async function POST(req: Request) {
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json(
      { error: "INTERNAL_SECRET not configured" },
      { status: 500 }
    );
  }

  const provided = req.headers.get(INTERNAL_SECRET_HEADER);
  if (!provided || provided !== internalSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseBody(req);
  if (!body) {
    return Response.json(
      { error: "slotOpeningId required" },
      { status: 400 }
    );
  }

  const slotOpening = await db.query.slotOpenings.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.id, body.slotOpeningId),
  });

  if (!slotOpening) {
    return Response.json({ error: "Slot opening not found" }, { status: 404 });
  }

  if (slotOpening.status !== "open") {
    return Response.json({
      success: true,
      skipped: true,
      reason: `slot_status_${slotOpening.status}`,
    });
  }

  const eligibleCustomers = await getEligibleCustomers(slotOpening);
  if (eligibleCustomers.length === 0) {
    await db
      .update(slotOpenings)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(eq(slotOpenings.id, body.slotOpeningId), eq(slotOpenings.status, "open"))
      );

    return Response.json({
      success: true,
      completed: true,
      reason: "no_eligible_customers",
    });
  }

  const firstCustomer = eligibleCustomers[0];
  if (!firstCustomer) {
    return Response.json(
      { error: "No eligible customer selected" },
      { status: 500 }
    );
  }

  await sendOffer(slotOpening, firstCustomer);

  return Response.json({
    success: true,
    customerId: firstCustomer.id,
    customerPhone: firstCustomer.phone,
  });
}
