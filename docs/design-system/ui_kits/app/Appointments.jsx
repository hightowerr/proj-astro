/* Appointments screen — the canonical Atelier Light ledger: filter pills + table. */
const A = window.AstroDesignSystem_424d7f;

const ROWS = [
  { id:1, i:"SM", n:"Sarah Mitchell", s:"Balayage refresh", time:"09:00", day:"Tue · Apr 28", amt:"£185", pay:"Paid", payV:"positive", out:"Settled", outV:"positive", tier:"top" },
  { id:2, i:"JK", n:"Jordan Kerr", s:"Fade + beard sculpt", time:"10:30", day:"Tue · Apr 28", amt:"£42", pay:"Paid", payV:"positive", out:"Settled", outV:"positive", tier:"neutral" },
  { id:3, i:"PN", n:"Priya Nair", s:"Gel infill + art", time:"12:15", day:"Tue · Apr 28", amt:"£64", pay:"Pending", payV:"caution", out:"Unresolved", outV:"caution", tier:"top" },
  { id:4, i:"TR", n:"Taylor Reed", s:"Colour correction", time:"14:00", day:"Tue · Apr 28", amt:"£185", pay:"Failed", payV:"negative", out:"Voided", outV:"negative", tier:"risk" },
  { id:5, i:"EL", n:"Emma Lund", s:"Blowout + toner", time:"15:30", day:"Tue · Apr 28", amt:"£58", pay:"Paid", payV:"positive", out:"Settled", outV:"positive", tier:"neutral" },
];

function SortMenu() {
  const [open, setOpen] = React.useState(false);
  const opts = ["Newest first", "Oldest first", "Amount: high to low"];
  const [sel, setSel] = React.useState(opts[0]);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: "8px 12px", borderRadius: 10, background: "#fff", border: "1px solid var(--al-hairline-rest)",
        fontFamily: "var(--al-font)", fontSize: 12, fontWeight: 600, color: "var(--al-on-surface-variant)",
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 15 }}>{"\u2195"}</span><span>{sel}</span><span style={{ opacity: .6 }}>{"\u25BE"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 12, padding: 6, minWidth: 210, boxShadow: "var(--al-shadow-menu)", border: "1px solid var(--al-hairline)", zIndex: 10 }}>
          {opts.map(o => (
            <div key={o} onClick={() => { setSel(o); setOpen(false); }} style={{
              padding: "10px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
              display: "flex", justifyContent: "space-between",
              color: o === sel ? "var(--al-primary)" : "var(--al-on-surface-variant)",
              fontWeight: o === sel ? 700 : 400, background: o === sel ? "var(--al-surface-container-low)" : "transparent",
            }}>{o}{o === sel && <span>{"\u2713"}</span>}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Appointments() {
  const [filter, setFilter] = React.useState("all");
  const [hover, setHover] = React.useState(null);
  const filtered = ROWS.filter(r =>
    filter === "all" ? true :
    filter === "risk" ? r.tier === "risk" :
    r.out.toLowerCase() === filter
  );
  return (
    <>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--al-font)", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>Appointments</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>
          <span style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums" }}>{filtered.length}</span> shown · last 7 days
        </p>
      </div>

      <A.Sheet padded={false}>
        {/* Filter + sort bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--al-hairline)", background: "var(--al-background)" }}>
          <A.FilterPills value={filter} onChange={setFilter}
            options={[{key:"all",label:"All"},{key:"settled",label:"Settled"},{key:"voided",label:"Voided"},{key:"unresolved",label:"Unresolved"},{key:"risk",label:"Risk only"}]}
            counts={{ settled: ROWS.filter(r=>r.out==="Settled").length, voided: 1, unresolved: 1, risk: 1 }} />
          <SortMenu />
        </div>
        {/* Column headers */}
        <div style={{ display: "flex", gap: 14, padding: "14px 24px", fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6, background: "var(--al-surface-container-low)" }}>
          <div style={{ flex: "0 0 100px" }}>Time</div>
          <div style={{ flex: "1 1 200px" }}>Customer</div>
          <div style={{ flex: "1 1 170px" }}>Service</div>
          <div style={{ flex: "0 0 110px" }}>Payment</div>
          <div style={{ flex: "0 0 120px" }}>Outcome</div>
          <div style={{ flex: "0 0 90px" }}>Risk</div>
          <div style={{ flex: "0 0 36px" }} />
        </div>
        {/* Rows */}
        {filtered.map((r, i) => (
          <div key={r.id} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
            style={{ display: "flex", gap: 14, alignItems: "center", padding: "20px 24px", borderTop: i ? "1px solid var(--al-hairline)" : "none", background: hover === r.id ? "var(--al-background)" : "transparent", transition: "background var(--al-dur-instant) var(--al-ease)" }}>
            <div style={{ flex: "0 0 100px" }}>
              <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 700, color: "var(--al-primary)" }}>{r.time}</div>
              <div style={{ fontSize: 11, color: "var(--al-on-surface-variant)", opacity: .7, marginTop: 2, fontWeight: 600 }}>{r.day}</div>
            </div>
            <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 12 }}>
              <A.Avatar initials={r.i} tier={r.tier} size={34} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>{r.n}</div>
            </div>
            <div style={{ flex: "1 1 170px", fontSize: 14, fontWeight: 600, color: "var(--al-on-surface)" }}>{r.s}</div>
            <div style={{ flex: "0 0 110px" }}>
              <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 700, color: "var(--al-primary)" }}>{r.amt}</div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", marginTop: 2, color: `var(--al-status-${r.payV})` }}>{r.pay}</div>
            </div>
            <div style={{ flex: "0 0 120px" }}>
              <A.StatusPill variant={r.outV} tinted={false}>{r.out}</A.StatusPill>
            </div>
            <div style={{ flex: "0 0 90px" }}>
              <A.StatusPill variant={r.tier === "top" ? "positive" : r.tier === "risk" ? "negative" : "neutral"}>{r.tier === "top" ? "Top" : r.tier === "risk" ? "Risk" : "Neutral"}</A.StatusPill>
            </div>
            <div style={{ flex: "0 0 36px", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ width: 32, height: 32, borderRadius: 9999, background: "var(--al-surface-container)", display: "grid", placeItems: "center", color: "var(--al-primary)", opacity: hover === r.id ? 1 : .45, transition: "opacity var(--al-dur-fast) var(--al-ease)" }}>{"\u2192"}</span>
            </div>
          </div>
        ))}
      </A.Sheet>
    </>
  );
}

Object.assign(window, { Appointments });
