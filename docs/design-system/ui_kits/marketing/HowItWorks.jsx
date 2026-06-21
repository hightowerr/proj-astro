/* Marketing — "How Astro works" 3-step band on a subtle sunken surface. */
const HIW = window.AstroDesignSystem_424d7f;

const STEPS = [
  { n: "01", icon: "menu_book", title: "Clients book and pay a deposit", body: "Share your booking link. Clients pick a time, pay a deposit upfront, and get an instant SMS confirmation." },
  { n: "02", icon: "verified_user", title: "Astro protects your schedule", body: "Risk clients are flagged automatically. Late cancellations keep your deposit — your time is never wasted." },
  { n: "03", icon: "autorenew", title: "Cancelled slots fill themselves", body: "When someone cancels, Astro offers the slot to your best clients. Your calendar stays full without you lifting a finger." },
];

function SectionKicker({ eyebrow, title, sub, align = "center" }) {
  return (
    <div style={{ textAlign: align, maxWidth: 640, margin: align === "center" ? "0 auto" : 0 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>{eyebrow}</div>
      <h2 style={{ margin: "12px 0 0", fontSize: "clamp(30px, 5cqi, 40px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>{title}</h2>
      {sub ? <p style={{ margin: "12px 0 0", fontSize: 17, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>{sub}</p> : null}
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-surface-container-low)", padding: "96px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionKicker eyebrow="How it works" title="How Astro works" sub="From booking to protected revenue — completely automated." />
        <div className="m-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 56 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 32 }}>
              <div style={{ fontFamily: "var(--al-font-mono)", fontSize: 64, lineHeight: 1, fontWeight: 800, color: "var(--al-primary)", opacity: .12 }}>{s.n}</div>
              <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "var(--al-surface-container)", margin: "18px 0 18px" }}>
                <HIW.Icon name={s.icon} size={24} fill color="var(--al-primary)" />
              </span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", color: "var(--al-primary)" }}>{s.title}</h3>
              <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "var(--al-on-surface-variant)" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { HowItWorks, SectionKicker });
