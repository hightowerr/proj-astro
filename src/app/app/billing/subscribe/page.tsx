import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { getCustomerSubscriptionStatus } from "@/lib/polar"
import { getShopByOwnerId } from "@/lib/queries/shops"
import { shops } from "@/lib/schema"
import { requireAuth } from "@/lib/session"
import { PricingCard } from "./pricing-card"

/* ---------- Variant copy ---------- */

interface VariantCopy {
  icon: string
  iconGradient: string
  iconColor: string
  label: string
  heading: string
  body: string
  sectionLabel: string
  ctaLabel: string
}

const VARIANT_A: VariantCopy = {
  icon: "hourglass_bottom",
  iconGradient: "linear-gradient(135deg, #fdd8cb, #e2bfb3)",
  iconColor: "#8a4a38",
  label: "YOUR TRIAL HAS ENDED",
  heading: "Your 14-day trial has ended",
  body: "You\u2019ve seen ShowUp keep your calendar full and your no-shows down. Subscribe to keep your shop live \u2014 nothing you set up goes anywhere.",
  sectionLabel: "EVERYTHING STAYS RIGHT WHERE IT IS",
  ctaLabel: "Keep my shop live",
}

const VARIANT_B: VariantCopy = {
  icon: "waving_hand",
  iconGradient: "linear-gradient(135deg, #d5e3ff, #a7c8ff)",
  iconColor: "var(--al-primary)",
  label: "WELCOME BACK",
  heading: "Good to see you again",
  body: "Your shop is paused, but nothing\u2019s gone. Reactivate and pick up exactly where you left off \u2014 same catalog, same clients, same policies.",
  sectionLabel: "STILL SET UP AND WAITING FOR YOU",
  ctaLabel: "Reactivate my shop",
}

const FEATURES = [
  "Your client roster & reliability scores",
  "Deposit & cancellation policies",
  "Automatic slot recovery by SMS",
  "Reminders & post-visit follow-ups",
] as const

/* ---------- Page ---------- */

export default async function SubscribePage() {
  const session = await requireAuth()

  const shop = await getShopByOwnerId(session.user.id)

  // No shop at all -> onboarding
  if (!shop) {
    redirect("/app")
  }

  // Reconciliation: if merchant was a subscriber, verify with Polar API
  if (shop.polarCustomerId) {
    const polarStatus = await getCustomerSubscriptionStatus(shop.polarCustomerId)
    if (polarStatus === "active") {
      // Polar says active — heal our DB and redirect to dashboard
      await db
        .update(shops)
        .set({ subscriptionStatus: "active" })
        .where(eq(shops.id, shop.id))
      redirect("/app/dashboard")
    }
    // If API fails (returns null) or status is not active, fall through to paywall
  }
  // If no polarCustomerId (trial expiry, never subscribed), render paywall directly

  // Choose variant based on whether this merchant ever had a paid subscription
  const variant = shop.polarCustomerId ? VARIANT_B : VARIANT_A

  return (
    <div className="flex min-h-screen items-center justify-center bg-al-surface-low px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[860px]">
        {/* Two-column desktop, single-column mobile */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_380px] lg:gap-[52px]">
          {/* Left: messaging + feature list */}
          <div>
            {/* Icon */}
            <span
              className="mb-[22px] inline-grid h-14 w-14 place-items-center rounded-full"
              style={{ background: variant.iconGradient }}
            >
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ color: variant.iconColor }}
              >
                {variant.icon}
              </span>
            </span>

            {/* Label */}
            <div
              className="mb-3 text-[11px] font-extrabold uppercase tracking-[.2em]"
              style={{ color: variant.iconColor }}
            >
              {variant.label}
            </div>

            {/* Heading */}
            <h2 className="mb-3.5 text-[32px] font-extrabold leading-[1.1] tracking-tight text-al-primary [text-wrap:pretty]">
              {variant.heading}
            </h2>

            {/* Body */}
            <p className="mb-7 max-w-[420px] text-[15.5px] leading-relaxed text-al-on-surface-variant [text-wrap:pretty]">
              {variant.body}
            </p>

            {/* Section label */}
            <div className="mb-3.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-al-on-surface-variant/70">
              {variant.sectionLabel}
            </div>

            {/* Feature list */}
            <div className="flex flex-col gap-[11px]">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-[11px]">
                  <span className="material-symbols-outlined text-[19px] text-[#0e7a55]">
                    check_circle
                  </span>
                  <span className="text-[14.5px] text-al-on-surface">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: pricing card */}
          <PricingCard ctaLabel={variant.ctaLabel} />
        </div>
      </div>
    </div>
  )
}
