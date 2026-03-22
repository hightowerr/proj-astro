import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendAppointmentReminderSMS } from "@/lib/messages";
import {
  appointmentEvents,
  appointments,
  bookingSettings,
  customerContactPrefs,
  customerScores,
  customers,
  messageLog,
  messageTemplates,
  payments,
  shops,
} from "@/lib/schema";
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";
import { sendTwilioSms } from "@/lib/twilio";

const CONFIRMATION_TEMPLATE_KEY = "appointment_confirmation_request";
const DEFAULT_TEMPLATE_VERSION = 1;
const DEFAULT_TEMPLATE_BODY =
  "Reply YES to confirm your appointment at {{shop_name}} on {{appointment_time}}. If we do not hear from you by {{deadline_time}}, it may be cancelled. {{manage_link}}Reply STOP to opt out.";

const hashBody = (body: string) =>
  createHash("sha256").update(body).digest("hex");

const renderTemplate = (template: string, data: Record<string, string>) => {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return data[key] ?? "";
  });

  return rendered.replace(/\s+/g, " ").trim();
};

const ensureConfirmationTemplate = async () => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, CONFIRMATION_TEMPLATE_KEY),
        eq(messageTemplates.channel, "sms")
      )
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      key: CONFIRMATION_TEMPLATE_KEY,
      version: DEFAULT_TEMPLATE_VERSION,
      channel: "sms",
      bodyTemplate: DEFAULT_TEMPLATE_BODY,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const retry = await db.query.messageTemplates.findFirst({
    where: (table, { and: whereAnd, eq: whereEq }) =>
      whereAnd(
        whereEq(table.key, CONFIRMATION_TEMPLATE_KEY),
        whereEq(table.channel, "sms")
      ),
    orderBy: (table, { desc }) => [desc(table.version)],
  });

  if (!retry) {
    throw new Error("Confirmation template missing");
  }

  return retry;
};

const loadAppointmentMessagingContext = async (appointmentId: string) => {
  return await db
    .select({
      appointmentId: appointments.id,
      shopId: appointments.shopId,
      customerId: appointments.customerId,
      status: appointments.status,
      startsAt: appointments.startsAt,
      bookingUrl: appointments.bookingUrl,
      confirmationStatus: appointments.confirmationStatus,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      shopName: shops.name,
      shopTimezone: bookingSettings.timezone,
      smsOptIn: customerContactPrefs.smsOptIn,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(shops, eq(shops.id, appointments.shopId))
    .leftJoin(bookingSettings, eq(bookingSettings.shopId, appointments.shopId))
    .leftJoin(customerContactPrefs, eq(customerContactPrefs.customerId, appointments.customerId))
    .where(eq(appointments.id, appointmentId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
};

export type ReminderRequestResult = Awaited<
  ReturnType<typeof sendAppointmentReminderSMS>
>;

export async function sendReminderSMS(
  appointmentId: string
): Promise<ReminderRequestResult> {
  const appointment = await loadAppointmentMessagingContext(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "booked") {
    throw new Error("Cannot send reminder for non-booked appointment");
  }

  return await sendAppointmentReminderSMS({
    appointmentId: appointment.appointmentId,
    shopId: appointment.shopId,
    customerId: appointment.customerId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    startsAt: appointment.startsAt,
    bookingUrl: appointment.bookingUrl,
    shopName: appointment.shopName,
    shopTimezone: appointment.shopTimezone ?? "UTC",
    reminderInterval: "24h",
  });
}

export async function sendConfirmationRequest(appointmentId: string) {
  const appointment = await loadAppointmentMessagingContext(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "booked") {
    throw new Error("Cannot send confirmation for non-booked appointment");
  }

  if (appointment.confirmationStatus === "confirmed") {
    throw new Error("Appointment is already confirmed");
  }

  if (appointment.confirmationStatus === "pending") {
    throw new Error("Confirmation request already pending");
  }

  const template = await ensureConfirmationTemplate();
  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const timezone = appointment.shopTimezone ?? "UTC";

  const appointmentFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const deadlineFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const renderedBody = renderTemplate(template.bodyTemplate, {
    shop_name: appointment.shopName,
    appointment_time: appointmentFormatter.format(appointment.startsAt),
    deadline_time: deadlineFormatter.format(deadline),
    manage_link: appointment.bookingUrl ? `Manage: ${appointment.bookingUrl} ` : "",
  });
  const bodyHash = hashBody(renderedBody);

  const baseLog = {
    shopId: appointment.shopId,
    appointmentId: appointment.appointmentId,
    customerId: appointment.customerId,
    channel: "sms" as const,
    purpose: "appointment_confirmation_request" as const,
    toPhone: appointment.customerPhone,
    provider: "twilio",
    bodyHash,
    templateId: template.id,
    templateKey: template.key,
    templateVersion: template.version,
    renderedBody,
    retryCount: 0,
  };

  if (!appointment.smsOptIn) {
    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      errorCode: "consent_missing",
      errorMessage: "SMS opt-in not found",
    });
    throw new Error("SMS opt-in not found");
  }

  const [claimedAppointment] = await db
    .update(appointments)
    .set({
      confirmationStatus: "pending",
      confirmationSentAt: now,
      confirmationDeadline: deadline,
    })
    .where(
      and(
        eq(appointments.id, appointment.appointmentId),
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "none")
      )
    )
    .returning({ id: appointments.id });

  if (!claimedAppointment) {
    throw new Error("Confirmation request already pending");
  }

  try {
    const { sid } = await sendTwilioSms({
      to: appointment.customerPhone,
      body: renderedBody,
    });

    await db.transaction(async (tx) => {
      await tx.insert(messageLog).values({
        ...baseLog,
        status: "sent",
        providerMessageId: sid,
        sentAt: now,
      });

      await tx
        .update(appointments)
        .set({
          confirmationStatus: "pending",
          confirmationSentAt: now,
          confirmationDeadline: deadline,
        })
        .where(eq(appointments.id, appointment.appointmentId));
    });
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string | number }).code)
        : undefined;

    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      retryCount: 1,
      errorCode,
      errorMessage: (error as Error).message ?? "SMS send failed",
    });
    await db
      .update(appointments)
      .set({
        confirmationStatus: "none",
        confirmationSentAt: null,
        confirmationDeadline: null,
      })
      .where(
        and(
          eq(appointments.id, appointment.appointmentId),
          eq(appointments.confirmationStatus, "pending")
        )
      );
    throw error;
  }

  return { success: true as const, status: "pending" as const };
}

