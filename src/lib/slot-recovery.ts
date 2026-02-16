import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAppointment } from "@/lib/queries/appointments";
import { acquireLock, isInCooldown, releaseLock, setCooldown } from "@/lib/redis";
import {
  appointments,
  customerContactPrefs,
  customerScores,
  customers,
  payments,
  shopPolicies,
  shops,
  slotOffers,
  slotOpenings,
} from "@/lib/schema";
import { sendTwilioSms } from "@/lib/twilio";

const isDuplicateSlotOpeningError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: string; constraint?: string };
  return candidate.code === "23505" && candidate.constraint === "slot_openings_unique_slot";
};

const normalizeOrigin = (value: string) => value.replace(/\/$/, "");
const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

/**
 * Create a slot opening for a cancelled appointment.
 * This is non-blocking and should not break cancellation if insertion fails.
 */
export async function createSlotOpeningFromCancellation(
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect | null | undefined
): Promise<void> {
  if (!payment || payment.status !== "succeeded") {
    return;
  }

  if (appointment.startsAt <= new Date()) {
    return;
  }

  try {
    const [slotOpening] = await db
      .insert(slotOpenings)
      .values({
        shopId: appointment.shopId,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        sourceAppointmentId: appointment.id,
        status: "open",
      })
      .returning({ id: slotOpenings.id });

    if (!slotOpening) {
      console.error(`Slot opening insert returned no row for appointment ${appointment.id}`);
      return;
    }

    const appUrl = process.env.APP_URL;
    const internalSecret = process.env.INTERNAL_SECRET;
    if (!appUrl || !internalSecret) {
      console.warn("APP_URL or INTERNAL_SECRET not set - offer loop not triggered");
      return;
    }

    try {
      const response = await fetch(`${appUrl}/api/jobs/offer-loop`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ slotOpeningId: slotOpening.id }),
      });

      if (!response.ok) {
        console.error(
          `Offer loop trigger failed for slot opening ${slotOpening.id}: ${response.status}`
        );
      }
    } catch (error) {
      console.error(`Failed to trigger offer loop for slot opening ${slotOpening.id}:`, error);
    }
  } catch (error) {
    if (isDuplicateSlotOpeningError(error)) {
      console.warn(
        `Slot opening already exists for shop ${appointment.shopId} at ${appointment.startsAt.toISOString()}`
      );
      return;
    }

    console.error(`Failed to create slot opening for appointment ${appointment.id}:`, error);
  }
}

export interface EligibleCustomer {
  id: string;
  phone: string;
  fullName: string;
}

export function getTierSortPriority(
  tier: "top" | "neutral" | "risk" | null
): number {
  if (tier === "top") {
    return 1;
  }

  if (tier === "risk") {
    return 3;
  }

  return 2;
}

export function getEffectiveScore(score: number | null): number {
  return score ?? 50;
}

/**
 * Get eligible customers for a slot opening.
 *
 * Filters:
 * - sms_opt_in = true
 * - phone present
 * - no overlapping booked/pending appointment
 * - no prior offer for this slot
 * - not in Redis cooldown
 * - optionally excludes risk-tier customers per shop policy
 *
 * Ordering is deterministic:
 * - top tier first, then neutral/null tier, then risk tier
 * - within each tier: higher score first (null score defaults to 50)
 * - final tie-breaker by customer id ascending
 */
export async function getEligibleCustomers(
  slotOpening: typeof slotOpenings.$inferSelect
): Promise<EligibleCustomer[]> {
  const [shopPolicy] = await db
    .select({
      excludeRiskFromOffers: shopPolicies.excludeRiskFromOffers,
    })
    .from(shopPolicies)
    .where(eq(shopPolicies.shopId, slotOpening.shopId))
    .limit(1);

  const excludeRiskFromOffers = shopPolicy?.excludeRiskFromOffers ?? false;

  const candidates = await db
    .select({
      id: customers.id,
      phone: customers.phone,
      fullName: customers.fullName,
      tier: customerScores.tier,
      score: customerScores.score,
      computedAt: customerScores.computedAt,
    })
    .from(customers)
    .innerJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, customers.id),
        eq(customerScores.shopId, slotOpening.shopId)
      )
    )
    .leftJoin(
      slotOffers,
      and(eq(slotOffers.customerId, customers.id), eq(slotOffers.slotOpeningId, slotOpening.id))
    )
    .where(
      and(
        eq(customers.shopId, slotOpening.shopId),
        eq(customerContactPrefs.smsOptIn, true),
        isNull(slotOffers.id),
        sql`${customers.phone} <> ''`,
        excludeRiskFromOffers
          ? sql`(${customerScores.tier} is null or ${customerScores.tier} <> 'risk')`
          : sql`true`
      )
    )
    .orderBy(
      sql`case
        when ${customerScores.tier} = 'top' then 1
        when ${customerScores.tier} = 'neutral' or ${customerScores.tier} is null then 2
        when ${customerScores.tier} = 'risk' then 3
        else 2
      end`,
      sql`coalesce(${customerScores.score}, 50) desc`,
      sql`${customerScores.computedAt} desc nulls last`,
      asc(customers.id)
    )
    .limit(50);

  const eligible: EligibleCustomer[] = [];

  for (const candidate of candidates) {
    const overlapping = await db.query.appointments.findFirst({
      where: (table, { and: whereAnd, eq: whereEq, gt: whereGt, inArray, lt: whereLt }) =>
        whereAnd(
          whereEq(table.shopId, slotOpening.shopId),
          whereEq(table.customerId, candidate.id),
          inArray(table.status, ["booked", "pending"]),
          whereLt(table.startsAt, slotOpening.endsAt),
          whereGt(table.endsAt, slotOpening.startsAt)
        ),
    });

    if (!overlapping) {
      const inCooldown = await isInCooldown(candidate.id);
      if (inCooldown) {
        continue;
      }

      eligible.push({
        id: candidate.id,
        phone: candidate.phone,
        fullName: candidate.fullName,
      });
    }
  }

  return eligible;
}

