"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { eventTypes } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

const eventTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).nullable(),
  durationMinutes: z.number().int().positive().max(240, "Duration must be 240 minutes or less"),
  bufferMinutes: z.union([z.null(), z.literal(0), z.literal(5), z.literal(10)]),
  depositAmountCents: z.number().int().positive().nullable(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});

function parseOptionalCurrencyInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const dollars = Number.parseFloat(value);
  if (!Number.isFinite(dollars)) {
    return Number.NaN;
  }

  return Math.round(dollars * 100);
}

function parseEventTypeForm(formData: FormData) {
  const description = formData.get("description");
  const parsed = eventTypeSchema.safeParse({
    name: formData.get("name"),
    description:
      typeof description === "string" && description.trim() !== ""
        ? description
        : null,
    durationMinutes: Number(formData.get("durationMinutes")),
    bufferMinutes: (() => {
      const raw = formData.get("bufferMinutes");
      return typeof raw === "string" && raw !== "" ? Number(raw) : null;
    })(),
    depositAmountCents: parseOptionalCurrencyInput(
      formData.get("depositAmountCents")
    ),
    isHidden: formData.get("isHidden") === "on",
    isActive: formData.get("isActive") !== "off",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid event type data");
  }

  return parsed.data;
}

async function getAuthorizedShop() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    throw new Error("Unauthorized");
  }

  return shop;
}

async function validateDuration(shopId: string, durationMinutes: number) {
  const settings = await getBookingSettingsForShop(shopId);
  const slotMinutes = settings?.slotMinutes ?? 60;

  if (durationMinutes % slotMinutes !== 0) {
    throw new Error(`Duration must be a multiple of ${slotMinutes} minutes`);
  }
}

export async function createEventType(formData: FormData) {
  const shop = await getAuthorizedShop();
  const parsed = parseEventTypeForm(formData);

  await validateDuration(shop.id, parsed.durationMinutes);

  const [lastEventType] = await db
    .select({ sortOrder: eventTypes.sortOrder })
    .from(eventTypes)
    .where(eq(eventTypes.shopId, shop.id))
    .orderBy(desc(eventTypes.sortOrder))
    .limit(1);

  await db.insert(eventTypes).values({
    shopId: shop.id,
    ...parsed,
    isDefault: false,
    sortOrder: (lastEventType?.sortOrder ?? -1) + 1,
  });

  revalidatePath("/app/settings/services");
}

export async function updateEventType(id: string, formData: FormData) {
  const shop = await getAuthorizedShop();

  const existing = await db.query.eventTypes.findFirst({
    where: (table, { and, eq: whereEq }) =>
      and(whereEq(table.id, id), whereEq(table.shopId, shop.id)),
  });

  if (!existing) {
    throw new Error("Event type not found");
  }

  const parsed = parseEventTypeForm(formData);

  if (existing.isDefault && !parsed.isActive) {
    throw new Error("Cannot deactivate the default service");
  }

  await validateDuration(shop.id, parsed.durationMinutes);

  await db
    .update(eventTypes)
    .set({
      ...parsed,
      updatedAt: new Date(),
    })
    .where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");
}

export async function createDefaultEventType() {
  const shop = await getAuthorizedShop();
  const settings = await getBookingSettingsForShop(shop.id);
  const slotMinutes = settings?.slotMinutes ?? 60;

  const existing = await db.query.eventTypes.findFirst({
    where: (table, { and, eq: whereEq }) =>
      and(whereEq(table.shopId, shop.id), whereEq(table.isDefault, true)),
  });

  if (existing) {
    return;
  }

  await db.insert(eventTypes).values({
    shopId: shop.id,
    name: "Service",
    description: null,
    durationMinutes: slotMinutes,
    bufferMinutes: null,
    depositAmountCents: null,
    isHidden: false,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
  });

  revalidatePath("/app");
  revalidatePath("/app/settings/services");
}
