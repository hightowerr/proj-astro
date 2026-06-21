/* Reminders settings screen — capacity dial + reminder timing toggles. */
const R = window.AstroDesignSystem_424d7f;

function CapacityDial({ used, cap }) {
  const atCap = used >= cap;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: cap }).map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: 9999, transition: "background var(--al-dur-normal) var(--al-ease)",
            background: i < used ? (atCap ? "var(--al-status-caution)" : "var(--al-primary)") : "var(--al-surface-container-high)" }} />
        ))}
      </div>
      <span style={{ fontFamily: "var(--al-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 800, color: atCap ? "var(--al-status-caution)" : "var(--al-primary)" }}>{used}/{cap}</span>
    </div>
  );
}

function ReminderRow({ icon, label, sub, defaultOn }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 28px", borderTop: "1px solid var(--al-hairline)" }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--al-surface-container)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <R.Icon name={icon} size={20} color="var(--al-primary)" fill={on} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--al-on-surface)" }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--al-on-surface-variant)" }}>{sub}</div>
      </div>
      <R.Switch checked={on} onChange={setOn} />
    </div>
  );
}

function Reminders() {
  return (
    <>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--al-font)", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em", color: "var(--al-primary)" }}>Reminders</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 500, color: "var(--al-on-surface-variant)" }}>Automated SMS that confirm, nudge, and re-sell cancelled slots.</p>
      </div>

      <R.Sheet padded={false} eyebrow="The cadence" title="Reminder schedule" lede="Each booking can trigger up to three messages. Toggle the ones your clients need.">
        <ReminderRow icon="check_circle" label="Booking confirmation" sub="Sent immediately after a slot is booked" defaultOn />
        <ReminderRow icon="schedule" label="24-hour reminder" sub="Day-before nudge with the deposit policy" defaultOn />
        <ReminderRow icon="bolt" label="Slot recovery offer" sub="Re-sells a cancelled slot to the waitlist by SMS" defaultOn />
        <ReminderRow icon="reviews" label="Post-visit follow-up" sub="Thank-you note + rebooking link" />
      </R.Sheet>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <R.Sheet eyebrow="Per-slot cap" title="Recovery throttle">
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--al-on-surface-variant)", lineHeight: 1.5 }}>
            Limit how many recovery offers go out for a single opening before it closes automatically.
          </p>
          <CapacityDial used={3} cap={3} />
          <div style={{ marginTop: 14 }}>
            <R.StatusPill variant="caution" tinted={false}>At capacity — offers paused</R.StatusPill>
          </div>
        </R.Sheet>

        <R.Sheet eyebrow="Preview" title="SMS template">
          <div style={{ borderRadius: 16, background: "var(--al-surface-container-low)", padding: 18, fontSize: 14, lineHeight: 1.55, color: "var(--al-on-surface)" }}>
            Hi Sarah — a <strong style={{ color: "var(--al-primary)" }}>2:00 PM colour slot</strong> just opened at Atelier No. 9 this Tuesday. Reply <strong style={{ color: "var(--al-primary)" }}>YES</strong> in the next 30 min to claim it.
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <R.Button size="sm">Save template</R.Button>
            <R.Button size="sm" variant="ghost">Send test</R.Button>
          </div>
        </R.Sheet>
      </div>
    </>
  );
}

Object.assign(window, { Reminders });
