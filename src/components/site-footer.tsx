import Link from "next/link";

export function SiteFooter() {
  const links = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer className="bg-bg-dark border-t border-white/10 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4">
        <Link href="/" className="text-xl font-bold text-white">
          Astro
        </Link>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-text-muted text-sm transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-text-light-muted text-sm">© 2025 Astro. All rights reserved.</p>
      </div>
    </footer>
  );
}