const YES_PATTERN = /\byes\b/i;
const HIGH_RISK_SCORE_THRESHOLD = 40;
const HIGH_RISK_VOIDS_THRESHOLD = 2;

const isTestPaymentIntent = (paymentIntentId: string | null) =>
  Boolean(paymentIntentId && paymentIntentId.startsWith("pi_test_"));

const highRiskCondition = sql<boolean>`(
  ${customerScores.tier} = 'risk' OR
  ${customerScores.score} < ${HIGH_RISK_SCORE_THRESHOLD} OR
  COALESCE((${customerScores.stats} ->> 'voidedLast90Days')::int, 0) >= ${HIGH_RISK_VOIDS_THRESHOLD}
)`;

export async function findAppointmentsNeedingConfirmation(limit: number = 25) {
  const now = Date.now();
  const windowStart = new Date(now + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 48 * 60 * 60 * 1000);

  return await db
    .select({
      appointmentId: appointments.id,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(
      customerContactPrefs,
      eq(customerContactPrefs.customerId, appointments.customerId)
    )
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, appointments.customerId),
        eq(customerScores.shopId, appointments.shopId)
      )
    )
    .where(
      and(
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "none"),
        sql`${appointments.confirmationSentAt} IS NULL`,
        eq(customerContactPrefs.smsOptIn, true),
        gte(appointments.startsAt, windowStart),
        lte(appointments.startsAt, windowEnd),
        highRiskCondition
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(limit);
}

export async function findExpiredConfirmationAppointments(limit: number = 25) {
  const now = new Date();

  return await db
    .select({
      appointmentId: appointments.id,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "pending"),
        lte(appointments.confirmationDeadline, now)
      )
    )
    .orderBy(asc(appointments.confirmationDeadline), asc(appointments.startsAt))
    .limit(limit);
}

