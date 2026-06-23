import Link from "next/link";
import { ConflictsLedger } from "@/components/conflicts/conflicts-ledger";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getConflicts } from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

// --- types ------------------------------------------------------------------

export type SerializedConflict = {
  id: string;
  appointmentId: string;
  appointmentStartsAt: string;
  appointmentEndsAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  calendarEventId: string;
  eventSummary: string | null;
  eventStart: string;
  eventEnd: string;
  severity: "full" | "high" | "partial" | "all_day";
  detectedAt: string;
  formattedAptTime: string;
  formattedAptDay: string;
  formattedEventTime: string;
  formattedDetected: string;
  formattedOverlap: string;
};

// --- helpers ----------------------------------------------------------------

function fmtTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function fmtDayShort(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${weekday} \u00B7 ${month} ${day}`;
}

function fmtDetected(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${month} ${day} \u00B7 ${hour}:${minute}`;
}

function fmtOverlap(
  aptStart: Date,
  aptEnd: Date,
  evtStart: Date,
  evtEnd: Date,
): string {
  const overlapStart = Math.max(aptStart.getTime(), evtStart.getTime());
  const overlapEnd = Math.min(aptEnd.getTime(), evtEnd.getTime());
  const overlapMins = Math.max(
    0,
    Math.round((overlapEnd - overlapStart) / 60000),
  );
  const aptMins = Math.round((aptEnd.getTime() - aptStart.getTime()) / 60000);
  return `${overlapMins}m of ${aptMins}m`;
}

// --- page -------------------------------------------------------------------

export default async function ConflictsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="al-page">
        <div className="al-page-title">Calendar Conflicts</div>
        <p className="al-lede">
          Create your shop to manage calendar conflicts.
        </p>
      </div>
    );
  }

  const [conflicts, settings] = await Promise.all([
    getConflicts(shop.id),
    getBookingSettingsForShop(shop.id),
  ]);

  const tz = settings?.timezone ?? "UTC";

  const serializedConflicts: SerializedConflict[] = conflicts.map((c) => ({
    id: c.id,
    appointmentId: c.appointmentId,
    appointmentStartsAt: c.appointmentStartsAt.toISOString(),
    appointmentEndsAt: c.appointmentEndsAt.toISOString(),
    customerName: c.customerName,
    customerEmail: c.customerEmail,
    customerPhone: c.customerPhone,
    calendarEventId: c.calendarEventId,
    eventSummary: c.eventSummary,
    eventStart: c.eventStart.toISOString(),
    eventEnd: c.eventEnd.toISOString(),
    severity: c.severity,
    detectedAt: c.detectedAt.toISOString(),
    formattedAptTime: `${fmtTime(c.appointmentStartsAt, tz)}\u2013${fmtTime(c.appointmentEndsAt, tz)}`,
    formattedAptDay: fmtDayShort(c.appointmentStartsAt, tz),
    formattedEventTime: `${fmtTime(c.eventStart, tz)}\u2013${fmtTime(c.eventEnd, tz)}`,
    formattedDetected: fmtDetected(c.detectedAt, tz),
    formattedOverlap: fmtOverlap(
      c.appointmentStartsAt,
      c.appointmentEndsAt,
      c.eventStart,
      c.eventEnd,
    ),
  }));

  return (
    <div className="al-page">
      {/* Back link */}
      <Link
        href="/app/appointments"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-al-on-surface-variant no-underline w-fit tracking-wide"
      >
        <span className="material-symbols-outlined text-base leading-none inline-flex items-center">arrow_back</span>
        Back to appointments
      </Link>

      {/* Page header */}
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <div className="al-eyebrow opacity-55">
            Calendar sync {"\u00B7"} Google Calendar
          </div>
          <div className="al-page-title">
            Calendar conflicts
          </div>
          <div className="al-lede max-w-[58ch]">
            Resolve overlaps between booked appointments and Google Calendar
            events {"\u2014"} keep, cancel, or reschedule to clear the schedule.
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            className="border border-al-outline-variant/40 bg-transparent px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-al-on-surface-variant cursor-pointer inline-flex items-center gap-1.5 font-[inherit]"
          >
            <span className="material-symbols-outlined text-base leading-none inline-flex items-center">settings</span>
            Sync settings
          </button>
          <button
            type="button"
            className="border-none bg-gradient-to-br from-[var(--al-primary)] to-[#003366] text-white px-5 py-[13px] rounded-xl text-[13px] font-bold cursor-pointer shadow-[0_14px_28px_rgba(0,30,64,.2)] inline-flex items-center gap-1.5 font-[inherit]"
          >
            <span className="material-symbols-outlined text-base leading-none inline-flex items-center">sync</span>
            Sync now
          </button>
        </div>
      </div>

      {/* Ledger */}
      <ConflictsLedger conflicts={serializedConflicts} timezone={tz} />
    </div>
  );
}
