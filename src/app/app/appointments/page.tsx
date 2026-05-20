import Link from "next/link";
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
import { AppointmentsTable } from "./appointments-table";
import type { SerializedAppointment } from "./appointments-table";

// --- helpers ---------------------------------------------------------------

function fmtTime(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(d);
}

function fmtDay(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const month   = parts.find((p) => p.type === "month")?.value ?? "";
  const day     = parts.find((p) => p.type === "day")?.value ?? "";
  return `${weekday} \u00B7 ${month} ${day}`;
}

function fmtShort(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const month  = parts.find((p) => p.type === "month")?.value ?? "";
  const day    = parts.find((p) => p.type === "day")?.value ?? "";
  const hour   = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${month} ${day} \u00B7 ${hour}:${minute}`;
}

function fmtDate(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, month: "short", day: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day   = parts.find((p) => p.type === "day")?.value ?? "";
  return `${month} ${day}`;
}

function fmtCurrency(amountCents: number | null, currency: string | null, required: boolean) {
  if (amountCents == null || !currency) return required ? "\u2014" : "No charge";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
    .format(amountCents / 100);
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => (p[0] ?? "").toUpperCase()).join("");
}

function slotDuration(startsAt: Date, endsAt: Date) {
  const mins = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Maps DB no-show risk enum values (low/medium/high) to display tier labels
 * (top/neutral/risk) used by the Atelier Light Editorial A design.
 */
function mapNoShowRiskToTier(risk: string | null): "top" | "neutral" | "risk" | null {
  if (!risk) return null;
  if (risk === "low") return "top";
  if (risk === "medium") return "neutral";
  if (risk === "high") return "risk";
  return null;
}

// --- status color helpers --------------------------------------------------

const RECOVERY_STATUS = {
  open:    { bg: "rgba(201,122,42,0.10)", fg: "#c97a2a", label: "Open" },
  filled:  { bg: "rgba(14,122,85,0.10)",  fg: "#0e7a55", label: "Filled" },
  expired: { bg: "#eeeeec",               fg: "#43474f", label: "Expired" },
} as const;

// --- page ------------------------------------------------------------------

export default async function AppointmentsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div style={{ fontFamily: "var(--al-font)", padding: "40px 48px", background: "var(--al-background)", minHeight: "100vh" }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#001e40" }}>Appointments</div>
        <p style={{ color: "#43474f", marginTop: 8 }}>Create your shop to start receiving bookings.</p>
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

  const tz = settings?.timezone ?? "UTC";

  // Serialize appointments for client component
  const serializedRows: SerializedAppointment[] = appointments.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    paymentAmountCents: a.paymentAmountCents ?? null,
    paymentRequired: a.paymentRequired,
    noShowRisk: mapNoShowRiskToTier(a.noShowRisk),
    financialOutcome: a.financialOutcome,
    paymentStatus: a.paymentStatus,
    customerName: a.customerName,
    customerInitials: getInitials(a.customerName),
    eventTypeName: a.eventTypeName ?? null,
    formattedTime: fmtTime(a.startsAt, tz),
    formattedDay: fmtDay(a.startsAt, tz),
    formattedAmount: fmtCurrency(a.paymentAmountCents ?? null, a.paymentCurrency ?? null, a.paymentRequired),
    formattedResolved: a.resolvedAt ? fmtShort(a.resolvedAt, tz) : "\u2014",
    formattedCreated: fmtDate(a.createdAt, tz),
  }));

  const recoveredCount = slotOpenings.filter((s) => s.recoveredAppointmentId).length;

  // Inline section styles
  const sectionStyle = { display: "flex", flexDirection: "column" as const, gap: 14 };
  const sectionHeadStyle = { display: "flex", justifyContent: "space-between" as const, alignItems: "flex-end" as const, padding: "0 4px" };
  const cardSheetStyle = {
    background: "#ffffff",
    borderRadius: 24,
    overflow: "hidden" as const,
    boxShadow: "0 20px 40px rgba(26,28,27,0.04)",
  };

  return (
    <div style={{
      fontFamily: "var(--al-font)",
      background: "var(--al-background)",
      minHeight: "100vh",
      padding: "32px 48px",
      display: "flex",
      flexDirection: "column",
      gap: 28,
    }}>
      {/* Breadcrumb */}
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase",
        color: "#43474f", opacity: .65,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <span>Studio</span>
        <span style={{ opacity: .4 }}>/</span>
        <span style={{ color: "#001e40", opacity: 1 }}>Appointments</span>
      </div>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#43474f", opacity: .55 }}>
            Operations {"\u00B7"} Last 7 days
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.025em", color: "#001e40", lineHeight: 1.05 }}>
            Appointments
          </div>
          <div style={{ fontSize: 14, color: "#43474f", maxWidth: "52ch", lineHeight: 1.5 }}>
            Recent and upcoming appointments for {shop.name} {"\u2014"} revenue, refunds, recovered slots.
          </div>
        </div>
        <ReconcilePaymentsButton />
      </div>

      {/* Outcome cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {([
          { key: "settled",    label: "Settled \u00B7 7d",    color: "#0e7a55", count: outcomeSummary.settled ?? 0 },
          { key: "voided",     label: "Voided \u00B7 7d",     color: "#a8294a", count: outcomeSummary.voided ?? 0 },
          { key: "unresolved", label: "Unresolved \u00B7 7d", color: "#c97a2a", count: outcomeSummary.unresolved ?? 0 },
        ] as const).map((c) => (
          <div key={c.key} style={{ background: "#fff", borderRadius: 24, padding: "22px 26px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#43474f", opacity: .6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-.03em", color: c.color, lineHeight: 1, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
              {c.count}
            </div>
          </div>
        ))}
      </div>

      {/* Conflict banner */}
      <ConflictAlertBanner conflictCount={conflictCount} shopId={shop.id} />

      {/* Section A -- The ledger */}
      <section style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#43474f", opacity: .55 }}>
              The ledger
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "#001e40", margin: "4px 0 0", lineHeight: 1.1 }}>
              Recent appointments
            </h2>
            <div style={{ fontSize: 13, color: "#43474f", marginTop: 4, lineHeight: 1.5 }}>
              Recent, pending, and recently-ended. Last 7 days + upcoming.
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#43474f", opacity: .7, fontVariantNumeric: "tabular-nums", letterSpacing: ".02em", whiteSpace: "nowrap" as const }}>
            {appointments.length} {appointments.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        <div style={cardSheetStyle}>
          {appointments.length === 0 ? (
            <div style={{ padding: "72px 24px", textAlign: "center" }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: "#eeeeec", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 28, opacity: .5 }}>{"\uD83D\uDCC5"}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#001e40" }}>No appointments yet</div>
              <div style={{ fontSize: 13, color: "#43474f", marginTop: 6, maxWidth: 380, margin: "6px auto 0", lineHeight: 1.5 }}>
                Share your booking link or import existing appointments to get started.
              </div>
            </div>
          ) : (
            <AppointmentsTable rows={serializedRows} />
          )}
        </div>
      </section>

      {/* Section B -- Slot recovery */}
      <section style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#43474f", opacity: .55 }}>
              Income protection
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "#001e40", margin: "4px 0 0", lineHeight: 1.1 }}>
              Slot recovery
            </h2>
            <div style={{ fontSize: 13, color: "#43474f", marginTop: 4, lineHeight: 1.5 }}>
              Recently opened slots and their recovery progress.
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#43474f", opacity: .7, fontVariantNumeric: "tabular-nums", letterSpacing: ".02em", whiteSpace: "nowrap" as const }}>
            {slotOpenings.length === 0 ? "\u2014" : `${recoveredCount} of ${slotOpenings.length} recovered`}
          </div>
        </div>

        <div style={cardSheetStyle}>
          {slotOpenings.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#eeeeec", display: "inline-grid", placeItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 24, opacity: .5 }}>{"\uD83D\uDD04"}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#001e40" }}>No slots recovered yet</div>
              <div style={{ fontSize: 13, color: "#43474f", marginTop: 6, maxWidth: 380, margin: "6px auto 0", lineHeight: 1.5 }}>
                When a customer cancels, Astro offers their slot to another customer on the waitlist.
              </div>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 24px",
                fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase",
                color: "#43474f", opacity: .6,
                background: "#f4f4f2",
              }}>
                <div style={{ flex: "0 0 140px" }}>Slot time</div>
                <div style={{ flex: "0 0 80px" }}>Duration</div>
                <div style={{ flex: "0 0 100px" }}>Status</div>
                <div style={{ flex: "0 0 110px" }}>Opened</div>
                <div style={{ flex: "1 1 160px" }}>Recovery</div>
                <div style={{ flex: "0 0 36px" }} />
              </div>

              {slotOpenings.map((slot, i) => {
                const st = RECOVERY_STATUS[slot.status] ?? RECOVERY_STATUS.expired;
                const duration = slotDuration(slot.startsAt, slot.endsAt);
                return (
                  <div
                    key={slot.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "18px 24px",
                      borderTop: i === 0 ? "none" : "1px solid rgba(195,198,209,.20)",
                      transition: "background .12s",
                    }}
                  >
                    <div style={{ flex: "0 0 140px" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#001e40", fontVariantNumeric: "tabular-nums", letterSpacing: "-.01em" }}>
                        {fmtShort(slot.startsAt, tz)}
                      </div>
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <div style={{ fontSize: 12, color: "#43474f", fontWeight: 600 }}>{duration}</div>
                    </div>
                    <div style={{ flex: "0 0 100px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "5px 12px", borderRadius: 9999,
                        fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.fg,
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ flex: "0 0 110px" }}>
                      <div style={{ fontSize: 11, color: "#43474f", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                        {fmtShort(slot.createdAt, tz)}
                      </div>
                    </div>
                    <div style={{ flex: "1 1 160px" }}>
                      {slot.recoveredAppointmentId ? (
                        <Link
                          href={`/app/appointments/${slot.recoveredAppointmentId}`}
                          style={{ fontSize: 13, color: "#0e7a55", fontWeight: 700, textDecoration: "none", letterSpacing: "-.01em" }}
                        >
                          View booking {"\u2192"}
                        </Link>
                      ) : slot.status === "open" ? (
                        <span style={{ fontSize: 12, color: "#43474f", fontWeight: 600 }}>Awaiting recovery</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#43474f", opacity: .6 }}>Slot passed without recovery</span>
                      )}
                    </div>
                    <div style={{ flex: "0 0 36px", display: "flex", justifyContent: "flex-end" }}>
                      <Link
                        href={`/app/slot-openings/${slot.id}`}
                        style={{
                          width: 32, height: 32, borderRadius: 9999,
                          background: "#eeeeec",
                          display: "grid", placeItems: "center",
                          textDecoration: "none", color: "#001e40", fontSize: 14, opacity: .5,
                          transition: "opacity .15s",
                        }}
                        aria-label="View slot details"
                      >
                        {"\u2192"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      <div style={{ height: 48 }} />
    </div>
  );
}
