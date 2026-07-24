"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/session"

export async function getSubscriptionStatus() {
  const session = await requireAuth()
  const shop = await db.query.shops.findFirst({
    where: (table, { eq }) => eq(table.ownerUserId, session.user.id),
    columns: { subscriptionStatus: true },
  })
  return shop?.subscriptionStatus ?? null
}
