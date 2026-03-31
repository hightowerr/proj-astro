import { db } from "@/lib/db";

export async function getEventTypesForShop(
  shopId: string,
  filters?: { isActive?: boolean; isHidden?: boolean }
) {
  return db.query.eventTypes.findMany({
    where: (table, { and, eq }) =>
      and(
        eq(table.shopId, shopId),
        filters?.isActive !== undefined
          ? eq(table.isActive, filters.isActive)
          : undefined,
        filters?.isHidden !== undefined
          ? eq(table.isHidden, filters.isHidden)
          : undefined
      ),
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.createdAt)],
  });
}

export async function getEventTypeById(id: string) {
  return db.query.eventTypes.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}