/**
 * Send an offer SMS to a customer for a slot opening.
 *
 * Creates a slot_offer record with status='sent' and a 15-minute expiry.
 */
export async function sendOffer(
  slotOpening: typeof slotOpenings.$inferSelect,
  customer: EligibleCustomer
): Promise<void> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(slotOpening.startsAt);

  const message = `A slot opened: ${timeStr}. Reply YES to book. Deposit required.`;
  await sendTwilioSms({
    to: customer.phone,
    body: message,
  });

  await db
    .insert(slotOffers)
    .values({
      slotOpeningId: slotOpening.id,
      customerId: customer.id,
      channel: "sms",
      status: "sent",
      expiresAt,
    })
    .onConflictDoNothing();
}

export interface OpenOffer {
  offer: typeof slotOffers.$inferSelect;
  slotOpening: typeof slotOpenings.$inferSelect;
  customer: {
    id: string;
    phone: string;
    fullName: string;
    email: string;
  };
  shop: {
    id: string;
    slug: string;
  };
}

/**
 * Find the latest still-open offer for an inbound phone number.
 */
export async function findLatestOpenOffer(phone: string): Promise<OpenOffer | null> {
  const [result] = await db
    .select({
      offer: slotOffers,
      slotOpening: slotOpenings,
      customer: {
        id: customers.id,
        phone: customers.phone,
        fullName: customers.fullName,
        email: customers.email,
      },
      shop: {
        id: shops.id,
        slug: shops.slug,
      },
    })
    .from(slotOffers)
    .innerJoin(slotOpenings, eq(slotOpenings.id, slotOffers.slotOpeningId))
    .innerJoin(customers, eq(customers.id, slotOffers.customerId))
    .innerJoin(shops, eq(shops.id, slotOpenings.shopId))
    .where(
      and(
        eq(customers.phone, phone),
        eq(slotOffers.status, "sent"),
        eq(slotOpenings.status, "open"),
        gt(slotOffers.expiresAt, new Date())
      )
    )
    .orderBy(desc(slotOffers.sentAt))
    .limit(1);

  return result ?? null;
}

/**
 * Accept an open slot offer and create the replacement booking.
 *
 * V4 adds Redis lock and customer cooldown handling for concurrency safety.
 */
export async function acceptOffer(
  openOffer: OpenOffer
): Promise<{ bookingId: string; paymentUrl: string }> {
  const { offer, slotOpening, customer, shop } = openOffer;
  const lockKey = `slot_lock:${slotOpening.shopId}:${slotOpening.startsAt.toISOString()}`;
  const lock = await acquireLock(lockKey, 30);

  if (!lock.acquired) {
    throw new Error("SLOT_TAKEN");
  }

  try {
    const [fresh] = await db
      .select({
        slotStatus: slotOpenings.status,
        offerStatus: slotOffers.status,
      })
      .from(slotOpenings)
      .innerJoin(slotOffers, eq(slotOffers.id, offer.id))
      .where(and(eq(slotOpenings.id, slotOpening.id), eq(slotOffers.slotOpeningId, slotOpening.id)))
      .limit(1);

    if (!fresh || fresh.slotStatus !== "open" || fresh.offerStatus !== "sent") {
      throw new Error("SLOT_NO_LONGER_AVAILABLE");
    }

    const bookingBaseUrl = `${appOrigin}/book/${shop.slug}`;
    const booking = await createAppointment({
      shopId: slotOpening.shopId,
      startsAt: slotOpening.startsAt,
      customer: {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        smsOptIn: true,
      },
      source: "slot_recovery",
      sourceSlotOpeningId: slotOpening.id,
      bookingBaseUrl,
      paymentsEnabled: true,
    });

    const [updatedSlot] = await db
      .update(slotOpenings)
      .set({
        status: "filled",
        updatedAt: new Date(),
      })
      .where(and(eq(slotOpenings.id, slotOpening.id), eq(slotOpenings.status, "open")))
      .returning({ id: slotOpenings.id });

    if (!updatedSlot) {
      throw new Error("SLOT_NO_LONGER_AVAILABLE");
    }

    const [updatedOffer] = await db
      .update(slotOffers)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(slotOffers.id, offer.id), eq(slotOffers.status, "sent")))
      .returning({ id: slotOffers.id });

    if (!updatedOffer) {
      throw new Error("SLOT_NO_LONGER_AVAILABLE");
    }

    const paymentUrl = `${bookingBaseUrl}?appointment=${booking.appointment.id}`;
    const message = `Booking confirmed! Complete payment: ${paymentUrl}`;

    try {
      await sendTwilioSms({
        to: customer.phone,
        body: message,
      });
    } catch (error) {
      console.error(
        `Failed to send slot recovery confirmation SMS for appointment ${booking.appointment.id}:`,
        error
      );
    }

    await setCooldown(customer.id, 24 * 60 * 60);

    return {
      bookingId: booking.appointment.id,
      paymentUrl,
    };
  } finally {
    if (lock.lockId) {
      try {
        await releaseLock(lockKey, lock.lockId);
      } catch (error) {
        console.error("Failed to release slot recovery lock", { lockKey, error });
      }
    }
  }
}
