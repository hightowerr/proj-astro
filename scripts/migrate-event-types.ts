#!/usr/bin/env tsx

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, bookingSettings, eventTypes, shops } from "@/lib/schema";

async function main() {
  const allShops = await db.select({ id: shops.id }).from(shops);

  for (const shop of allShops) {
    const [settings, existingDefault] = await Promise.all([
      db
        .select({ slotMinutes: bookingSettings.slotMinutes })
        .from(bookingSettings)
        .where(eq(bookingSettings.shopId, shop.id))
        .then((rows) => rows[0] ?? null),
      db.query.eventTypes.findFirst({
        where: (table, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(table.shopId, shop.id), whereEq(table.isDefault, true)),
      }),
    ]);

    let defaultEventType = existingDefault;

    if (!defaultEventType) {
      [defaultEventType] = await db
        .insert(eventTypes)
        .values({
          shopId: shop.id,
          name: "Service",
          durationMinutes: settings?.slotMinutes ?? 60,
          bufferMinutes: 0,
          isHidden: false,
          isActive: true,
          isDefault: true,
          sortOrder: 0,
        })
        .returning();
    }

    if (!defaultEventType) {
      throw new Error(`Failed to create default event type for shop ${shop.id}`);
    }

    await db
      .update(appointments)
      .set({ eventTypeId: defaultEventType.id, updatedAt: new Date() })
      .where(
        and(eq(appointments.shopId, shop.id), isNull(appointments.eventTypeId))
      );

    console.log(
      `Shop ${shop.id}: ensured default event type and backfilled unassigned appointments`
    );
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to migrate event types:", error);
    process.exit(1);
  });
