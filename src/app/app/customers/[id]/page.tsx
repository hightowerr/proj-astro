import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments, payments } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

export default async function CustomerPaymentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-12 py-8">
        <h1 className="al-page-title">Customer</h1>
        <p className="al-lede">
          Create your shop to view customer history.
        </p>
      </div>
    );
  }

  const { id } = await params;
  const customer = await db.query.customers.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, id), eq(table.shopId, shop.id)),
  });

  if (!customer) {
    notFound();
  }

  const settings = await getBookingSettingsForShop(shop.id);
  const timezone = settings?.timezone ?? "UTC";

  const history = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      amountCents: payments.amountCents,
      currency: payments.currency,
      paymentProviderStatus: payments.status,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(
      and(eq(appointments.shopId, shop.id), eq(appointments.customerId, id))
    )
    .orderBy(desc(appointments.startsAt));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const formatCurrency = (amountCents?: number | null, currency?: string | null) => {
    if (amountCents == null || !currency) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  };

  return (
    <div className="container mx-auto px-12 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="al-page-title">{customer.fullName}</h1>
        <p className="al-lede">
          {customer.email ?? customer.phone}
        </p>
      </header>

      {history.length === 0 ? (
        <p className="text-sm text-al-on-surface-variant">
          No bookings yet for this customer.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.appointmentId} className="border-t">
                  <td className="px-4 py-3">
                    {formatter.format(new Date(entry.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">
                      {entry.paymentStatus}
                    </div>
                    <div className="text-xs text-al-on-surface-variant">
                      {entry.paymentProviderStatus ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(entry.amountCents, entry.currency)}
                  </td>
                  <td className="px-4 py-3 text-al-on-surface-variant">
                    {formatter.format(new Date(entry.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
