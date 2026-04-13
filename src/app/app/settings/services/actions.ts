"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { eventTypes } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { MAX_SERVICE_DURATION_MINUTES } from "./constants";
import type { ServiceEditorValues, ServiceField } from "./types";

type ActionOk<T = void> = { ok: true; data: T };
type ActionFieldError = {
  ok: false;
  fieldErrors: Partial<Record<ServiceField, string>>;
};
type ActionError = { ok: false; error: string };
export type ActionResult<T = void> = ActionOk<T> | ActionFieldError | ActionError;

const VALID_SERVICE_FIELDS = new Set<string>([
  "name",
  "description",
  "durationMinutes",
  "bufferMinutes",
  "depositAmountCents",
  "isHidden",
  "isActive",
]);

const serviceEditorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(
      MAX_SERVICE_DURATION_MINUTES,
      `Duration must be ${MAX_SERVICE_DURATION_MINUTES} minutes or less`
    ),
  bufferMinutes: z.union([z.null(), z.literal(0), z.literal(5), z.literal(10)]),
  depositAmountCents: z
    .number()
    .int()
    .positive("Deposit must be a positive amount")
    .nullable(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});

function mapZodErrors(
  issues: z.ZodIssue[]
): Partial<Record<ServiceField, string>> {
  const fieldErrors: Partial<Record<ServiceField, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      VALID_SERVICE_FIELDS.has(key) &&
      !(key in fieldErrors)
    ) {
      fieldErrors[key as ServiceField] = issue.message;
    }
  }

  return fieldErrors;
}

function validateValues(values: ServiceEditorValues): ActionFieldError | null {
  const result = serviceEditorSchema.safeParse(values);
  if (!result.success) {
    return { ok: false, fieldErrors: mapZodErrors(result.error.issues) };
  }

  return null;
}

async function validateDuration(
  shopId: string,
  durationMinutes: number
): Promise<ActionFieldError | null> {
  const settings = await getBookingSettingsForShop(shopId);
  const slotMinutes = settings?.slotMinutes ?? 60;

  if (durationMinutes % slotMinutes !== 0) {
    return {
      ok: false,
      fieldErrors: {
        durationMinutes: `Duration must be a multiple of ${slotMinutes} minutes`,
      },
    };
  }

  return null;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formDataToValues(formData: FormData): ServiceEditorValues {
  const depositValue = getFormString(formData, "depositAmountCents").trim();
  const parsedDeposit = depositValue === "" ? null : Number.parseFloat(depositValue);

  return {
    name: getFormString(formData, "name").trim(),
    description: getFormString(formData, "description").trim(),
    durationMinutes: Number(getFormString(formData, "durationMinutes")),
    bufferMinutes: (() => {
      const raw = getFormString(formData, "bufferMinutes").trim();
      if (raw === "") {
        return null;
      }

      return Number(raw);
    })(),
    depositAmountCents:
      parsedDeposit === null || Number.isNaN(parsedDeposit)
        ? null
        : Math.round(parsedDeposit * 100),
    isHidden: getFormString(formData, "isHidden") === "on",
    isActive: getFormString(formData, "isActive") !== "off",
  };
}

async function getAuthorizedShop() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  return shop ?? null;
}

async function runCreateEventType(
  values: ServiceEditorValues
): Promise<ActionResult<{ id: string }>> {
  const shop = await getAuthorizedShop();
  if (!shop) {
    return { ok: false, error: "Unauthorized" };
  }

  const valuesError = validateValues(values);
  if (valuesError) {
    return valuesError;
  }

  const durationError = await validateDuration(shop.id, values.durationMinutes);
  if (durationError) {
    return durationError;
  }

  const [lastEventType] = await db
    .select({ sortOrder: eventTypes.sortOrder })
    .from(eventTypes)
    .where(eq(eventTypes.shopId, shop.id))
    .orderBy(desc(eventTypes.sortOrder))
    .limit(1);

  const createdRows = await db
    .insert(eventTypes)
    .values({
      shopId: shop.id,
      name: values.name,
      description: values.description || null,
      durationMinutes: values.durationMinutes,
      bufferMinutes: values.bufferMinutes,
      depositAmountCents: values.depositAmountCents,
      isHidden: values.isHidden,
      isActive: values.isActive,
      isDefault: false,
      sortOrder: (lastEventType?.sortOrder ?? -1) + 1,
    })
    .returning({ id: eventTypes.id });

  const created = createdRows[0];
  if (!created) {
    return { ok: false, error: "Service could not be created" };
  }

  revalidatePath("/app/settings/services");

  return { ok: true, data: { id: created.id } };
}

export async function createEventType(
  values: ServiceEditorValues
): Promise<ActionResult<{ id: string }>>;
export async function createEventType(formData: FormData): Promise<void>;
export async function createEventType(
  input: ServiceEditorValues | FormData
): Promise<ActionResult<{ id: string }> | void> {
  const isLegacyFormData = input instanceof FormData;
  const values = isLegacyFormData ? formDataToValues(input) : input;
  const result = await runCreateEventType(values);

  if (!isLegacyFormData) {
    return result;
  }

  if (!result.ok) {
    if ("fieldErrors" in result) {
      const firstFieldError = Object.values(result.fieldErrors)[0];
      throw new Error(firstFieldError ?? "Could not save service");
    }

    throw new Error(result.error);
  }
}

export async function updateEventType(
  id: string,
  values: ServiceEditorValues
): Promise<ActionResult> {
  const shop = await getAuthorizedShop();
  if (!shop) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await db.query.eventTypes.findFirst({
    where: (table, { and, eq: whereEq }) =>
      and(whereEq(table.id, id), whereEq(table.shopId, shop.id)),
  });

  if (!existing) {
    return { ok: false, error: "Service not found" };
  }

  const valuesError = validateValues(values);
  if (valuesError) {
    return valuesError;
  }

  if (existing.isDefault && !values.isActive) {
    return {
      ok: false,
      fieldErrors: { isActive: "Cannot deactivate the default service" },
    };
  }

  const durationError = await validateDuration(shop.id, values.durationMinutes);
  if (durationError) {
    return durationError;
  }

  await db
    .update(eventTypes)
    .set({
      name: values.name,
      description: values.description || null,
      durationMinutes: values.durationMinutes,
      bufferMinutes: values.bufferMinutes,
      depositAmountCents: values.depositAmountCents,
      isHidden: values.isHidden,
      isActive: values.isActive,
      updatedAt: new Date(),
    })
    .where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");

  return { ok: true, data: undefined };
}

export async function restoreEventType(id: string): Promise<ActionResult> {
  const shop = await getAuthorizedShop();
  if (!shop) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await db.query.eventTypes.findFirst({
    where: (table, { and, eq: whereEq }) =>
      and(whereEq(table.id, id), whereEq(table.shopId, shop.id)),
  });

  if (!existing) {
    return { ok: false, error: "Service not found" };
  }

  await db
    .update(eventTypes)
    .set({
      isHidden: false,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");

  return { ok: true, data: undefined };
}

export async function createDefaultEventType() {
  const shop = await getAuthorizedShop();
  if (!shop) {
    throw new Error("Unauthorized");
  }

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
