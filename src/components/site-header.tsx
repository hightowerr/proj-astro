"use client";

import { useState } from "react";
import Link from "next/link";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";

export function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 0);
  });

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Login", href: "/login" },
  ];

  const headerClass = scrolled
    ? "bg-bg-dark/80 border-b border-white/5 backdrop-blur-md"
    : "bg-transparent";
  const drawerTransitionClass = reduceMotion ? "" : "transition-transform duration-300 ease-out";

  return (
    <>
      <a
        href="#main-content"
        className="focus:bg-bg-dark-secondary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <header className={`fixed top-0 z-50 w-full ${headerClass}`} role="banner">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-white" aria-label="Astro homepage">
            Astro
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-text-light-muted text-sm font-medium transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <Link
              href="#pricing"
              className="bg-accent-coral text-bg-dark hover:bg-accent-peach rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200"
            >
              Book a Demo
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-white md:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </header>

      <button
        type="button"
        aria-label="Close menu overlay"
        className={`fixed inset-0 z-40 bg-black/50 ${reduceMotion ? "" : "transition-opacity duration-300"} ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`bg-bg-dark-secondary fixed top-0 right-0 bottom-0 z-50 w-72 transform p-6 ${drawerOpen ? "translate-x-0" : "translate-x-full"} ${drawerTransitionClass}`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white"
            onClick={() => setDrawerOpen(false)}
          >
            Astro
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-2 text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-text-light-muted text-sm font-medium transition-colors duration-200 hover:text-white"
              onClick={() => setDrawerOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="#pricing"
            className="bg-accent-coral text-bg-dark hover:bg-accent-peach mt-2 inline-flex w-full justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200"
            onClick={() => setDrawerOpen(false)}
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </>
  );
}
