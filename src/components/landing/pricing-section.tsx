"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const MONTHLY_PRICE = 49;

const FEATURES = [
  "Unlimited bookings",
  "Smart client scoring",
  "Slot recovery automation",
  "Stripe deposit collection",
  "SMS confirmations",
  "Cancellation policy enforcement",
  "Business dashboard",
  "Email support",
];

export default function PricingSection() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const price = period === "annual" ? Math.round(MONTHLY_PRICE * 0.8) : MONTHLY_PRICE;

  return (
    <section id="pricing" className="bg-bg-dark py-24">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            Simple pricing
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white">One plan. Full protection.</h2>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-bg-dark-secondary p-1">
            {(["monthly", "annual"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`${period === value ? "bg-primary text-white" : "text-text-muted"} flex cursor-pointer items-center gap-2 rounded-full px-5 py-1.5 text-sm capitalize transition-colors duration-200`}
              >
                {value}
                {value === "annual" ? (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Save 20%
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-bg-dark-secondary p-8 shadow-2xl lg:p-10">
          <p className="mb-4 text-sm font-semibold tracking-widest text-primary uppercase">Astro Pro</p>
          <div className="mb-2 flex items-end gap-2">
            <span aria-live="polite" className="text-6xl font-bold text-white">
              ${price}
            </span>
            <span className="mb-2 text-xl text-text-muted">/mo</span>
          </div>
          {period === "annual" ? (
            <p className="mb-6 text-sm text-text-light-muted">billed annually</p>
          ) : null}

          <ul className="mb-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-base text-text-muted">{feature}</span>
              </li>
            ))}
          </ul>

          <motion.a
            href="/app"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="bg-accent-coral text-bg-dark hover:bg-[#F09070] w-full cursor-pointer rounded-xl py-3.5 font-semibold transition-colors duration-200"
          >
            Book a Demo
          </motion.a>
          <p className="mt-3 text-center text-sm text-text-light-muted">No credit card required</p>
        </div>
      </div>
    </section>
  );
}
