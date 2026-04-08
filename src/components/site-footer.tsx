import Link from "next/link";

export function SiteFooter() {
  const links = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer
      className="py-12"
      style={{ background: "var(--color-surface-base)", borderTop: "1px solid var(--color-border-default)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4">
        <Link href="/" className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Astro
        </Link>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>© 2025 Astro. All rights reserved.</p>
      </div>
    </footer>
  );
}
