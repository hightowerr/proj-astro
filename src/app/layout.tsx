import { Inter } from "next/font/google";
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
