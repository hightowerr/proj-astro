"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckoutButton } from "./checkout-button"

const MONTHLY_PRICE = 49
const ANNUAL_MONTHLY_PRICE = 39
const ANNUAL_TOTAL = 468
const SAVE_PCT = 20

interface PricingCardProps {
  ctaLabel: string
}

export function PricingCard({ ctaLabel }: PricingCardProps) {
  const [isAnnual, setIsAnnual] = useState(true)

  const price = isAnnual ? ANNUAL_MONTHLY_PRICE : MONTHLY_PRICE
  const billedNote = isAnnual
    ? `Billed $${ANNUAL_TOTAL}/year`
    : "Billed monthly"

  return (
    <div className="rounded-3xl bg-al-surface-lowest p-7 shadow-[var(--al-shadow-float)]">
      {/* Billing toggle */}
      <div className="mb-6 flex rounded-xl bg-al-surface-container p-1" role="group" aria-label="Billing period">
        <button
          onClick={() => setIsAnnual(false)}
          aria-pressed={!isAnnual}
          className={cn(
            "flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition-all",
            !isAnnual
              ? "bg-white text-al-primary shadow-sm"
              : "text-al-on-surface-variant hover:text-al-on-surface",
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          aria-pressed={isAnnual}
          className={cn(
            "flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
            isAnnual
              ? "bg-white text-al-primary shadow-sm"
              : "text-al-on-surface-variant hover:text-al-on-surface",
          )}
        >
          <span>Annual</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-extrabold transition-colors",
              isAnnual
                ? "bg-[#0e7a55]/10 text-[#0e7a55]"
                : "bg-al-surface-container text-al-on-surface-variant",
            )}
          >
            Save {SAVE_PCT}%
          </span>
        </button>
      </div>

      {/* Price */}
      <div className="mb-1.5 flex items-baseline gap-1">
        <span className="font-mono text-[46px] font-extrabold leading-none tracking-tight text-al-primary tabular-nums">
          ${price}
        </span>
        <span className="text-base font-semibold text-al-on-surface-variant">
          /mo
        </span>
      </div>
      <div className="mb-6 text-[13px] text-al-on-surface-variant">
        {billedNote}
      </div>

      {/* CTA */}
      <CheckoutButton label={ctaLabel} slug={isAnnual ? "showup-pro-annual" : "showup-pro-monthly"} />

      {/* Trust line */}
      <div className="mt-4 flex items-center justify-center gap-[7px]">
        <span className="material-symbols-outlined text-[15px] text-al-on-surface-variant">
          lock
        </span>
        <span className="text-xs text-al-on-surface-variant">
          Cancel anytime &middot; Secure checkout
        </span>
      </div>
    </div>
  )
}
