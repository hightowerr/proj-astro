import { Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { RouteChrome } from "@/components/layout/route-chrome";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope-raw",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShowUp",
  description: "Stop losing money to no-shows. Smart booking for beauty professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          Material Symbols Outlined — used by the services settings UI and other icons.
          `display=swap` is the Next.js-recommended value and prevents blocked text rendering
          while the icon font loads; raw ligature names are briefly visible but swap in on load.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased bg-background`}
      >
        {process.env.NODE_ENV === "development" ? (
          <Script id="react-dev-measure-guard" strategy="beforeInteractive">
            {`(() => {
  try {
    if (!("performance" in window) || typeof performance.measure !== "function") return;
    if (window.__reactDevMeasureGuardInstalled) return;
    const originalMeasure = performance.measure.bind(performance);
    window.__reactDevMeasureGuardInstalled = true;
    performance.measure = function (...args) {
      try {
        return originalMeasure(...args);
      } catch (error) {
        const name = typeof args[0] === "string" ? args[0] : "";
        const normalizedName = name.replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, "");
        const message = error && typeof error.message === "string" ? error.message : "";
        if (/negative time stamp/i.test(message) && /\\bBookingPage\\b/.test(normalizedName)) {
          return;
        }
        throw error;
      }
    };
  } catch {}
})();`}
          </Script>
        ) : null}
        <RouteChrome>{children}</RouteChrome>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
