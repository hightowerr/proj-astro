"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type SerializedAppointment = {
  id: string;
  startsAt: string;          // ISO -- used for sort
  paymentAmountCents: number | null;
  paymentRequired: boolean;
  noShowRisk: "top" | "neutral" | "risk" | null;
  financialOutcome: "unresolved" | "settled" | "voided" | "refunded" | "disputed";
  paymentStatus: "unpaid" | "pending" | "paid" | "failed";
  // Pre-formatted by server (timezone-aware)
  customerName: string;
  customerInitials: string;
  eventTypeName: string | null;
  formattedTime: string;     // "09:00"
  formattedDay: string;      // "Tue . Apr 28"
  formattedAmount: string;   // "£185" or "No charge" or "---"
  formattedResolved: string; // "Apr 28 . 10:34" or "---"
  formattedCreated: string;  // "Apr 21"
};

const FILTERS = [
  { key: "all",        label: "All" },
  { key: "settled",    label: "Settled" },
  { key: "voided",     label: "Voided" },
  { key: "unresolved", label: "Unresolved" },
  { key: "risk",       label: "Risk only" },
] as const;

const SORTS = [
  { key: "time-desc",    label: "Newest first" },
  { key: "time-asc",    label: "Oldest first" },
  { key: "amount-desc", label: "Amount: high to low" },
  { key: "amount-asc",  label: "Amount: low to high" },
] as const;

function avatarStyle(risk: string | null): { background: string; color: string } {
  if (risk === "top") return { background: "linear-gradient(135deg,#d5e3ff,#a7c8ff)", color: "#001e40" };
  if (risk === "risk") return { background: "linear-gradient(135deg,var(--al-secondary-container),var(--al-secondary-fixed-dim))", color: "var(--al-tertiary-container)" };
  return { background: "#eeeeec", color: "#43474f" };
}

function RiskPill({ tier }: { tier: "top" | "neutral" | "risk" | null }) {
  if (!tier) return <span style={{ color: "#737780", fontSize: 12 }}>---</span>;
  const map = {
    top:     { bg: "rgba(14,122,85,0.10)",  fg: "#0e7a55", label: "Top" },
    neutral: { bg: "#eeeeec",               fg: "#43474f", label: "Neutral" },
    risk:    { bg: "rgba(168,41,74,0.10)",  fg: "#a8294a", label: "Risk" },
  };
  const s = map[tier];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 9999,
      fontSize: 10, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase",
      background: s.bg, color: s.fg,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 9999, background: s.fg, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function OutcomeDot({ outcome }: { outcome: SerializedAppointment["financialOutcome"] }) {
  const map: Record<string, { fg: string; label: string }> = {
    settled:    { fg: "#0e7a55", label: "Settled" },
    voided:     { fg: "#a8294a", label: "Voided" },
    unresolved: { fg: "#c97a2a", label: "Unresolved" },
    refunded:   { fg: "#43474f", label: "Refunded" },
    disputed:   { fg: "#a8294a", label: "Disputed" },
  };
  const s = map[outcome] ?? { fg: "#43474f", label: outcome };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: s.fg, fontWeight: 700, fontSize: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: s.fg, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function PaymentCell({ status, formattedAmount }: { status: SerializedAppointment["paymentStatus"]; formattedAmount: string }) {
  const statusMap: Record<string, { fg: string; label: string }> = {
    paid:    { fg: "#0e7a55", label: "Paid" },
    pending: { fg: "#c97a2a", label: "Pending" },
    unpaid:  { fg: "#43474f", label: "Unpaid" },
    failed:  { fg: "#a8294a", label: "Failed" },
  };
  const s = statusMap[status] ?? { fg: "#43474f", label: status };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#001e40", letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums" }}>
        {formattedAmount}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: s.fg, marginTop: 2 }}>
        {s.label}
      </div>
    </div>
  );
}

