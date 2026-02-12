import { db } from "@/lib/db";
import { bookingSettings, shopHours, shops } from "@/lib/schema";

type DefaultConfig = {
  timezone: string;
  slotMinutes: number;
  openTime: string;
  closeTime: string;
};

const DEFAULT_CONFIG: DefaultConfig = {
  timezone: "UTC",
  slotMinutes: 60,
  openTime: "09:00",
  closeTime: "17:00",
};

type DbLike = Pick<typeof db, "query" | "insert">;

const ensureDefaults = async (
  tx: DbLike,
  shopId: string,
  config: DefaultConfig
) => {
  const existingSettings = await tx.query.bookingSettings.findFirst({
    where: (table, { eq }) => eq(table.shopId, shopId),
  });

  if (!existingSettings) {
    await tx
      .insert(bookingSettings)
      .values({
        shopId,
        timezone: config.timezone,
        slotMinutes: config.slotMinutes,
      })
      .onConflictDoNothing();
  }

  const hoursRows = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    shopId,
    dayOfWeek,
    openTime: config.openTime,
    closeTime: config.closeTime,
  }));

  await tx.insert(shopHours).values(hoursRows).onConflictDoNothing();
};

export const getShopByOwnerId = async (ownerUserId: string) => {
  return await db.query.shops.findFirst({
    where: (table, { eq }) => eq(table.ownerUserId, ownerUserId),
  });
};

export const getShopBySlug = async (slug: string) => {
  return await db.query.shops.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });
};

export const createShop = async (input: {
  ownerUserId: string;
  name: string;
  slug: string;
  status?: typeof shops.$inferInsert.status;
  timezone?: string;
  slotMinutes?: number;
  openTime?: string;
  closeTime?: string;
}) => {
  const config: DefaultConfig = {
    timezone: input.timezone ?? DEFAULT_CONFIG.timezone,
    slotMinutes: input.slotMinutes ?? DEFAULT_CONFIG.slotMinutes,
    openTime: input.openTime ?? DEFAULT_CONFIG.openTime,
    closeTime: input.closeTime ?? DEFAULT_CONFIG.closeTime,
  };

  return await db.transaction(async (tx) => {
    const existing = await tx.query.shops.findFirst({
      where: (table, { eq }) => eq(table.ownerUserId, input.ownerUserId),
    });

    if (existing) {
      await ensureDefaults(tx, existing.id, config);
      return existing;
    }

    const [created] = await tx
      .insert(shops)
      .values({
        ownerUserId: input.ownerUserId,
        name: input.name,
        slug: input.slug,
        status: input.status ?? "active",
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      const retry = await tx.query.shops.findFirst({
        where: (table, { eq }) => eq(table.ownerUserId, input.ownerUserId),
      });

      if (retry) {
        await ensureDefaults(tx, retry.id, config);
        return retry;
      }

      throw new Error("Shop could not be created");
    }

    await ensureDefaults(tx, created.id, config);
    return created;
  });
};
