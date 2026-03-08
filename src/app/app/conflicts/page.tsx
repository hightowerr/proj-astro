import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ConflictRow } from "@/components/conflicts/conflict-row";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getConflicts } from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function ConflictsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Calendar Conflicts</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to manage calendar conflicts.
        </p>
      </div>
    );
  }

  const [conflicts, settings] = await Promise.all([
    getConflicts(shop.id),
    getBookingSettingsForShop(shop.id),
  ]);
  const timezone = settings?.timezone ?? "UTC";
  const serializedConflicts = conflicts.map((conflict) => ({
    ...conflict,
    appointmentStartsAt: conflict.appointmentStartsAt.toISOString(),
    appointmentEndsAt: conflict.appointmentEndsAt.toISOString(),
    eventStart: conflict.eventStart.toISOString(),
    eventEnd: conflict.eventEnd.toISOString(),
    detectedAt: conflict.detectedAt.toISOString(),
  }));

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Appointments
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Calendar Conflicts</h1>
          <p className="text-sm text-muted-foreground">
            Resolve overlaps between booked appointments and Google Calendar events.
          </p>
        </div>
      </header>

      {serializedConflicts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No conflicts found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your appointments do not currently overlap with Google Calendar events.
          </p>
          <Link
            href="/app/appointments"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Appointments
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  {serializedConflicts.length} {serializedConflicts.length === 1 ? "conflict" : "conflicts"} detected
                </p>
                <p className="text-sm text-amber-700">
                  Keep an appointment to dismiss a false positive, or cancel it to free up
                  calendar time.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Appointment
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Calendar Event
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Detected
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {serializedConflicts.map((conflict) => (
                  <ConflictRow key={conflict.id} conflict={conflict} timezone={timezone} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
