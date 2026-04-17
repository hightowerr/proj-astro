import { and, eq, ilike, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerScores, customers } from "@/lib/schema";
import type { CustomerSearchResult } from "@/types/search";

export async function searchCustomers(
  shopId: string,
  q: string
): Promise<CustomerSearchResult[]> {
  const pattern = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const textConditions = or(
    ilike(customers.fullName, pattern),
    ilike(customers.email, pattern),
    digits.length >= 4 ? like(customers.phone, `%${digits}`) : undefined
  )!;

  const rows = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      tier: customerScores.tier,
    })
    .from(customers)
    .leftJoin(
      customerScores,
      and(
        eq(customerScores.customerId, customers.id),
        eq(customerScores.shopId, shopId)
      )
    )
    .where(and(eq(customers.shopId, shopId), textConditions))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    tier: row.tier ?? null,
    href: `/app/customers/${row.id}`,
  }));
}
