import Link from "next/link";

/**
 * Non-fixed navigation header for the public booking flow.
 * Brand mark only — no marketing links, no auth CTAs.
 * Uses Atelier Light (`--al-*`) design tokens exclusively.
 * Server Component — no "use client", no useState, no framer-motion.
 */
export function BookingNav() {
  return (
    <nav
      style={{
        fontFamily: "var(--al-font)",
        display: "flex",
        alignItems: "center",
        padding: "16px 32px",
        backgroundColor: "var(--al-surface-container-lowest)",
        borderBottom: "1px solid var(--al-ghost-border)",
      }}
    >
      <Link
        href="/"
        aria-label="ShowUp homepage"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            backgroundColor: "var(--al-primary)",
            borderRadius: "var(--al-radius-lg)",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: "var(--al-on-primary)",
            }}
            aria-hidden="true"
          >
            dashboard_customize
          </span>
        </span>

        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            color: "var(--al-primary)",
          }}
        >
          SHOWUP
        </span>
      </Link>
    </nav>
  );
}
