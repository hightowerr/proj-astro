/* Astro App — sidebar + topbar shell. Composes Icon + Avatar from the bundle. */
const { Icon: ShellIcon, Avatar: ShellAvatar } = window.AstroDesignSystem_424d7f;

const NAV_PRIMARY = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "appointments", label: "Appointments", icon: "calendar_month" },
  { key: "customers", label: "Customers", icon: "group" },
  { key: "conflicts", label: "Conflicts", icon: "warning", badge: 1 },
];
const NAV_SETTINGS = [
  { key: "availability", label: "Availability", icon: "schedule" },
  { key: "payment", label: "Payment Policy", icon: "receipt_long" },
  { key: "reminders", label: "Reminders", icon: "notifications" },
];

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, width: "100%",
        padding: "11px 14px", borderRadius: 10, border: 0, cursor: "pointer",
        textAlign: "left", fontFamily: "var(--al-font)", fontSize: 14,
        fontWeight: active ? 700 : 600,
        background: active ? "var(--al-primary)" : hover ? "var(--al-surface-container)" : "transparent",
        color: active ? "#fff" : "var(--al-on-surface-variant)",
        transition: "background var(--al-dur-fast) var(--al-ease)",
      }}
    >
      <ShellIcon name={item.icon} size={20} fill={active} color={active ? "#fff" : "var(--al-on-surface-variant)"} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge ? (
        <span style={{
          minWidth: 20, height: 20, padding: "0 6px", borderRadius: 9999,
          display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800,
          fontFamily: "var(--al-font-mono)",
          background: active ? "rgba(255,255,255,.16)" : "var(--al-secondary-container)",
          color: active ? "#fff" : "var(--al-on-secondary-container)",
        }}>{item.badge}</span>
      ) : null}
    </button>
  );
}

function AppShell({ active, onNavigate, shopName = "Atelier No. 9", children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "264px 1fr", minHeight: "100%", background: "var(--al-surface-container-low)" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--al-background)", borderRight: "1px solid var(--al-hairline)", padding: "32px 20px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--al-gradient-cta)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--al-shadow-mark)" }}>
            <ShellIcon name="dashboard_customize" size={24} fill color="#fff" />
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--al-primary)" }}>Astro</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .7, margin: "0 0 28px 54px" }}>{shopName}</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_PRIMARY.map((it) => (
            <NavItem key={it.key} item={it} active={active === it.key} onClick={() => onNavigate(it.key)} />
          ))}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-on-surface-variant)", opacity: .55, padding: "24px 14px 8px" }}>Settings</div>
          {NAV_SETTINGS.map((it) => (
            <NavItem key={it.key} item={it} active={active === it.key} onClick={() => onNavigate(it.key)} />
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--al-hairline)", display: "flex", alignItems: "center", gap: 12 }}>
          <ShellAvatar initials="JL" tier="neutral" size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--al-primary)" }}>Jess Lindqvist</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--al-on-surface-variant)" }}>Account & Profile</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: "32px 48px 64px", display: "flex", flexDirection: "column", gap: 28, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}

Object.assign(window, { AppShell });
