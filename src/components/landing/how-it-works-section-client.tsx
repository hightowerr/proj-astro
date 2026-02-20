"use client";

import dynamic from "next/dynamic";

const HowItWorksSection = dynamic(() => import("@/components/landing/how-it-works"), {
  ssr: false,
});

export function HowItWorksSectionClient() {
  return <HowItWorksSection />;
}
