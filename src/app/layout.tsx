import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
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
      <body className={`${inter.className} bg-bg-dark text-white antialiased`}>
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
        const message = error && typeof error.message === "string" ? error.message : "";
        if (name.charCodeAt(0) === 8203 && /negative time stamp/i.test(message)) {
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
