import { Cormorant_Garamond, Bricolage_Grotesque, Fira_Code, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fira-code",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope-raw",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Astro",
  description: "Stop losing money to no-shows. Smart booking for beauty professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body
        className={`${cormorant.variable} ${bricolage.variable} ${firaCode.variable} ${manrope.variable} antialiased`}
        style={{ background: "var(--color-surface-base)", color: "var(--color-text-primary)", fontFamily: "var(--font-body, system-ui, sans-serif)" }}
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
        <SiteHeader />
        <main id="main-content" className="pt-16">
          {children}
        </main>
        <SiteFooter />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
