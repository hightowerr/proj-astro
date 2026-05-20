"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { bookingSettings, messageTemplates } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import {
  EMAIL_REMINDER_KEY,
  EMAIL_REMINDER_DEFAULTS,
  SMS_REMINDER_KEY,
  SMS_REMINDER_DEFAULTS,
} from "./template-constants";

const VALID_INTERVALS = ["10m", "1h", "2h", "4h", "24h", "48h", "1w"] as const;

const schema = z
  .array(z.enum(VALID_INTERVALS))
  .min(1, "Select at least one reminder interval")
  .max(3, "Maximum 3 reminder intervals allowed");

export async function updateReminderTimings(timings: unknown) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Shop not found");
  }

  const parsed = schema.parse(timings);

  await db
    .insert(bookingSettings)
    .values({
      shopId: shop.id,
      timezone: "UTC",
      slotMinutes: 60,
      reminderTimings: parsed,
    })
    .onConflictDoUpdate({
      target: bookingSettings.shopId,
      set: {
        reminderTimings: parsed,
      },
    });

  revalidatePath("/app/settings/reminders");
}

/* ── Email template server action ─────────────────────────── */

const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be 200 characters or fewer"),
  body: z.string().min(1, "Body is required"),
});

export async function updateEmailTemplate(subject: string, body: string) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Shop not found");
  }

  const parsed = emailTemplateSchema.parse({ subject, body });

  // Query the current max version for this key/channel pair
  const [latest] = await db
    .select({ version: messageTemplates.version })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, EMAIL_REMINDER_KEY),
        eq(messageTemplates.channel, "email"),
      ),
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  // Insert a new version row — never overwrite existing rows to preserve
  // message_log foreign-key references to prior versions.
  await db.insert(messageTemplates).values({
    key: EMAIL_REMINDER_KEY,
    version: nextVersion,
    channel: "email",
    subjectTemplate: parsed.subject,
    bodyTemplate: parsed.body,
  });

  revalidatePath("/app/settings/reminders");
}

/* ── Email template reset action ─────────────────────────── */

export async function resetEmailTemplate() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Query the current max version for this key/channel pair
  const [latest] = await db
    .select({ version: messageTemplates.version })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, EMAIL_REMINDER_KEY),
        eq(messageTemplates.channel, "email"),
      ),
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  // Insert a new version row with factory defaults — never overwrite existing
  // rows to preserve message_log foreign-key references to prior versions.
  await db.insert(messageTemplates).values({
    key: EMAIL_REMINDER_KEY,
    version: nextVersion,
    channel: "email",
    subjectTemplate: EMAIL_REMINDER_DEFAULTS.subjectTemplate,
    bodyTemplate: EMAIL_REMINDER_DEFAULTS.bodyTemplate,
  });

  revalidatePath("/app/settings/reminders");
}

/* ── SMS template server action ──────────────────────────── */

const smsTemplateSchema = z
  .string()
  .min(1, "Body is required")
  .max(320, "Body must be 320 characters or fewer (2 SMS segments max)");

export async function updateSmsTemplate(body: string) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Shop not found");
  }

  const parsed = smsTemplateSchema.parse(body);

  // Query the current max version for this key/channel pair
  const [latest] = await db
    .select({ version: messageTemplates.version })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, SMS_REMINDER_KEY),
        eq(messageTemplates.channel, "sms"),
      ),
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  // Insert a new version row — never overwrite existing rows to preserve
  // message_log foreign-key references to prior versions.
  await db.insert(messageTemplates).values({
    key: SMS_REMINDER_KEY,
    version: nextVersion,
    channel: "sms",
    bodyTemplate: parsed,
  });

  revalidatePath("/app/settings/reminders");
}

/* ── SMS template reset action ──────────────────────────── */

export async function resetSmsTemplate() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Query the current max version for this key/channel pair
  const [latest] = await db
    .select({ version: messageTemplates.version })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, SMS_REMINDER_KEY),
        eq(messageTemplates.channel, "sms"),
      ),
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  // Insert a new version row with factory defaults — never overwrite existing
  // rows to preserve message_log foreign-key references to prior versions.
  await db.insert(messageTemplates).values({
    key: SMS_REMINDER_KEY,
    version: nextVersion,
    channel: "sms",
    subjectTemplate: null,
    bodyTemplate: SMS_REMINDER_DEFAULTS.bodyTemplate,
  });

  revalidatePath("/app/settings/reminders");
}
