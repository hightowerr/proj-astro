"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseTimeToMinutes } from "@/lib/booking";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { bookingSettings, shopHours } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

const slotMinutesSchema = z.enum(["15", "30", "45", "60", "90", "120"]);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const validateTimezone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

export async function updateAvailabilitySettings(shopId: string, formData: FormData) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop || shop.id !== shopId) {
    throw new Error("Unauthorized");
  }

  const timezone = String(formData.get("timezone") ?? "").trim();
  const slotMinutesRaw = String(formData.get("slotMinutes") ?? "");
  const parsedSlotMinutes = slotMinutesSchema.safeParse(slotMinutesRaw);

  if (!timezone || !validateTimezone(timezone)) {
    throw new Error("Timezone must be a valid IANA timezone");
  }
  if (!parsedSlotMinutes.success) {
    throw new Error("Slot length is invalid");
  }

  const slotMinutes = Number.parseInt(parsedSlotMinutes.data, 10);
  const hoursToInsert: Array<{
    shopId: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
  }> = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const isClosed = formData.get(`day-${dayOfWeek}-closed`) === "on";
    if (isClosed) {
      continue;
    }

    const openTimeRaw = String(formData.get(`day-${dayOfWeek}-open`) ?? "");
    const closeTimeRaw = String(formData.get(`day-${dayOfWeek}-close`) ?? "");
    const parsedOpenTime = timeSchema.safeParse(openTimeRaw);
    const parsedCloseTime = timeSchema.safeParse(closeTimeRaw);

    if (!parsedOpenTime.success || !parsedCloseTime.success) {
      throw new Error("Open and close times must use HH:MM format");
    }

    const openMinutes = parseTimeToMinutes(parsedOpenTime.data);
    const closeMinutes = parseTimeToMinutes(parsedCloseTime.data);
    if (openMinutes >= closeMinutes) {
      throw new Error("Open time must be earlier than close time");
    }

    hoursToInsert.push({
      shopId,
      dayOfWeek,
      openTime: parsedOpenTime.data,
      closeTime: parsedCloseTime.data,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(bookingSettings)
      .values({
        shopId,
        timezone,
        slotMinutes,
      })
      .onConflictDoUpdate({
        target: bookingSettings.shopId,
        set: {
          timezone,
          slotMinutes,
        },
      });

    await tx.delete(shopHours).where(eq(shopHours.shopId, shopId));
    if (hoursToInsert.length > 0) {
      await tx.insert(shopHours).values(hoursToInsert);
    }
  });

  revalidatePath("/app/settings/availability");
  revalidatePath(`/book/${shop.slug}`);
}
