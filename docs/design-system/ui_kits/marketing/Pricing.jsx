/* Marketing — pricing (one plan, monthly/annual toggle). */
const PR = window.AstroDesignSystem_424d7f;

const PLAN_FEATURES = [
  "Unlimited bookings", "Smart client scoring", "Slot recovery automation", "Stripe deposit collection",
  "SMS confirmations", "Cancellation policy enforcement", "Business dashboard", "Email support",
];

function Pricing() {
  const [period, setPeriod] = React.useState("monthly");
  const price = period === "annual" ? Math.round(49 * 0.8) : 49;
  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-surface-container-low)", padding: "96px 32px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>Simple pricing</div>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(30px, 5cqi, 40px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>One plan. Full protection.</h2>
        </div>

        {/* toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 9999, background: "var(--al-surface-container)" }}>
            {["monthly", "annual"].map((v) => {
              const active = period === v;
              return (
                <button key={v} onClick={() => setPeriod(v)} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, border: 0, cursor: "pointer",
                  fontFamily: "var(--al-font)", fontSize: 13, fontWeight: 700, textTransform: "capitalize",
                  background: active ? "var(--al-primary)" : "transparent", color: active ? "#fff" : "var(--al-on-surface-variant)",
                  transition: "background var(--al-dur-fast) var(--al-ease)",
                }}>
                  {v}
                  {v === "annual" ? <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 9999, background: active ? "rgba(255,255,255,.16)" : "var(--al-secondary-container)", color: active ? "#fff" : "var(--al-on-secondary-container)" }}>Save 20%</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* card */}
        <div style={{ marginTop: 32, background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .6 }}>Astro Pro</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 60, lineHeight: 1, fontWeight: 800, letterSpacing: "-.03em", color: "var(--al-primary)" }}>${price}</span>
            <span style={{ marginBottom: 8, fontSize: 18, color: "var(--al-on-surface-variant)" }}>/mo</span>
          </div>
          <div style={{ height: 18, marginTop: 6, fontSize: 13, color: "var(--al-on-surface-variant)", opacity: .8 }}>{period === "annual" ? "billed annually" : ""}</div>
          <ul style={{ listStyle: "none", margin: "20px 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {PLAN_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PR.Icon name="check" size={18} color="var(--al-status-positive)" weight={600} />
                <span style={{ fontSize: 15, color: "var(--al-on-surface)" }}>{f}</span>
              </li>
            ))}
          </ul>
          <PR.Button size="lg" style={{ width: "100%" }}>Start free trial</PR.Button>
          <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 13, color: "var(--al-on-surface-variant)", opacity: .8 }}>No credit card required</p>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Pricing });
