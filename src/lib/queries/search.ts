import { and, asc, eq, gte, ilike, inArray, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customerScores, customers, eventTypes } from "@/lib/schema";
import type { AppointmentSearchResult, CustomerSearchResult } from "@/types/search";

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

export async function searchAppointments(
  shopId: string,
  q: string
): Promise<AppointmentSearchResult[]> {
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pattern = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const textConditions = or(
    ilike(customers.fullName, pattern),
    ilike(customers.email, pattern),
    ilike(eventTypes.name, pattern),
    digits.length >= 4 ? like(customers.phone, `%${digits}`) : undefined
  )!;

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      customerName: customers.fullName,
      eventTypeName: eventTypes.name,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
    .where(
      and(
        eq(appointments.shopId, shopId),
        inArray(appointments.status, ["pending", "booked", "ended"]),
        gte(appointments.endsAt, windowStart),
        textConditions
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    status: row.status as "pending" | "booked" | "ended",
    customerName: row.customerName,
    eventTypeName: row.eventTypeName,
    href: `/app/appointments/${row.id}`,
  }));
}
