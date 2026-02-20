"use client";

import dynamic from "next/dynamic";

const HeroSection = dynamic(() => import("@/components/landing/hero-section"), {
  ssr: false,
});

export function HeroSectionClient() {
  return <HeroSection />;
}
