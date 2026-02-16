import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments, customers, slotOffers } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

export default async function SlotOpeningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Slot Opening</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to view slot recovery details.
        </p>
      </div>
    );
  }

  const { id } = await params;
  const [settings, slotRow, offers, recoveredBookings] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    db.query.slotOpenings.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(table.id, id), whereEq(table.shopId, shop.id)),
    }),
    db
      .select({
        id: slotOffers.id,
        status: slotOffers.status,
        sentAt: slotOffers.sentAt,
        expiresAt: slotOffers.expiresAt,
        acceptedAt: slotOffers.acceptedAt,
        customerName: customers.fullName,
        customerPhone: customers.phone,
      })
      .from(slotOffers)
      .innerJoin(customers, eq(customers.id, slotOffers.customerId))
      .where(eq(slotOffers.slotOpeningId, id))
      .orderBy(desc(slotOffers.sentAt)),
    db
      .select({
        id: appointments.id,
        status: appointments.status,
        paymentStatus: appointments.paymentStatus,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shop.id),
          eq(appointments.sourceSlotOpeningId, id)
        )
      )
      .orderBy(desc(appointments.createdAt)),
  ]);

  if (!slotRow) {
    notFound();
  }

  const timezone = settings?.timezone ?? "UTC";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <Link
          href="/app/appointments"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to appointments
        </Link>
        <h1 className="text-3xl font-semibold">Slot Opening</h1>
        <p className="text-sm text-muted-foreground">
          Recovery timeline for this cancelled slot.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Details</h2>
        <p className="text-lg font-semibold">
          {formatter.format(new Date(slotRow.startsAt))}
        </p>
        <p className="text-sm text-muted-foreground">
          Ends {formatter.format(new Date(slotRow.endsAt))} ({timezone})
        </p>
        <p className="text-sm">
          Status: <SlotStatusBadge status={slotRow.status} />
        </p>
        <p className="text-sm text-muted-foreground">
          Opened {formatter.format(new Date(slotRow.createdAt))}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recovered Bookings</h2>
        {recoveredBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recovered bookings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Appointment</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Payment</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recoveredBookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/appointments/${booking.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        View booking
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{booking.status}</td>
                    <td className="px-4 py-3 capitalize">{booking.paymentStatus}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatter.format(new Date(booking.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Offer History</h2>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers sent yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Sent</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{offer.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {offer.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <OfferStatusBadge status={offer.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatter.format(new Date(offer.sentAt))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatter.format(new Date(offer.expiresAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SlotStatusBadge({ status }: { status: "open" | "filled" | "expired" }) {
  const classes = {
    open: "bg-blue-100 text-blue-800",
    filled: "bg-green-100 text-green-800",
    expired: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function OfferStatusBadge({
  status,
}: {
  status: "sent" | "accepted" | "expired" | "declined";
}) {
  const classes = {
    sent: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    expired: "bg-muted text-muted-foreground",
    declined: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${classes[status]}`}
    >
      {status}
    </span>
  );
}