export function AppointmentsTable({ rows }: { rows: SerializedAppointment[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [sort, setSort] = useState<typeof SORTS[number]["key"]>("time-desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = [...rows];
    if (filter === "settled")    r = r.filter((x) => x.financialOutcome === "settled");
    else if (filter === "voided") r = r.filter((x) => x.financialOutcome === "voided");
    else if (filter === "unresolved") r = r.filter((x) => x.financialOutcome === "unresolved");
    else if (filter === "risk")  r = r.filter((x) => x.noShowRisk === "risk");

    r.sort((a, b) => {
      if (sort === "time-desc")    return a.startsAt < b.startsAt ? 1 : -1;
      if (sort === "time-asc")     return a.startsAt > b.startsAt ? 1 : -1;
      if (sort === "amount-desc")  return (b.paymentAmountCents ?? 0) - (a.paymentAmountCents ?? 0);
      if (sort === "amount-asc")   return (a.paymentAmountCents ?? 0) - (b.paymentAmountCents ?? 0);
      return 0;
    });
    return r;
  }, [rows, filter, sort]);

  return (
    <>
      {/* Filter + sort bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(195,198,209,.20)",
        background: "#f9f9f7",
      }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "8px 14px", borderRadius: 9999, border: 0,
                  background: active ? "#001e40" : "transparent",
                  fontFamily: "var(--al-font)",
                  fontSize: 12, fontWeight: 700,
                  color: active ? "#fff" : "#43474f",
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center",
                  transition: "background .15s, color .15s",
                }}
              >
                {f.label}
                {active && f.key !== "all" && (
                  <span style={{ marginLeft: 6, opacity: .6 }}>{"\u00B7"} {filtered.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            style={{
              padding: "8px 12px", borderRadius: 10,
              background: "#fff", border: "1px solid rgba(195,198,209,.30)",
              fontFamily: "var(--al-font)",
              fontSize: 12, fontWeight: 600, color: "#43474f",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 15 }}>{"\u2195"}</span>
            <span>{SORTS.find((s) => s.key === sort)?.label}</span>
            <span style={{ fontSize: 12, opacity: .6 }}>{"\u25BE"}</span>
          </button>
          {sortOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "#fff", borderRadius: 12, padding: 6, minWidth: 220,
              boxShadow: "0 20px 40px rgba(26,28,27,0.10)",
              border: "1px solid rgba(195,198,209,.20)",
              zIndex: 10,
            }}>
              {SORTS.map((s) => (
                <div
                  key={s.key}
                  onClick={() => { setSort(s.key); setSortOpen(false); }}
                  style={{
                    padding: "10px 12px", borderRadius: 8,
                    fontSize: 13, color: s.key === sort ? "#001e40" : "#43474f",
                    fontWeight: s.key === sort ? 700 : 400,
                    background: s.key === sort ? "#f4f4f2" : "transparent",
                    cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  {s.label}
                  {s.key === sort && <span>{"\u2713"}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 24px",
        fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase",
        color: "#43474f", opacity: .6,
        background: "#f4f4f2",
      }}>
        <div style={{ flex: "0 0 100px" }}>Time</div>
        <div style={{ flex: "1 1 200px" }}>Customer</div>
        <div style={{ flex: "1 1 180px" }}>Service</div>
        <div style={{ flex: "0 0 110px" }}>Payment</div>
        <div style={{ flex: "0 0 120px" }}>Outcome</div>
        <div style={{ flex: "0 0 90px" }}>Risk</div>
        <div style={{ flex: "0 0 120px", textAlign: "right" }}>Resolved</div>
        <div style={{ flex: "0 0 36px" }} />
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div style={{ padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 28, opacity: .35, marginBottom: 10 }}>{"\u2298"}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#001e40" }}>No appointments match this filter</div>
          <div style={{ marginTop: 4, color: "#43474f", fontSize: 13 }}>Try &quot;All&quot; or a different outcome.</div>
        </div>
      ) : (
        <div>
          {filtered.map((r, i) => {
            const av = avatarStyle(r.noShowRisk);
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "20px 24px",
                  background: hoverRow === r.id ? "#f9f9f7" : "transparent",
                  borderTop: i === 0 ? "none" : "1px solid rgba(195,198,209,.20)",
                  transition: "background .12s",
                }}
                onMouseEnter={() => setHoverRow(r.id)}
                onMouseLeave={() => setHoverRow(null)}
              >
                {/* Time */}
                <div style={{ flex: "0 0 100px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#001e40", letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums" }}>
                    {r.formattedTime}
                  </div>
                  <div style={{ fontSize: 11, color: "#43474f", opacity: .7, marginTop: 2, fontWeight: 600 }}>
                    {r.formattedDay}
                  </div>
                </div>

                {/* Customer */}
                <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9999,
                    background: av.background, color: av.color,
                    display: "grid", placeItems: "center",
                    fontSize: 12, fontWeight: 800, letterSpacing: ".04em",
                    flexShrink: 0,
                  }}>{r.customerInitials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1c1b", letterSpacing: "-.01em" }}>{r.customerName}</div>
                  </div>
                </div>

                {/* Service */}
                <div style={{ flex: "1 1 180px" }}>
                  <div style={{ fontSize: 14, color: "#1a1c1b", fontWeight: 600 }}>{r.eventTypeName ?? "---"}</div>
                </div>

                {/* Payment */}
                <div style={{ flex: "0 0 110px" }}>
                  <PaymentCell status={r.paymentStatus} formattedAmount={r.formattedAmount} />
                </div>

                {/* Outcome */}
                <div style={{ flex: "0 0 120px" }}>
                  <OutcomeDot outcome={r.financialOutcome} />
                </div>

                {/* Risk */}
                <div style={{ flex: "0 0 90px" }}>
                  <RiskPill tier={r.noShowRisk} />
                </div>

                {/* Resolved */}
                <div style={{ flex: "0 0 120px", textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#1a1c1b", fontVariantNumeric: "tabular-nums" }}>{r.formattedResolved}</div>
                  <div style={{ fontSize: 10, color: "#43474f", opacity: .6, marginTop: 2, fontWeight: 600, letterSpacing: ".04em" }}>
                    created {r.formattedCreated}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ flex: "0 0 36px", display: "flex", justifyContent: "flex-end" }}>
                  <Link
                    href={`/app/appointments/${r.id}`}
                    style={{
                      width: 32, height: 32, borderRadius: 9999,
                      background: "#eeeeec",
                      display: "grid", placeItems: "center",
                      opacity: hoverRow === r.id ? 1 : 0.45,
                      transition: "opacity .15s",
                      textDecoration: "none", color: "#001e40", fontSize: 14,
                    }}
                    aria-label={`View appointment for ${r.customerName}`}
                  >
                    {"\u2192"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
