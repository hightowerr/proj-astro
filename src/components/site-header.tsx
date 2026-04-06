"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const { data: session, isPending } = useSession();
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const effectivePending = isPending || !hasHydrated;

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 0);
  });

  const navLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const headerClass = scrolled
    ? "bg-[var(--color-surface-base)]/80 border-b border-[var(--color-border-hairline)] backdrop-blur-md"
    : "bg-transparent";
  const drawerTransitionClass = reduceMotion ? "" : "transition-transform duration-300 ease-out";
  const actionLinkClass =
    "rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]";
  const secondaryActionClass =
    "text-[var(--color-text-secondary)] rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <a
        href="#main-content"
        className="focus:bg-[var(--color-surface-raised)] sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:px-4 focus:py-2 focus:text-[var(--color-text-primary)]"
      >
        Skip to main content
      </a>

      <header className={`fixed top-0 z-50 w-full ${headerClass}`} role="banner">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-[var(--color-text-primary)]" aria-label="Astro homepage">
            Astro
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[var(--color-text-secondary)] text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {effectivePending ? null : session ? (
              <>
                <Link href="/app" className={cn("bg-[var(--color-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-hover)]", actionLinkClass)}>
                  Open App
                </Link>
                <button type="button" onClick={handleSignOut} className={secondaryActionClass}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={secondaryActionClass}>
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={cn("bg-[var(--color-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-hover)]", actionLinkClass)}
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text-primary)] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </header>

      {drawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className={`fixed inset-0 z-40 bg-black/50 ${reduceMotion ? "" : "transition-opacity duration-300"} opacity-100`}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={`fixed top-0 right-0 bottom-0 z-50 w-72 transform p-6 translate-x-0 bg-[var(--color-surface-raised)] ${drawerTransitionClass}`}
          >
            <div className="mb-8 flex items-center justify-between">
              <Link
                href="/"
                className="rounded-md text-xl font-bold text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
                onClick={() => setDrawerOpen(false)}
              >
                Astro
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[var(--color-text-secondary)] rounded-md text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {effectivePending ? null : session ? (
                <>
                  <Link
                    href="/app"
                    className={cn(
                      "bg-[var(--color-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-hover)] inline-flex w-full justify-center",
                      actionLinkClass,
                    )}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Open App
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setDrawerOpen(false);
                      await handleSignOut();
                    }}
                    className="text-[var(--color-text-secondary)] inline-flex w-full justify-center rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[var(--color-text-secondary)] mt-2 inline-flex w-full justify-center rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className={cn(
                      "bg-[var(--color-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-hover)] inline-flex w-full justify-center",
                      actionLinkClass,
                    )}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
