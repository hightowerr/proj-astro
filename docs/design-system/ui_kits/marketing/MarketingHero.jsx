/* Marketing — hero with editorial schedule preview (no stock photography). */
const MH = window.AstroDesignSystem_424d7f;

const HERO_DAYS = [["M",17],["T",18],["W",19],["T",20],["F",21],["S",22],["S",23]];
const HERO_ROWS = [
  { t: "09:00", i: "SM", n: "Sarah M.", s: "Balayage refresh", tier: "top", v: "positive", lab: "Top" },
  { t: "10:30", i: "JK", n: "Jordan K.", s: "Fade + beard sculpt", tier: "neutral", v: "neutral", lab: "Neutral" },
  { t: "14:00", i: "TR", n: "Taylor R.", s: "Colour correction", tier: "risk", v: "negative", lab: "Risk" },
];

function MetricChip({ label, value }) {
  return (
    <div style={{ flex: 1, background: "var(--al-surface-container-low)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6 }}>{label}</div>
      <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color: "var(--al-primary)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function MarketingHero() {
  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-background)", padding: "84px 32px 96px" }}>
      <div className="m-hero-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 64, alignItems: "center" }}>
        {/* Left */}
        <div>
          <MH.Badge variant="curator" style={{ letterSpacing: ".06em" }}>For salons, stylists & barbers</MH.Badge>
          <h1 style={{ margin: "22px 0 0", fontSize: "clamp(40px, 7cqi, 64px)", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-.03em", color: "var(--al-primary)" }}>
            Stop losing money to no-shows
          </h1>
          <p style={{ margin: "22px 0 0", maxWidth: 460, fontSize: 18, lineHeight: 1.55, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>
            Astro protects your income with smart client scoring, automated deposits, and instant slot recovery.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
            <MH.Button size="lg" iconRight="arrow_forward">Start free trial</MH.Button>
            <MH.Button size="lg" variant="ghost">See how it works</MH.Button>
          </div>
          <div className="m-hero-pills" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 26 }}>
            <div style={{ display: "flex" }}>
              {["SM","PN","JK","EL"].map((x, i) => (
                <span key={x} style={{ marginLeft: i ? -10 : 0, border: "2px solid var(--al-background)", borderRadius: 9999 }}>
                  <MH.Avatar initials={x} tier={i === 0 ? "top" : "neutral"} size={30} />
                </span>
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--al-on-surface-variant)" }}>Trusted by 500+ beauty professionals</span>
          </div>
        </div>

        {/* Right — schedule preview */}
        <div style={{ position: "relative" }}>
          <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--al-hairline)" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6 }}>Today · Apr 19</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--al-primary)", marginTop: 3 }}>Your day at a glance</div>
              </div>
              <MH.StatusPill variant="positive">Synced</MH.StatusPill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, padding: "14px 18px", borderBottom: "1px solid var(--al-hairline)" }}>
              {HERO_DAYS.map(([d, n], i) => {
                const active = i === 2;
                return (
                  <div key={i} style={{ borderRadius: 10, padding: "7px 0", textAlign: "center", background: active ? "var(--al-primary)" : "var(--al-surface-container-low)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: active ? "rgba(255,255,255,.7)" : "var(--al-on-surface-variant)" }}>{d}</div>
                    <div style={{ fontFamily: "var(--al-font-mono)", fontSize: 12, fontWeight: 700, color: active ? "#fff" : "var(--al-primary)", marginTop: 2 }}>{n}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "8px 18px" }}>
              {HERO_ROWS.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 6px", borderTop: i ? "1px solid var(--al-hairline)" : "none" }}>
                  <div style={{ flex: "0 0 52px", fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: "var(--al-primary)" }}>{r.t}</div>
                  <MH.Avatar initials={r.i} tier={r.tier} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--al-on-surface)" }}>{r.n}</div>
                    <div style={{ fontSize: 12, color: "var(--al-on-surface-variant)" }}>{r.s}</div>
                  </div>
                  <MH.StatusPill variant={r.v}>{r.lab}</MH.StatusPill>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px 18px", borderTop: "1px solid var(--al-hairline)" }}>
              <MetricChip label="Booked" value="6/8" />
              <MetricChip label="Revenue" value="£462" />
              <MetricChip label="At risk" value="1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { MarketingHero });
