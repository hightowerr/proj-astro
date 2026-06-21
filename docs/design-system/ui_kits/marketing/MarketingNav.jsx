/* Marketing — sticky top nav (Atelier Light). */
const MN = window.AstroDesignSystem_424d7f;

function MarketingNav() {
  const links = ["How it works", "Features", "Pricing", "FAQ"];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(249,249,247,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid var(--al-hairline)" }}>
      <nav className="m-pad-x" style={{ maxWidth: 1200, margin: "0 auto", height: 72, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--al-gradient-cta)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--al-shadow-mark)" }}>
            <MN.Icon name="dashboard_customize" size={20} fill color="#fff" />
          </span>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--al-primary)" }}>Astro</span>
        </div>
        <div className="m-nav-links" style={{ display: "flex", alignItems: "center", gap: 34 }}>
          {links.map((l) => (
            <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 600, color: "var(--al-on-surface-variant)", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a className="m-nav-signin" href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 600, color: "var(--al-on-surface-variant)", textDecoration: "none" }}>Sign in</a>
          <MN.Button size="sm">Start free trial</MN.Button>
        </div>
      </nav>
    </header>
  );
}

Object.assign(window, { MarketingNav });
