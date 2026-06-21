import Link from "next/link";

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

/**
 * Non-fixed navigation header for the public booking flow.
 * Uses Atelier Light (`--al-*`) design tokens exclusively.
 * Server Component — no "use client", no useState, no framer-motion.
 */
export function BookingNav() {
  return (
    <nav
      style={{
        fontFamily: "var(--font-manrope-raw), sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        backgroundColor: "var(--al-surface-container-lowest)",
        borderBottom: "1px solid rgba(195,198,209,0.20)",
      }}
    >
      {/* ── Left: Brand mark + brand name ── */}
      <Link
        href="/"
        aria-label="Astro homepage"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
        }}
      >
        {/* Brand mark — 32px navy square with icon */}
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

        {/* Brand name */}
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            color: "var(--al-primary)",
          }}
        >
          ASTRO
        </span>
      </Link>

      {/* ── Center: Navigation links ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:bg-[var(--al-surface-container)]"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--al-on-surface-variant)",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: 10,
              transition: "background-color 150ms ease",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* ── Right: Sign in + CTA ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/login"
          className="hover:bg-[var(--al-surface-container)]"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--al-on-surface-variant)",
            textDecoration: "none",
            padding: "8px 16px",
            borderRadius: 10,
            transition: "background-color 150ms ease",
          }}
        >
          Sign in
        </Link>

        <Link
          href="/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--al-gradient-cta)",
            color: "var(--al-on-primary)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            borderRadius: "var(--al-radius-xl)",
            padding: "10px 20px",
            textDecoration: "none",
            boxShadow: "0px 14px 28px rgba(0, 30, 64, 0.20)",
          }}
        >
          Start free trial
        </Link>
      </div>
    </nav>
  );
}
