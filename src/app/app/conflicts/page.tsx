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

// --- icon -------------------------------------------------------------------

const Icon = ({ name }: { name: string }) => (
  <span
    className="material-symbols-outlined"
    style={{
      fontSize: 16,
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
    }}
  >
    {name}
  </span>
);

// --- page -------------------------------------------------------------------

export default async function ConflictsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div
        style={{
          fontFamily: "'Manrope', system-ui, sans-serif",
          padding: "40px 48px",
          background: "var(--al-background)",
          minHeight: "100vh",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, color: "#001e40" }}>
          Calendar Conflicts
        </div>
        <p style={{ color: "#43474f", marginTop: 8 }}>
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
    <div
      style={{
        padding: "32px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      {/* Back link */}
      <Link
        href="/app/appointments"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: "#43474f",
          textDecoration: "none",
          width: "fit-content",
          letterSpacing: ".02em",
        }}
      >
        <Icon name="arrow_back" />
        Back to appointments
      </Link>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap" as const,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "#43474f",
              opacity: 0.55,
            }}
          >
            Calendar sync {"\u00B7"} Google Calendar
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-.025em",
              color: "#001e40",
              lineHeight: 1.05,
            }}
          >
            Calendar conflicts
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#43474f",
              maxWidth: "58ch",
              lineHeight: 1.55,
            }}
          >
            Resolve overlaps between booked appointments and Google Calendar
            events {"\u2014"} keep, cancel, or reschedule to clear the schedule.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={{
              border: "1px solid rgba(195,198,209,.4)",
              background: "transparent",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "#43474f",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <Icon name="settings" />
            Sync settings
          </button>
          <button
            type="button"
            style={{
              border: "none",
              background: "linear-gradient(135deg, #001e40, #003366)",
              color: "#fff",
              padding: "13px 20px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 14px 28px rgba(0,30,64,.2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <Icon name="sync" />
            Sync now
          </button>
        </div>
      </div>

      {/* Ledger */}
      <ConflictsLedger conflicts={serializedConflicts} timezone={tz} />
    </div>
  );
}
