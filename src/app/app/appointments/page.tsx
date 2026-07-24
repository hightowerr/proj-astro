import Link from "next/link";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { ConflictAlertBanner } from "@/components/conflicts/conflict-alert-banner";
import { ReconcilePaymentsButton } from "@/components/payments/reconcile-button";
import { db } from "@/lib/db";
import {
  getBookingSettingsForShop,
  getOutcomeSummaryForShop,
  listSlotOpeningsForShop,
  listAppointmentsForShop,
} from "@/lib/queries/appointments";
import { getConflictCount } from "@/lib/queries/calendar-conflicts";
import { appointments } from "@/lib/schema";
import { requireShopAuth } from "@/lib/session";
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
  open:    { bg: "var(--al-status-caution-bg)", fg: "var(--al-status-caution)", label: "Open" },
  filled:  { bg: "var(--al-status-positive-bg)", fg: "var(--al-status-positive)", label: "Filled" },
  expired: { bg: "var(--al-surface-container)", fg: "var(--al-on-surface-variant)", label: "Expired" },
} as const;

// --- page ------------------------------------------------------------------

export default async function AppointmentsPage() {
  const { shop } = await requireShopAuth();

  const [settings, appointmentRows, outcomeSummary, slotOpenings, conflictCount, unprotectedResult] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    listAppointmentsForShop(shop.id),
    getOutcomeSummaryForShop(shop.id),
    listSlotOpeningsForShop(shop.id),
    getConflictCount(shop.id),
    shop.stripeOnboardingStatus !== "complete" && shop.stripeOnboardingStatus !== "suspended"
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              eq(appointments.shopId, shop.id),
              eq(appointments.status, "booked"),
              // Pre-migration fallback: depositSkipped IS NULL + paymentStatus = 'unpaid'
              // captures bookings created before the column existed.
              // Becomes inert once all pre-migration merchants complete Connect.
              or(
                eq(appointments.depositSkipped, "connect_not_complete"),
                and(
                  isNull(appointments.depositSkipped),
                  eq(appointments.paymentStatus, "unpaid")
                )
              )
            )
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  const unprotectedCount = unprotectedResult[0]?.count ?? 0;

  const tz = settings?.timezone ?? "UTC";

  // Serialize appointments for client component
  const serializedRows: SerializedAppointment[] = appointmentRows.map((a) => ({
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

  return (
    <div className="al-page">
      {/* Breadcrumb */}
      <div className="al-eyebrow flex gap-2.5 items-center">
        <span>Studio</span>
        <span className="opacity-40">/</span>
        <span className="text-al-primary opacity-100">Appointments</span>
      </div>

      {/* Page header */}
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <div className="al-eyebrow opacity-55">
            Operations {"\u00B7"} Last 7 days
          </div>
          <div className="al-page-title">
            Appointments
          </div>
          <div className="al-lede max-w-[52ch]">
            Recent and upcoming appointments for {shop.name} {"\u2014"} revenue, refunds, recovered slots.
          </div>
        </div>
        <ReconcilePaymentsButton />
      </div>

      {/* Outcome cards */}
      <div className="grid grid-cols-3 gap-3.5">
        {([
          { key: "settled",    label: "Settled \u00B7 7d",    colorClass: "text-[var(--al-status-positive)]", count: outcomeSummary.settled ?? 0 },
          { key: "voided",     label: "Voided \u00B7 7d",     colorClass: "text-[var(--al-status-negative)]", count: outcomeSummary.voided ?? 0 },
          { key: "unresolved", label: "Unresolved \u00B7 7d", colorClass: "text-[var(--al-status-caution)]",  count: outcomeSummary.unresolved ?? 0 },
        ] as const).map((c) => (
          <div key={c.key} className="al-card p-[22px_26px]">
            <div className="al-eyebrow opacity-60">
              {c.label}
            </div>
            <div className={`text-5xl font-extrabold tracking-tighter leading-none mt-2.5 tabular-nums al-mono ${c.colorClass}`}>
              {c.count}
            </div>
          </div>
        ))}
      </div>

      {/* Conflict banner */}
      <ConflictAlertBanner conflictCount={conflictCount} shopId={shop.id} />

      {/* Post-first-booking inline Connect prompt (spec 17) */}
      {unprotectedCount > 0 && shop.stripeOnboardingStatus !== "complete" && shop.stripeOnboardingStatus !== "suspended" && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(201,122,42,0.08)", border: "1px solid rgba(201,122,42,0.25)" }}
        >
          <p className="text-sm" style={{ color: "#7a4715" }}>
            {unprotectedCount === 1
              ? "This booking has no deposit."
              : `${unprotectedCount} bookings have no deposit.`}
          </p>
          <Link
            href="/app/settings/stripe-connect"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--al-status-caution, #b45309)" }}
          >
            Connect Stripe
            <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Section A -- The ledger */}
      <section className="flex flex-col gap-3.5">
        <div className="flex justify-between items-end px-1">
          <div>
            <div className="al-eyebrow opacity-55">
              The ledger
            </div>
            <h2 className="al-section-title mt-1">
              Recent appointments
            </h2>
            <div className="al-lede mt-1">
              Recent, pending, and recently-ended. Last 7 days + upcoming.
            </div>
          </div>
          <div className="text-[11px] font-bold text-al-on-surface-variant opacity-70 tabular-nums tracking-wide whitespace-nowrap">
            {appointmentRows.length} {appointmentRows.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        <div className="al-card">
          {appointmentRows.length === 0 ? (
            <div className="py-[72px] px-6 text-center">
              <div className="w-[54px] h-[54px] rounded-2xl bg-al-surface-container inline-grid place-items-center mb-4">
                <span className="text-[28px] opacity-50">{"\uD83D\uDCC5"}</span>
              </div>
              <div className="text-lg font-extrabold text-al-primary">No appointments yet</div>
              <div className="al-lede mt-1.5 max-w-[380px] mx-auto">
                Share your booking link or import existing appointments to get started.
              </div>
            </div>
          ) : (
            <AppointmentsTable rows={serializedRows} />
          )}
        </div>
      </section>

      {/* Section B -- Slot recovery */}
      <section className="flex flex-col gap-3.5">
        <div className="flex justify-between items-end px-1">
          <div>
            <div className="al-eyebrow opacity-55">
              Income protection
            </div>
            <h2 className="al-section-title mt-1">
              Slot recovery
            </h2>
            <div className="al-lede mt-1">
              Recently opened slots and their recovery progress.
            </div>
          </div>
          <div className="text-[11px] font-bold text-al-on-surface-variant opacity-70 tabular-nums tracking-wide whitespace-nowrap">
            {slotOpenings.length === 0 ? "\u2014" : `${recoveredCount} of ${slotOpenings.length} recovered`}
          </div>
        </div>

        <div className="al-card">
          {slotOpenings.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-[14px] bg-al-surface-container inline-grid place-items-center mb-3.5">
                <span className="text-2xl opacity-50">{"\uD83D\uDD04"}</span>
              </div>
              <div className="text-base font-extrabold text-al-primary">No slots recovered yet</div>
              <div className="al-lede mt-1.5 max-w-[380px] mx-auto">
                When a customer cancels, ShowUp offers their slot to another customer on the waitlist.
              </div>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-3.5 px-6 py-3.5 al-eyebrow opacity-60 bg-al-surface-container">
                <div className="flex-[0_0_140px]">Slot time</div>
                <div className="flex-[0_0_80px]">Duration</div>
                <div className="flex-[0_0_100px]">Status</div>
                <div className="flex-[0_0_110px]">Opened</div>
                <div className="flex-[1_1_160px]">Recovery</div>
                <div className="flex-[0_0_36px]" />
              </div>

              {slotOpenings.map((slot, i) => {
                const st = RECOVERY_STATUS[slot.status] ?? RECOVERY_STATUS.expired;
                const duration = slotDuration(slot.startsAt, slot.endsAt);
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3.5 px-6 py-[18px] transition-colors duration-100 ${
                      i > 0 ? "border-t border-al-outline-variant/20" : ""
                    }`}
                  >
                    <div className="flex-[0_0_140px]">
                      <div className="text-[13px] font-extrabold text-al-primary tabular-nums tracking-tight">
                        {fmtShort(slot.startsAt, tz)}
                      </div>
                    </div>
                    <div className="flex-[0_0_80px]">
                      <div className="text-xs text-al-on-surface-variant font-semibold">{duration}</div>
                    </div>
                    <div className="flex-[0_0_100px]">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-bold"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="flex-[0_0_110px]">
                      <div className="text-[11px] text-al-on-surface-variant tabular-nums font-medium">
                        {fmtShort(slot.createdAt, tz)}
                      </div>
                    </div>
                    <div className="flex-[1_1_160px]">
                      {slot.recoveredAppointmentId ? (
                        <Link
                          href={`/app/appointments/${slot.recoveredAppointmentId}`}
                          className="text-[13px] text-[var(--al-status-positive)] font-bold no-underline tracking-tight"
                        >
                          View booking {"\u2192"}
                        </Link>
                      ) : slot.status === "open" ? (
                        <span className="text-xs text-al-on-surface-variant font-semibold">Awaiting recovery</span>
                      ) : (
                        <span className="text-xs text-al-on-surface-variant opacity-60">Slot passed without recovery</span>
                      )}
                    </div>
                    <div className="flex-[0_0_36px] flex justify-end">
                      <Link
                        href={`/app/slot-openings/${slot.id}`}
                        className="w-8 h-8 rounded-full bg-al-surface-container grid place-items-center no-underline text-al-primary text-sm opacity-50 hover:opacity-100 transition-opacity"
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

      <div className="h-12" />
    </div>
  );
}
