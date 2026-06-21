/* Marketing — FAQ accordion + closing navy CTA band + footer. */
const FC = window.AstroDesignSystem_424d7f;

const FAQ = [
  { q: "What happens if a client no-shows?", a: "Astro retains the deposit automatically and updates the client’s reliability score. Two or more no-shows within 90 days flags them as a risk client, so you can decide whether to accept future bookings from them." },
  { q: "Can clients cancel and get a refund?", a: "Cancelling before your cutoff window triggers a full automatic refund — no awkward conversations. After the cutoff, you keep the deposit. You set the cutoff (e.g. 24 hours) when you configure your policy." },
  { q: "How long does it take to get started?", a: "Most beauty professionals are live and taking bookings within 20 minutes. Set your availability, cancellation policy, and deposit amount, then share your booking link." },
  { q: "Is there a free trial?", a: "Yes — a 14-day free trial, no credit card required. Every feature is available during the trial, including smart client scoring, slot recovery, and Stripe deposits." },
  { q: "Can I cancel anytime?", a: "Astro is month-to-month, no contracts. Cancel from your account settings at any time. Your data is exported on request." },
  { q: "Which calendar and payment apps does Astro work with?", a: "Astro integrates with Google Calendar and processes payments via Stripe. SMS confirmations go out through Twilio. Additional integrations are on the roadmap." },
];

function Faq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-background)", padding: "96px 32px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>FAQ</div>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(30px, 5cqi, 40px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>Common questions</h2>
          <p style={{ margin: "12px 0 0", fontSize: 17, color: "var(--al-on-surface-variant)" }}>Everything you need to know about Astro.</p>
        </div>
        <div>
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderTop: i ? "1px solid var(--al-hairline)" : "none" }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  padding: "22px 0", border: 0, background: "transparent", cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: isOpen ? "var(--al-primary)" : "var(--al-on-surface)" }}>{item.q}</span>
                  <FC.Icon name="expand_more" size={22} color="var(--al-on-surface-variant)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform var(--al-dur-normal) var(--al-ease)" }} />
                </button>
                <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows var(--al-dur-normal) var(--al-ease)" }}>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ margin: 0, paddingBottom: 22, fontSize: 15, lineHeight: 1.6, color: "var(--al-on-surface-variant)" }}>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketingClose() {
  const links = ["How it works", "Features", "Pricing", "FAQ", "Privacy Policy", "Terms of Service", "Contact"];
  return (
    <>
      {/* Navy ledger CTA band */}
      <section className="m-pad-x" style={{ background: "var(--al-background)", padding: "0 32px 96px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--al-gradient-cta)", borderRadius: 32, padding: "72px 48px", textAlign: "center", boxShadow: "var(--al-shadow-cta)" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(32px, 5.4cqi, 46px)", fontWeight: 800, letterSpacing: "-.03em", color: "#fff", lineHeight: 1.05 }}>Your time is worth protecting</h2>
          <p style={{ margin: "18px auto 0", maxWidth: 480, fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,.7)" }}>
            Start your 14-day free trial. Be taking protected bookings in 20 minutes.
          </p>
          <div className="m-cta-actions" style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 32 }}>
            <button style={{ padding: "15px 28px", borderRadius: 12, border: 0, cursor: "pointer", fontFamily: "var(--al-font)", fontSize: 14, fontWeight: 800, background: "var(--al-secondary-container)", color: "var(--al-on-secondary-container)" }}>Start free trial</button>
            <button style={{ padding: "15px 28px", borderRadius: 12, cursor: "pointer", fontFamily: "var(--al-font)", fontSize: 14, fontWeight: 700, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}>Book a demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="m-pad-x" style={{ background: "var(--al-background)", borderTop: "1px solid var(--al-hairline)", padding: "48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--al-gradient-cta)", color: "#fff", display: "grid", placeItems: "center" }}>
              <FC.Icon name="dashboard_customize" size={19} fill color="#fff" />
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--al-primary)" }}>Astro</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 28px" }}>
            {links.map((l) => <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, color: "var(--al-on-surface-variant)", textDecoration: "none" }}>{l}</a>)}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--al-on-surface-variant)", opacity: .7 }}>© 2026 Astro. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

Object.assign(window, { Faq, MarketingClose });
