import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, customerScores } from "@/lib/schema";
import type { ScoringStats, Tier } from "@/lib/scoring";

export interface CustomerWithScore {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
  score: number | null;
  tier: Tier | null;
  stats: ScoringStats | null;
  computedAt: Date | null;
}

/**
 * Lists customers with their latest reliability score for a single shop.
 * Customers without a computed score are included and sorted after scored customers.
 */
export async function listCustomersForShop(shopId: string): Promise<CustomerWithScore[]> {
  const rows = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      createdAt: customers.createdAt,
      score: customerScores.score,
      tier: customerScores.tier,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customers)
    .leftJoin(
      customerScores,
      and(eq(customerScores.customerId, customers.id), eq(customerScores.shopId, shopId))
    )
    .where(eq(customers.shopId, shopId))
    .orderBy(
      sql`CASE WHEN ${customerScores.score} IS NULL THEN 1 ELSE 0 END`,
      desc(customerScores.score),
      asc(customers.fullName)
    );

  return rows.map((row) => ({
    ...row,
    tier: row.tier ?? null,
    stats: row.stats ?? null,
    computedAt: row.computedAt ?? null,
  }));
}
