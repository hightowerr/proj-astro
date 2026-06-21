/* Client-facing booking page — redesigned in Atelier Light. */
const BK = window.AstroDesignSystem_424d7f;

const SLOTS = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"];

function CheckBox({ checked, onChange }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{
        width: 20, height: 20, flexShrink: 0, marginTop: 1, borderRadius: 6, cursor: "pointer", padding: 0,
        display: "grid", placeItems: "center",
        background: checked ? "var(--al-primary)" : "#fff",
        border: `1px solid ${checked ? "var(--al-primary)" : "var(--al-hairline-strong)"}`,
        transition: "background var(--al-dur-fast) var(--al-ease), border-color var(--al-dur-fast) var(--al-ease)",
      }}>
      {checked ? <BK.Icon name="check" size={14} color="#fff" weight={700} /> : null}
    </button>
  );
}

function FieldLabel({ children, required }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, color: "var(--al-primary)", marginBottom: 8 }}>
      {children}{required ? <span style={{ color: "var(--al-status-negative)" }}>•</span> : null}
    </span>
  );
}

function PlainInput(props) {
  return (
    <input {...props} style={{
      width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12,
      background: "#fff", border: "1px solid var(--al-hairline-strong)", outline: "none",
      fontFamily: "var(--al-font)", fontSize: 15, fontWeight: 700, color: "var(--al-primary)",
    }} />
  );
}

function Booking() {
  const [date, setDate] = React.useState("2026-06-23");
  const [slot, setSlot] = React.useState("11:00 AM");
  const [sms, setSms] = React.useState(false);
  const [emailRem, setEmailRem] = React.useState(true);
  const [done, setDone] = React.useState(false);

  return (
    <section className="m-section m-pad-x" style={{ background: "var(--al-surface-container-low)", padding: "56px 32px 88px", minHeight: "70vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>Book an appointment</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "clamp(32px, 6cqi, 44px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--al-primary)" }}>Book with kicksnare</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>Free Audit · 60 minutes</p>
        </div>

        {done ? (
          <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 40, textAlign: "center" }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 56, height: 56, borderRadius: 9999, background: "var(--al-status-positive-bg)", marginBottom: 18 }}>
              <BK.Icon name="check_circle" size={30} fill color="var(--al-status-positive)" />
            </span>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-status-positive)", marginBottom: 8 }}>Booking confirmed</div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--al-primary)" }}>You’re booked with kicksnare</h2>
            <p style={{ margin: "12px 0 0", fontSize: 15, color: "var(--al-on-surface-variant)" }}>Free Audit · {slot} · 60 minutes. We’ve sent the details to your email.</p>
            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
              <BK.Button>Manage booking</BK.Button>
              <BK.Button variant="ghost" onClick={() => setDone(false)}>Book again</BK.Button>
            </div>
          </div>
        ) : (
        <div style={{ background: "var(--al-surface-container-lowest)", borderRadius: 24, boxShadow: "var(--al-shadow-float)", padding: 32 }}>
          {/* Selected service */}
          <div style={{ borderRadius: 16, background: "var(--al-surface-container-low)", padding: "18px 20px", marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55 }}>Selected service</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--al-primary)", marginTop: 6 }}>Free Audit</div>
              <div style={{ fontSize: 13, color: "var(--al-on-surface-variant)", marginTop: 2 }}>60 minutes · UTC</div>
            </div>
            <BK.StatusPill variant="positive">Selected</BK.StatusPill>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel required>Date</FieldLabel>
            <PlainInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Slots */}
          <div style={{ marginBottom: 28 }}>
            <FieldLabel required>Available slots</FieldLabel>
            <div style={{ fontSize: 12, color: "var(--al-on-surface-variant)", opacity: .75, margin: "-2px 0 12px" }}>60 minutes · UTC</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
              {SLOTS.map((s) => {
                const active = slot === s;
                return (
                  <button key={s} type="button" onClick={() => setSlot(s)} aria-pressed={active} style={{
                    height: 46, borderRadius: 12, cursor: "pointer",
                    fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700,
                    border: active ? "0" : "1px solid var(--al-hairline-strong)",
                    background: active ? "var(--al-primary)" : "#fff",
                    color: active ? "#fff" : "var(--al-on-surface-variant)",
                    boxShadow: active ? "var(--al-shadow-ring)" : "none",
                    transition: "background var(--al-dur-fast) var(--al-ease), color var(--al-dur-fast) var(--al-ease)",
                  }}>{s}</button>
                );
              })}
            </div>
          </div>

          {/* Contact fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
            <div><FieldLabel required>Full name</FieldLabel><PlainInput placeholder="Jordan Carter" autoComplete="name" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
              <div><FieldLabel required>Phone</FieldLabel><PlainInput type="tel" placeholder="+44 7700 900123" autoComplete="tel" /></div>
              <div><FieldLabel required>Email</FieldLabel><PlainInput type="email" placeholder="you@email.com" autoComplete="email" /></div>
            </div>
          </div>

          {/* SMS opt-in */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, cursor: "pointer" }}>
            <CheckBox checked={sms} onChange={setSms} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--al-on-surface)", lineHeight: 1.4 }}>Send me SMS updates about this booking.</span>
          </label>

          {/* Email reminders */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 18, borderRadius: 16, background: "var(--al-surface-container)", marginBottom: 28, cursor: "pointer" }}>
            <CheckBox checked={emailRem} onChange={setEmailRem} />
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>Send me email reminders.</span>
              <span style={{ display: "block", marginTop: 5, fontSize: 13, lineHeight: 1.5, color: "var(--al-on-surface-variant)" }}>Get an email reminder about 24 hours before your appointment. You can opt out later.</span>
            </span>
          </label>

          <BK.Button size="lg" style={{ width: "100%" }} onClick={() => setDone(true)}>Confirm booking</BK.Button>
        </div>
        )}
      </div>
    </section>
  );
}

Object.assign(window, { Booking });
