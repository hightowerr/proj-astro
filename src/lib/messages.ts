import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkReminderAlreadySent } from "@/lib/queries/messages";
import {
  messageDedup,
  messageLog,
  messageTemplates,
} from "@/lib/schema";
import { sendTwilioSms } from "@/lib/twilio";

const BOOKING_TEMPLATE_KEY = "booking_confirmation";
const DEFAULT_TEMPLATE_VERSION = 1;
const DEFAULT_TEMPLATE_BODY =
  "Booked with {{shop_name}}: {{date}} at {{time}} ({{timezone}}). Paid {{amount}}. Policy: see booking link. {{manage_link}}Reply STOP to opt out.";
const REMINDER_TEMPLATE_KEY = "appointment_reminder_24h";
const DEFAULT_REMINDER_TEMPLATE_VERSION = 1;
const DEFAULT_REMINDER_TEMPLATE_BODY =
  "Reminder: Your appointment tomorrow at {{time}} at {{shop_name}}. {{manage_link}}Reply STOP to opt out.";

const hashBody = (body: string) =>
  createHash("sha256").update(body).digest("hex");

const formatCurrency = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

const renderTemplate = (
  template: string,
  data: Record<string, string>
) => {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return data[key] ?? "";
  });
  return rendered.replace(/\s+/g, " ").trim();
};

const ensureBookingTemplate = async () => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, BOOKING_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      key: BOOKING_TEMPLATE_KEY,
      version: DEFAULT_TEMPLATE_VERSION,
      channel: "sms",
      bodyTemplate: DEFAULT_TEMPLATE_BODY,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const retry = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, BOOKING_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (retry.length === 0) {
    throw new Error("Message template missing");
  }

  return retry[0];
};

const ensureReminderTemplate = async () => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, REMINDER_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      key: REMINDER_TEMPLATE_KEY,
      version: DEFAULT_REMINDER_TEMPLATE_VERSION,
      channel: "sms",
      bodyTemplate: DEFAULT_REMINDER_TEMPLATE_BODY,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const retry = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, REMINDER_TEMPLATE_KEY))
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  if (retry.length === 0) {
    throw new Error("Reminder template missing");
  }

  return retry[0];
};

export const sendBookingConfirmationSMS = async (appointmentId: string) => {
  const appointment = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, appointmentId),
  });

  if (!appointment) return;

  const [customer, prefs, payment, shop, settings] = await Promise.all([
    db.query.customers.findFirst({
      where: (table, { eq }) => eq(table.id, appointment.customerId),
    }),
    db.query.customerContactPrefs.findFirst({
      where: (table, { eq }) => eq(table.customerId, appointment.customerId),
    }),
    db.query.payments.findFirst({
      where: (table, { eq }) => eq(table.appointmentId, appointment.id),
    }),
    db.query.shops.findFirst({
      where: (table, { eq }) => eq(table.id, appointment.shopId),
    }),
    db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, appointment.shopId),
    }),
  ]);

  if (!customer) return;

  const dedupKey = `${BOOKING_TEMPLATE_KEY}:${appointment.id}`;
  const inserted = await db
    .insert(messageDedup)
    .values({ dedupKey })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    return;
  }

  const template = await ensureBookingTemplate();
  if (!template) {
    throw new Error("Failed to load or create message template");
  }

  const timezone = settings?.timezone ?? "UTC";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeStyle: "short",
  });

  const amountLabel = payment
    ? formatCurrency(payment.amountCents, payment.currency)
    : "amount unavailable";
  const renderedBody = renderTemplate(template.bodyTemplate, {
    shop_name: shop?.name ?? "your shop",
    date: dateFormatter.format(appointment.startsAt),
    time: timeFormatter.format(appointment.startsAt),
    timezone,
    amount: amountLabel,
    manage_link: appointment.bookingUrl
      ? `Manage: ${appointment.bookingUrl} `
      : "",
  });
  const bodyHash = hashBody(renderedBody);

  const baseLog = {
    shopId: appointment.shopId,
    appointmentId: appointment.id,
    customerId: appointment.customerId,
    channel: "sms" as const,
    purpose: "booking_confirmation" as const,
    toPhone: customer.phone,
    provider: "twilio",
    bodyHash,
    templateId: template.id,
    templateKey: template.key,
    templateVersion: template.version,
    renderedBody,
    retryCount: 0,
  };

  if (!payment) {
    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      errorCode: "payment_missing",
      errorMessage: "Payment record missing",
    });
    return;
  }

  if (!prefs?.smsOptIn) {
    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      errorCode: "consent_missing",
      errorMessage: "SMS opt-in not found",
    });
    return;
  }

  try {
    const { sid } = await sendTwilioSms({
      to: customer.phone,
      body: renderedBody,
    });

    await db.insert(messageLog).values({
      ...baseLog,
      status: "sent",
      providerMessageId: sid,
      sentAt: new Date(),
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
  }
};

export type ReminderSendResult =
  | "sent"
  | "already_sent"
  | "consent_missing";

export const sendAppointmentReminderSMS = async (params: {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
}): Promise<ReminderSendResult> => {
  const {
    appointmentId,
    shopId,
    customerId,
    customerName,
    customerPhone,
    startsAt,
    bookingUrl,
    shopName,
    shopTimezone,
  } = params;

  const alreadySent = await checkReminderAlreadySent(appointmentId);
  if (alreadySent) {
    return "already_sent";
  }

  const prefs = await db.query.customerContactPrefs.findFirst({
    where: (table, { eq }) => eq(table.customerId, customerId),
  });

  const template = await ensureReminderTemplate();
  if (!template) {
    throw new Error("Failed to load or create reminder template");
  }

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimezone,
    dateStyle: "short",
    timeStyle: "short",
  });

  const renderedBody = renderTemplate(template.bodyTemplate, {
    customer_name: customerName,
    shop_name: shopName,
    time: timeFormatter.format(startsAt),
    manage_link: bookingUrl ? `Manage: ${bookingUrl} ` : "",
  });
  const bodyHash = hashBody(renderedBody);

  const baseLog = {
    shopId,
    appointmentId,
    customerId,
    channel: "sms" as const,
    purpose: "appointment_reminder_24h" as const,
    toPhone: customerPhone,
    provider: "twilio",
    bodyHash,
    templateId: template.id,
    templateKey: template.key,
    templateVersion: template.version,
    renderedBody,
    retryCount: 0,
  };

  if (!prefs?.smsOptIn) {
    await db.insert(messageLog).values({
      ...baseLog,
      status: "failed",
      errorCode: "consent_missing",
      errorMessage: "SMS opt-in not found",
    });
    return "consent_missing";
  }

  try {
    const { sid } = await sendTwilioSms({
      to: customerPhone,
      body: renderedBody,
    });

    await db.insert(messageLog).values({
      ...baseLog,
      status: "sent",
      providerMessageId: sid,
      sentAt: new Date(),
    });

    return "sent";
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

    throw error;
  }
};
