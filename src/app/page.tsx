import CtaSection from "@/components/landing/cta-section";
import FaqSection from "@/components/landing/faq-section";
import { FeatureSection } from "@/components/landing/feature-section";
import FeaturesCarousel from "@/components/landing/features-carousel";
import { FloatCard } from "@/components/landing/float-card";
import { HeroSectionClient } from "@/components/landing/hero-section-client";
import { HowItWorksSectionClient } from "@/components/landing/how-it-works-section-client";
import PricingSection from "@/components/landing/pricing-section";

export default function Home() {
  return (
    <main>
      <HeroSectionClient />
      <HowItWorksSectionClient />

      <section className="bg-bg-dark py-24">
        <div className="mx-auto max-w-7xl space-y-24 px-4 sm:px-6 lg:px-8">
          <FeatureSection
            title="Know your clients before they walk in"
            description="Astro scores every client on show-up history, cancellation patterns, and deposit behaviour. Risk clients are flagged before they cost you money."
            imageSrc="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
            imageAlt="Stylist reviewing client booking details"
            imagePosition="right"
          >
            <FloatCard
              value="94%"
              label="client show-up rate"
              className="top-6 right-6"
              delay={0}
            />
            <FloatCard
              value="3x"
              label="fewer no-shows with risk flagging"
              className="bottom-6 left-6"
              delay={0.2}
            />
          </FeatureSection>

          <FeatureSection
            title="Never lose revenue when someone cancels"
            description="When a booking is cancelled, Astro automatically offers the slot to your best available clients in priority order. Your calendar fills itself."
            imageSrc="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80"
            imageAlt="Busy salon with fully booked schedule"
            imagePosition="left"
          >
            <FloatCard
              value="8 min"
              label="average time to fill a cancelled slot"
              className="top-6 left-6"
              delay={0}
            />
            <FloatCard
              value="£240"
              label="avg. weekly recovery"
              className="right-6 bottom-6"
              delay={0.2}
            />
          </FeatureSection>

          <FeatureSection
            title="Get paid before they even show up"
            description="Deposits are collected at booking time via Stripe. No-shows can't cost you - you've already been paid. Refunds for eligible cancellations are automatic."
            imageSrc="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
            imageAlt="Client paying via phone at salon"
            imagePosition="right"
          >
            <FloatCard value="£0" label="owed after a no-show" className="top-6 right-6" delay={0} />
            <FloatCard
              value="100%"
              label="deposit collection at booking"
              className="bottom-6 left-6"
              delay={0.2}
            />
          </FeatureSection>
        </div>
      </section>

      <FeaturesCarousel />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
