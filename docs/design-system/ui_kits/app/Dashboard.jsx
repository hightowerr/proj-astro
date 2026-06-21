/* Dashboard screen — KPI summary cards + attention-required ledger. */
const D = window.AstroDesignSystem_424d7f;

function PageHeader({ title, sub }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontFamily: "var(--al-font)", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>{title}</h1>
      {sub ? <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>{sub}</p> : null}
    </div>
  );
}

function Kpi({ eyebrow, value, icon, foot }) {
  return (
    <article style={{ position: "relative", overflow: "hidden", borderRadius: 24, background: "var(--al-surface-container-lowest)", boxShadow: "var(--al-shadow-float)", padding: 24 }}>
      <div style={{ position: "absolute", top: 12, right: 12, opacity: .08, pointerEvents: "none" }}>
        <D.Icon name={icon} size={64} color="var(--al-primary)" fill />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55, marginBottom: 12 }}>{eyebrow}</div>
      <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 40, fontWeight: 700, color: "var(--al-primary)", letterSpacing: "-.02em" }}>{value}</div>
      {foot ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--al-on-surface-variant)" }}>{foot}</div> : null}
    </article>
  );
}

const ATTENTION = [
  { i: "TR", n: "Taylor Reed", s: "Colour correction", t: "risk", time: "2:00 PM", day: "Tue · Apr 28", amt: "£185", pay: "Pending", payV: "caution" },
  { i: "DK", n: "Dev Kapoor", s: "Gel infill + art", t: "risk", time: "4:30 PM", day: "Tue · Apr 28", amt: "£64", pay: "Unpaid", payV: "neutral" },
  { i: "MO", n: "Mara Olsen", s: "Lash lift", t: "neutral", time: "11:15 AM", day: "Wed · Apr 29", amt: "£72", pay: "Paid", payV: "positive" },
];

function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" sub="Monitor high-risk appointments and reliability trends for Atelier No. 9." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <Kpi eyebrow="Upcoming (30d)" value="48" icon="event_upcoming" />
        <Kpi eyebrow="High-risk clients" value="3" icon="warning" foot="In selected window" />
        <Kpi eyebrow="Deposits at risk" value="£312" icon="account_balance_wallet" />
        <Kpi eyebrow="Recovered (30d)" value="£540" icon="loyalty" foot="From 6 re-sold slots" />
      </div>

      <D.Sheet eyebrow="Needs attention" title="High-risk appointments" lede="Clients whose reliability score puts a deposit at risk this week." padded={false}>
        <div style={{
          display: "flex", gap: 14, padding: "14px 28px", background: "var(--al-surface-container-low)",
          fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6,
        }}>
          <div style={{ flex: "0 0 110px" }}>Time</div>
          <div style={{ flex: "1 1 220px" }}>Customer</div>
          <div style={{ flex: "0 0 120px" }}>Payment</div>
          <div style={{ flex: "0 0 90px" }}>Tier</div>
        </div>
        {ATTENTION.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "18px 28px", borderTop: i ? "1px solid var(--al-hairline)" : "none" }}>
            <div style={{ flex: "0 0 110px" }}>
              <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 700, color: "var(--al-primary)" }}>{r.time}</div>
              <div style={{ fontSize: 11, color: "var(--al-on-surface-variant)", opacity: .7, marginTop: 2, fontWeight: 600 }}>{r.day}</div>
            </div>
            <div style={{ flex: "1 1 220px", display: "flex", alignItems: "center", gap: 12 }}>
              <D.Avatar initials={r.i} tier={r.t} size={34} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>{r.n}</div>
                <div style={{ fontSize: 13, color: "var(--al-on-surface-variant)" }}>{r.s}</div>
              </div>
            </div>
            <div style={{ flex: "0 0 120px" }}>
              <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 700, color: "var(--al-primary)" }}>{r.amt}</div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", marginTop: 2, color: `var(--al-status-${r.payV})` }}>{r.pay}</div>
            </div>
            <div style={{ flex: "0 0 90px" }}>
              <D.StatusPill variant={r.t === "risk" ? "negative" : "neutral"}>{r.t === "risk" ? "Risk" : "Neutral"}</D.StatusPill>
            </div>
          </div>
        ))}
      </D.Sheet>
    </>
  );
}

Object.assign(window, { Dashboard });