const issueRefundForExpiredConfirmation = async (
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect
) => {
  if (payment.stripeRefundId) {
    return {
      refundId: payment.stripeRefundId,
      amount: payment.refundedAmountCents || payment.amountCents,
    };
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("Payment intent missing for refund");
  }

  if (stripeIsMocked() || isTestPaymentIntent(payment.stripePaymentIntentId)) {
    return {
      refundId: `re_test_${appointment.id.replace(/-/g, "").slice(0, 24)}`,
      amount: payment.amountCents,
    };
  }

  const stripe = getStripeClient();
  const refund = await stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      amount: payment.amountCents,
      metadata: {
        appointmentId: appointment.id,
        reason: "confirmation_expired",
      },
    },
    {
      idempotencyKey: `refund-${appointment.id}`,
    }
  );

  return {
    refundId: refund.id,
    amount: payment.amountCents,
  };
};

export async function expirePendingConfirmation(appointmentId: string) {
  const [row] = await db
    .select({
      appointment: appointments,
      payment: payments,
    })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    throw new Error("Appointment not found");
  }

  if (
    row.appointment.status !== "booked" ||
    row.appointment.confirmationStatus !== "pending"
  ) {
    return { cancelled: false as const, reason: "not_pending" as const };
  }

  const refund =
    row.payment?.status === "succeeded"
      ? await issueRefundForExpiredConfirmation(row.appointment, row.payment)
      : null;
  const now = new Date();

  const updated = await db.transaction(async (tx) => {
    const [updatedAppointment] = await tx
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancellationSource: "system",
        confirmationStatus: "expired",
        confirmationDeadline: null,
        financialOutcome: refund ? "refunded" : "voided",
        resolutionReason: refund
          ? "confirmation_expired_refunded"
          : "confirmation_expired",
        resolvedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.status, "booked"),
          eq(appointments.confirmationStatus, "pending")
        )
      )
      .returning();

    if (!updatedAppointment) {
      return null;
    }

    if (row.payment && refund) {
      await tx
        .update(payments)
        .set({
          refundedAmountCents: refund.amount,
          stripeRefundId: refund.refundId,
          refundedAt: now,
          updatedAt: now,
        })
        .where(eq(payments.id, row.payment.id));
    }

    const [event] = await tx
      .insert(appointmentEvents)
      .values({
        shopId: row.appointment.shopId,
        appointmentId: row.appointment.id,
        type: "cancelled",
        occurredAt: now,
        meta: {
          reason: refund
            ? "confirmation_expired_refunded"
            : "confirmation_expired",
          cancelledAt: now.toISOString(),
          refundId: refund?.refundId ?? null,
          refundAmountCents: refund?.amount ?? 0,
        },
      })
      .returning({ id: appointmentEvents.id });

    if (event?.id) {
      await tx
        .update(appointments)
        .set({ lastEventId: event.id, updatedAt: now })
        .where(eq(appointments.id, row.appointment.id));
    }

    return updatedAppointment;
  });

  if (!updated) {
    return { cancelled: false as const, reason: "already_processed" as const };
  }

  await createSlotOpeningFromCancellation(updated, row.payment);

  return {
    cancelled: true as const,
    appointmentId: updated.id,
    refunded: Boolean(refund),
  };
}

export async function processConfirmationReply(
  phone: string,
  body: string
): Promise<
  | { matched: false }
  | {
      matched: true;
      appointmentId: string;
      replyMessage: string;
    }
> {
  if (!YES_PATTERN.test(body.trim())) {
    return { matched: false };
  }

  const now = new Date();

  const [appointmentToConfirm] = await db
    .select({
      appointmentId: appointments.id,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(
      and(
        eq(customers.phone, phone),
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "pending"),
        gt(appointments.confirmationDeadline, now),
        gt(appointments.startsAt, now)
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(1);

  if (!appointmentToConfirm) {
    return { matched: false };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      confirmationStatus: "confirmed",
      confirmationDeadline: null,
    })
    .where(
      and(
        eq(appointments.id, appointmentToConfirm.appointmentId),
        eq(appointments.status, "booked"),
        eq(appointments.confirmationStatus, "pending")
      )
    )
    .returning({ appointmentId: appointments.id });

  if (!updated) {
    return { matched: false };
  }

  return {
    matched: true,
    appointmentId: updated.appointmentId,
    replyMessage: "Thanks! Your appointment is confirmed.",
  };
}
