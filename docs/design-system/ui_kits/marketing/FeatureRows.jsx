/* Marketing — 3 alternating feature rows with editorial product vignettes + stat floats. */
const FR = window.AstroDesignSystem_424d7f;

function FloatCard({ value, label, style }) {
  return (
    <div className="m-float" style={{ position: "absolute", background: "var(--al-surface-container-lowest)", borderRadius: 16, boxShadow: "var(--al-shadow-menu)", padding: "14px 16px", maxWidth: 180, ...style }}>
      <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--al-primary)" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--al-on-surface-variant)", marginTop: 2, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

/* ── Vignette 1: client scoring card ─────────────────────────── */
function ScoringVignette() {
  const rows = [["SM","Sarah Mitchell",98,"top","positive","Top"],["JK","Jordan Kerr",82,"neutral","neutral","Neutral"],["TR","Taylor Reed",34,"risk","negative","Risk"]];
  return (
    <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: "22px 24px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55, marginBottom: 16 }}>Client reliability</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: i ? "1px solid var(--al-hairline)" : "none" }}>
          <FR.Avatar initials={r[0]} tier={r[3]} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>{r[1]}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
              <div style={{ width: 90, height: 6, borderRadius: 9999, background: "var(--al-surface-container)", overflow: "hidden" }}>
                <div style={{ width: r[2] + "%", height: "100%", background: `var(--al-status-${r[4]})` }} />
              </div>
              <span style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12, fontWeight: 700, color: "var(--al-primary)" }}>{r[2]}</span>
            </div>
          </div>
          <FR.StatusPill variant={r[4]}>{r[5]}</FR.StatusPill>
        </div>
      ))}
    </div>
  );
}

/* ── Vignette 2: slot recovery SMS ───────────────────────────── */
function RecoveryVignette() {
  return (
    <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--al-surface-container)", display: "grid", placeItems: "center" }}>
          <FR.Icon name="bolt" size={20} fill color="var(--al-primary)" />
        </span>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--al-primary)" }}>Slot recovery</div>
        <span style={{ marginLeft: "auto" }}><FR.StatusPill variant="caution" tinted={false}>Offer sent</FR.StatusPill></span>
      </div>
      <div style={{ borderRadius: 16, background: "var(--al-surface-container-low)", padding: 16, fontSize: 14, lineHeight: 1.5, color: "var(--al-on-surface)" }}>
        Hi Priya — a <strong style={{ color: "var(--al-primary)" }}>2:00 PM colour slot</strong> just opened this Tuesday. Reply <strong style={{ color: "var(--al-primary)" }}>YES</strong> in the next 30 min to claim it.
      </div>
      <div style={{ display: "flex", justifycontent: "flex-end", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--al-status-positive-bg)", color: "var(--al-status-positive)", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 700 }}>
          <FR.Icon name="check_circle" size={16} fill /> Priya replied YES · slot filled
        </div>
      </div>
    </div>
  );
}

/* ── Vignette 3: deposit receipt ─────────────────────────────── */
function DepositVignette() {
  const lines = [["Service","Colour correction"],["Deposit collected","£40.00"],["Method","Visa ·· 4242"],["Status","Paid at booking"]];
  return (
    <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>Deposit receipt</div>
        <FR.StatusPill variant="positive">Paid</FR.StatusPill>
      </div>
      <div style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 40, fontWeight: 800, letterSpacing: "-.02em", color: "var(--al-primary)" }}>£40.00</div>
      <div style={{ marginTop: 16 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid var(--al-hairline)" }}>
            <span style={{ fontSize: 13, color: "var(--al-on-surface-variant)" }}>{l[0]}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--al-on-surface)", fontVariantNumeric: "tabular-nums" }}>{l[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { eyebrow: "Client scoring", title: "Know your clients before they walk in", body: "Astro scores every client on show-up history, cancellation patterns, and deposit behaviour. Risk clients are flagged before they cost you money.", Vignette: ScoringVignette, floats: [{ value: "94%", label: "client show-up rate", style: { top: -18, right: -14 } }, { value: "3×", label: "fewer no-shows with risk flagging", style: { bottom: -20, left: -16 } }], flip: false },
  { eyebrow: "Slot recovery", title: "Never lose revenue when someone cancels", body: "When a booking is cancelled, Astro automatically offers the slot to your best available clients in priority order. Your calendar fills itself.", Vignette: RecoveryVignette, floats: [{ value: "8 min", label: "average time to fill a cancelled slot", style: { top: -18, left: -16 } }, { value: "£240", label: "avg. weekly recovery", style: { bottom: -20, right: -14 } }], flip: true },
  { eyebrow: "Deposits", title: "Get paid before they even show up", body: "Deposits are collected at booking time via Stripe. No-shows can’t cost you — you’ve already been paid. Refunds for eligible cancellations are automatic.", Vignette: DepositVignette, floats: [{ value: "£0", label: "owed after a no-show", style: { top: -18, right: -14 } }, { value: "100%", label: "deposit collection at booking", style: { bottom: -20, left: -16 } }], flip: false },
];

function FeatureRows() {
  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-background)", padding: "100px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 110 }}>
        {FEATURES.map((f, i) => {
          const text = (
            <div key="t" className="m-feat-text">
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>{f.eyebrow}</div>
              <h3 style={{ margin: "12px 0 0", fontSize: "clamp(26px, 4.4cqi, 34px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)", lineHeight: 1.1 }}>{f.title}</h3>
              <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "var(--al-on-surface-variant)", maxWidth: 440 }}>{f.body}</p>
            </div>
          );
          const art = (
            <div key="a" className="m-feat-art" style={{ position: "relative" }}>
              <f.Vignette />
              {f.floats.map((fl, j) => <FloatCard key={j} {...fl} />)}
            </div>
          );
          return (
            <div key={i} className="m-feat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
              {f.flip ? [art, text] : [text, art]}
            </div>
          );
        })}
      </div>
    </section>
  );
}

Object.assign(window, { FeatureRows });
