import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { checkReminderAlreadySent } from "@/lib/queries/messages";
import {
  messageDedup,
  messageLog,
  messageTemplates,
  messageChannelEnum,
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
const DEFAULT_EMAIL_REMINDER_SUBJECT_TEMPLATE =
  "Reminder: Your appointment tomorrow at {{shopName}}";
const DEFAULT_EMAIL_REMINDER_BODY_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <p>Hi {{customerName}},</p>
    <p>This is a reminder about your appointment tomorrow at {{shopName}}.</p>
    <p>Date: {{appointmentDate}}</p>
    <p>Time: {{appointmentTime}}</p>
    <p><a href="{{bookingUrl}}">Manage your booking</a></p>
  </body>
</html>
`.trim();

const hashBody = (body: string) =>
  createHash("sha256").update(body).digest("hex");

const formatCurrency = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

type MessageChannel = (typeof messageChannelEnum.enumValues)[number];
type MessagePurpose = typeof messageLog.$inferInsert.purpose;
type MessageStatus = typeof messageLog.$inferInsert.status;

type TemplateSeed = {
  subjectTemplate?: string | null;
  bodyTemplate: string;
};

export const renderTemplate = (
  template: string,
  data: Record<string, string>,
  options?: {
    collapseWhitespace?: boolean;
    missingValue?: "" | "preserve";
  }
) => {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    if (value != null) {
      return value;
    }

    return options?.missingValue === "" ? "" : `{{${key}}}`;
  });

  return options?.collapseWhitespace
    ? rendered.replace(/\s+/g, " ").trim()
    : rendered;
};

export const getOrCreateTemplate = async (
  key: string,
  channel: MessageChannel,
  version: number,
  defaults?: TemplateSeed
) => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, key),
        eq(messageTemplates.channel, channel),
        eq(messageTemplates.version, version)
      )
    )
    .limit(1);

  const existingTemplate = existing[0];
  if (existingTemplate) {
    return existingTemplate;
  }

  if (!defaults) {
    throw new Error(`Message template missing: ${key}/${channel}/v${version}`);
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      key,
      version,
      channel,
      subjectTemplate: defaults.subjectTemplate ?? null,
      bodyTemplate: defaults.bodyTemplate,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const retry = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, key),
        eq(messageTemplates.channel, channel),
        eq(messageTemplates.version, version)
      )
    )
    .limit(1);

  const retryTemplate = retry[0];
  if (!retryTemplate) {
    throw new Error(`Message template missing: ${key}/${channel}/v${version}`);
  }

  return retryTemplate;
};

export const shouldSendMessage = async (
  _customerId: string,
  _purpose: MessagePurpose,
  _channel: MessageChannel,
  dedupKey: string
) => {
  const inserted = await db
    .insert(messageDedup)
    .values({ dedupKey })
    .onConflictDoNothing()
    .returning({ dedupKey: messageDedup.dedupKey });

  return inserted.length > 0;
};

export const logMessage = async (input: {
  shopId: string;
  appointmentId: string;
  customerId: string;
  purpose: MessagePurpose;
  channel: MessageChannel;
  recipient: string;
  provider: string;
  status: MessageStatus;
  renderedBody: string;
  templateId?: string | null;
  templateKey: string;
  templateVersion: number;
  externalMessageId?: string | null;
  retryCount?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
}) => {
  await db.insert(messageLog).values({
    shopId: input.shopId,
    appointmentId: input.appointmentId,
    customerId: input.customerId,
    channel: input.channel,
    purpose: input.purpose,
    toPhone: input.recipient,
    provider: input.provider,
    providerMessageId: input.externalMessageId ?? null,
    status: input.status,
    bodyHash: hashBody(input.renderedBody),
    templateId: input.templateId ?? null,
    templateKey: input.templateKey,
    templateVersion: input.templateVersion,
    renderedBody: input.renderedBody,
    retryCount: input.retryCount ?? 0,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    sentAt: input.sentAt ?? null,
  });
};

const getLatestTemplate = async (
  key: string,
  channel: MessageChannel,
  defaults: TemplateSeed,
  version = DEFAULT_TEMPLATE_VERSION
) => {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(eq(messageTemplates.key, key), eq(messageTemplates.channel, channel))
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const existingTemplate = existing[0];
  if (existingTemplate) {
    return existingTemplate;
  }

  return await getOrCreateTemplate(key, channel, version, defaults);
};

const ensureBookingTemplate = async () => {
  return await getLatestTemplate(
    BOOKING_TEMPLATE_KEY,
    "sms",
    { bodyTemplate: DEFAULT_TEMPLATE_BODY },
    DEFAULT_TEMPLATE_VERSION
  );
};

const ensureReminderTemplate = async () => {
  return await getLatestTemplate(
    REMINDER_TEMPLATE_KEY,
    "sms",
    { bodyTemplate: DEFAULT_REMINDER_TEMPLATE_BODY },
    DEFAULT_REMINDER_TEMPLATE_VERSION
  );
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
  }, { collapseWhitespace: true, missingValue: "" });
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
    console.warn("[booking-sms] consent_missing", {
      customerId: appointment.customerId,
      appointmentId: appointment.id,
      message: "Customer has not opted in to SMS. Set smsOptIn=true when creating bookings to enable SMS.",
    });

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

export type EmailReminderSendResult = "sent" | "already_sent";

export const sendAppointmentReminderEmail = async (params: {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;
}): Promise<EmailReminderSendResult> => {
  const {
    appointmentId,
    shopId,
    customerId,
    customerName,
    customerEmail,
    startsAt,
    endsAt,
    bookingUrl,
    shopName,
    shopTimezone,
    reminderInterval,
  } = params;

  const purpose = `appointment_reminder_${reminderInterval}` as MessagePurpose;
  const dedupKey = `${purpose}:email:${appointmentId}`;
  const sendAllowed = await shouldSendMessage(
    customerId,
    purpose,
    "email",
    dedupKey
  );

  if (!sendAllowed) {
    return "already_sent";
  }

  const template = await getOrCreateTemplate(
    REMINDER_TEMPLATE_KEY,
    "email",
    1,
    {
      subjectTemplate: DEFAULT_EMAIL_REMINDER_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_EMAIL_REMINDER_BODY_TEMPLATE,
    }
  );

  const appointmentDate = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimezone,
    dateStyle: "full",
  }).format(startsAt);
  const startTime = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimezone,
    timeStyle: "short",
  }).format(startsAt);
  const endTime = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimezone,
    timeStyle: "short",
  }).format(endsAt);

  const templateData = {
    customerName,
    shopName,
    appointmentDate,
    appointmentTime: `${startTime} - ${endTime}`,
    bookingUrl: bookingUrl ?? "",
  };

  const subject = renderTemplate(
    template.subjectTemplate ?? DEFAULT_EMAIL_REMINDER_SUBJECT_TEMPLATE,
    templateData,
    { missingValue: "" }
  );
  const renderedBody = renderTemplate(template.bodyTemplate, templateData, {
    missingValue: "",
  });

  const emailResult = await sendEmail({
    to: customerEmail,
    subject,
    html: renderedBody,
  });

  if (!emailResult.success) {
    await logMessage({
      shopId,
      appointmentId,
      customerId,
      purpose,
      channel: "email",
      recipient: customerEmail,
      provider: "resend",
      status: "failed",
      templateId: template.id,
      templateKey: template.key,
      templateVersion: template.version,
      renderedBody,
      retryCount: 1,
      errorMessage: emailResult.error ?? "Email send failed",
    });
    throw new Error(emailResult.error ?? "Email send failed");
  }

  await logMessage({
    shopId,
    appointmentId,
    customerId,
    purpose,
    channel: "email",
    recipient: customerEmail,
    provider: "resend",
    status: "sent",
    templateId: template.id,
    templateKey: template.key,
    templateVersion: template.version,
    renderedBody,
    externalMessageId: emailResult.messageId ?? null,
    sentAt: new Date(),
  });

  return "sent";
};

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
  reminderInterval: string;
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
    reminderInterval,
  } = params;

  const alreadySent = await checkReminderAlreadySent(
    appointmentId,
    reminderInterval,
    "sms"
  );
  if (alreadySent) {
    return "already_sent";
  }

  const purpose = `appointment_reminder_${reminderInterval}` as MessagePurpose;

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
  }, { collapseWhitespace: true, missingValue: "" });
  const bodyHash = hashBody(renderedBody);

  const baseLog = {
    shopId,
    appointmentId,
    customerId,
    channel: "sms" as const,
    purpose,
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
    console.warn("[reminder-sms] consent_missing", {
      customerId,
      appointmentId,
      message: "Customer has not opted in to SMS. Set smsOptIn=true when creating bookings to enable SMS.",
    });

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
