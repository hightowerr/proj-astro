import type React from "react";
import Link from "next/link";
import { NoShowRiskBadge } from "@/components/appointments/no-show-risk-badge";
import { ConflictAlertBanner } from "@/components/conflicts/conflict-alert-banner";
import { ReconcilePaymentsButton } from "@/components/payments/reconcile-button";
import {
  getBookingSettingsForShop,
  getOutcomeSummaryForShop,
  listSlotOpeningsForShop,
  listAppointmentsForShop,
} from "@/lib/queries/appointments";
import { getConflictCount } from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function AppointmentsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Appointments</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Create your shop to start receiving bookings.
        </p>
      </div>
    );
  }

  const [settings, appointments, outcomeSummary, slotOpenings, conflictCount] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    listAppointmentsForShop(shop.id),
    getOutcomeSummaryForShop(shop.id),
    listSlotOpeningsForShop(shop.id),
    getConflictCount(shop.id),
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
          <p className="text-sm text-[var(--color-text-secondary)]">
            Recent and upcoming appointments for {shop.name}.
          </p>
        </div>
        <ReconcilePaymentsButton />
      </header>

      <ConflictAlertBanner conflictCount={conflictCount} shopId={shop.id} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
            Settled (7d)
          </p>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-success)" }}>{outcomeSummary.settled}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
            Voided (7d)
          </p>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-error)" }}>{outcomeSummary.voided}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
            Unresolved (7d)
          </p>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{outcomeSummary.unresolved}</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No recent or upcoming appointments. Share your booking link to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border-default)" }}>
          <table className="w-full text-sm">
            <thead className="text-left" style={{ background: "var(--color-surface-overlay)" }}>
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Start</th>
                <th scope="col" className="px-4 py-2 font-medium">Customer</th>
                <th scope="col" className="px-4 py-2 font-medium">Service</th>
                <th scope="col" className="px-4 py-2 font-medium">Payment</th>
                <th scope="col" className="px-4 py-2 font-medium">Outcome</th>
                <th scope="col" className="px-4 py-2 font-medium">No-Show Risk</th>
                <th scope="col" className="px-4 py-2 font-medium">Resolved</th>
                <th scope="col" className="px-4 py-2 font-medium">Created</th>
                <th scope="col" className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} style={{ borderTop: "1px solid var(--color-border-hairline)" }}>
                  <td className="px-4 py-3">
                    {formatter.format(new Date(appointment.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{appointment.customerName}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {appointment.customerEmail ?? appointment.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {appointment.eventTypeName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">
                      {appointment.paymentStatus}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
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
                  <td className="px-4 py-3">
                    <NoShowRiskBadge
                      risk={appointment.noShowRisk}
                      score={appointment.noShowScore}
                      stats={
                        appointment.noShowStatsTotalAppointments !== null
                          ? {
                              completed: appointment.noShowStatsCompleted ?? 0,
                              noShows: appointment.noShowStatsNoShows ?? 0,
                              totalAppointments: appointment.noShowStatsTotalAppointments,
                            }
                          : null
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {appointment.resolvedAt
                      ? formatter.format(new Date(appointment.resolvedAt))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {formatter.format(new Date(appointment.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/appointments/${appointment.id}`}
                      className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
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

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Slot Recovery</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Recently opened slots and their recovery progress.
          </p>
        </div>

        {slotOpenings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No slot openings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border-default)" }}>
            <table className="w-full text-sm">
              <thead className="text-left" style={{ background: "var(--color-surface-overlay)" }}>
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Time</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 font-medium">Opened</th>
                  <th scope="col" className="px-4 py-2 font-medium">Recovered Booking</th>
                  <th scope="col" className="px-4 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {slotOpenings.map((slotOpening) => (
                  <tr key={slotOpening.id} style={{ borderTop: "1px solid var(--color-border-hairline)" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {formatter.format(new Date(slotOpening.startsAt))}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Ends {formatter.format(new Date(slotOpening.endsAt))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SlotStatusBadge status={slotOpening.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {formatter.format(new Date(slotOpening.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      {slotOpening.status === "filled" &&
                      slotOpening.recoveredAppointmentId ? (
                        <Link
                          href={`/app/appointments/${slotOpening.recoveredAppointmentId}`}
                          className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                        >
                          View booking
                        </Link>
                      ) : (
                        <span className="text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/slot-openings/${slotOpening.id}`}
                        className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                      >
                        View slot
                      </Link>
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
  const styles: Record<typeof status, React.CSSProperties> = {
    open: {
      background: "var(--color-brand-subtle)",
      color: "var(--color-brand)",
      border: "1px solid var(--color-brand-border)",
    },
    filled: {
      background: "var(--color-success-subtle)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success-border)",
    },
    expired: {
      background: "var(--color-surface-overlay)",
      color: "var(--color-text-tertiary)",
      border: "1px solid var(--color-border-subtle)",
    },
  };

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize"
      style={styles[status]}
    >
      {status}
    </span>
  );
}
