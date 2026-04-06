"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { bookingSettings } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

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
