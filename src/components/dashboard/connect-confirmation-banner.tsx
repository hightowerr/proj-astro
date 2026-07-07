"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "connect-banner-seen";
const VISIBLE_MS = 4000;
const FADE_MS = 500;

export function ConnectConfirmationBanner() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = !!sessionStorage.getItem(STORAGE_KEY);
      if (!alreadySeen) sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage unavailable (e.g. private browsing) — show anyway
    }
    if (alreadySeen) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <article
      className="flex items-center gap-3 rounded-2xl p-4 transition-opacity duration-500"
      style={{
        background: "var(--al-status-positive-bg, rgba(56,142,60,0.08))",
        opacity: fading ? 0 : 1,
      }}
    >
      <span
        className="material-symbols-outlined text-lg"
        style={{ color: "var(--al-status-positive)" }}
        aria-hidden="true"
      >
        check_circle
      </span>
      <p
        className="text-sm font-medium"
        style={{ color: "var(--al-status-positive)" }}
      >
        Stripe connected &mdash; deposits are now live.
      </p>
    </article>
  );
}
