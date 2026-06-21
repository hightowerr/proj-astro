/* Customers screen — reliability roster with tier scoring. */
const C = window.AstroDesignSystem_424d7f;

const CUSTOMERS = [
  { i:"SM", n:"Sarah Mitchell", visits:24, score:98, tier:"top", last:"2 days ago" },
  { i:"PN", n:"Priya Nair", visits:18, score:95, tier:"top", last:"5 days ago" },
  { i:"JK", n:"Jordan Kerr", visits:11, score:82, tier:"neutral", last:"1 week ago" },
  { i:"EL", n:"Emma Lund", visits:9, score:76, tier:"neutral", last:"2 weeks ago" },
  { i:"DK", n:"Dev Kapoor", visits:6, score:48, tier:"risk", last:"3 weeks ago" },
  { i:"TR", n:"Taylor Reed", visits:4, score:34, tier:"risk", last:"1 month ago" },
];

const TIER_LABEL = { top: "Top", neutral: "Neutral", risk: "Risk" };
const TIER_VARIANT = { top: "positive", neutral: "neutral", risk: "negative" };

function Customers() {
  const [tier, setTier] = React.useState("all");
  const [hover, setHover] = React.useState(null);
  const rows = CUSTOMERS.filter(c => tier === "all" || c.tier === tier);
  return (
    <>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--al-font)", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>Customers</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>Reliability scoring across your client roster.</p>
      </div>

      {/* Tier distribution strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[["Top tier", CUSTOMERS.filter(c=>c.tier==="top").length, "positive"],
          ["Neutral", CUSTOMERS.filter(c=>c.tier==="neutral").length, "neutral"],
          ["At risk", CUSTOMERS.filter(c=>c.tier==="risk").length, "negative"]].map(([lab, ct, v]) => (
          <article key={lab} style={{ borderRadius: 24, background: "var(--al-surface-container-lowest)", boxShadow: "var(--al-shadow-float)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: `var(--al-status-${v})` }} />{lab}
            </div>
            <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 36, fontWeight: 700, color: "var(--al-primary)" }}>{ct}</div>
          </article>
        ))}
      </div>

      <C.Sheet padded={false}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--al-hairline)", background: "var(--al-background)" }}>
          <C.FilterPills value={tier} onChange={setTier}
            options={[{key:"all",label:"All"},{key:"top",label:"Top"},{key:"neutral",label:"Neutral"},{key:"risk",label:"Risk"}]} />
        </div>
        <div style={{ display: "flex", gap: 14, padding: "14px 24px", fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6, background: "var(--al-surface-container-low)" }}>
          <div style={{ flex: "1 1 220px" }}>Customer</div>
          <div style={{ flex: "0 0 110px" }}>Visits</div>
          <div style={{ flex: "0 0 130px" }}>Reliability</div>
          <div style={{ flex: "0 0 110px" }}>Tier</div>
          <div style={{ flex: "0 0 120px", textAlign: "right" }}>Last visit</div>
        </div>
        {rows.map((c, i) => (
          <div key={c.n} onMouseEnter={() => setHover(c.n)} onMouseLeave={() => setHover(null)}
            style={{ display: "flex", gap: 14, alignItems: "center", padding: "18px 24px", borderTop: i ? "1px solid var(--al-hairline)" : "none", background: hover === c.n ? "var(--al-background)" : "transparent", transition: "background var(--al-dur-instant) var(--al-ease)" }}>
            <div style={{ flex: "1 1 220px", display: "flex", alignItems: "center", gap: 12 }}>
              <C.Avatar initials={c.i} tier={c.tier} size={38} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>{c.n}</div>
            </div>
            <div style={{ flex: "0 0 110px", fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 700, color: "var(--al-primary)" }}>{c.visits}</div>
            <div style={{ flex: "0 0 130px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 56, height: 6, borderRadius: 9999, background: "var(--al-surface-container)", overflow: "hidden" }}>
                <div style={{ width: `${c.score}%`, height: "100%", borderRadius: 9999, background: `var(--al-status-${TIER_VARIANT[c.tier]})` }} />
              </div>
              <span style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: "var(--al-primary)" }}>{c.score}</span>
            </div>
            <div style={{ flex: "0 0 110px" }}>
              <C.StatusPill variant={TIER_VARIANT[c.tier]}>{TIER_LABEL[c.tier]}</C.StatusPill>
            </div>
            <div style={{ flex: "0 0 120px", textAlign: "right", fontSize: 13, color: "var(--al-on-surface-variant)" }}>{c.last}</div>
          </div>
        ))}
      </C.Sheet>
    </>
  );
}

Object.assign(window, { Customers });
