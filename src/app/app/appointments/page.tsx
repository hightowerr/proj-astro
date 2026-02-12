import Link from "next/link";
import { ReconcilePaymentsButton } from "@/components/payments/reconcile-button";
import {
  getBookingSettingsForShop,
  getOutcomeSummaryForShop,
  listAppointmentsForShop,
} from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function AppointmentsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to start receiving bookings.
        </p>
      </div>
    );
  }

  const [settings, appointments, outcomeSummary] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    listAppointmentsForShop(shop.id),
    getOutcomeSummaryForShop(shop.id),
  ]);
  const timezone = settings?.timezone ?? "UTC";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const currencyFormatter = (
    amountCents?: number | null,
    currency?: string | null
  ) => {
    if (amountCents == null || !currency) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Recent and upcoming appointments for {shop.name}.
          </p>
        </div>
        <ReconcilePaymentsButton />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Settled (7d)
          </p>
          <p className="text-2xl font-semibold">{outcomeSummary.settled}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Voided (7d)
          </p>
          <p className="text-2xl font-semibold">{outcomeSummary.voided}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Unresolved (7d)
          </p>
          <p className="text-2xl font-semibold">{outcomeSummary.unresolved}</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent or upcoming appointments. Share your booking link to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Outcome</th>
                <th className="px-4 py-2 font-medium">Resolved</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-t">
                  <td className="px-4 py-3">
                    {formatter.format(new Date(appointment.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{appointment.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {appointment.customerEmail ?? appointment.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">
                      {appointment.paymentStatus}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currencyFormatter(
                        appointment.paymentAmountCents,
                        appointment.paymentCurrency
                      ) ?? (appointment.paymentRequired ? "—" : "No charge")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">
                      {appointment.financialOutcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {appointment.resolvedAt
                      ? formatter.format(new Date(appointment.resolvedAt))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatter.format(new Date(appointment.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/appointments/${appointment.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
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
