"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What happens if a client no-shows?",
    a: "Astro retains the deposit automatically and updates the client's reliability score. Two or more no-shows within 90 days flags them as a risk client, so you can decide whether to accept future bookings from them.",
  },
  {
    q: "Can clients cancel and get a refund?",
    a: "Cancelling before your cutoff window triggers a full automatic refund - no awkward conversations needed. After the cutoff, you keep the deposit. You set the cutoff (e.g. 24 hours) when you configure your policy.",
  },
  {
    q: "How long does it take to get started?",
    a: "Most beauty professionals are live and taking bookings within 20 minutes. Set your availability, cancellation policy, and deposit amount, then share your booking link.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes - 14-day free trial, no credit card required. Every feature is available during the trial, including smart client scoring, slot recovery, and Stripe deposits.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Astro is month-to-month, no contracts. Cancel from your account settings at any time. Your data is exported on request.",
  },
  {
    q: "Which calendar and payment apps does Astro work with?",
    a: "Astro integrates with Google Calendar and processes payments via Stripe. SMS confirmations go out through Twilio. Additional integrations are on the roadmap.",
  },
] as const;

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  const toggle = (index: number) => {
    setOpenIndex((previous) => (previous === index ? null : index));
  };

  return (
    <section className="bg-bg-dark-secondary py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            FAQ
          </span>
          <h2 className="mt-4 mb-4 text-4xl font-bold text-white">Common questions</h2>
          <p className="text-lg text-text-muted">Everything you need to know about Astro.</p>
        </div>

        <div className="divide-y divide-white/10">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="group flex w-full cursor-pointer items-center justify-between py-5 text-left"
                >
                  <span
                    className={`text-xl font-semibold transition-colors duration-200 ${isOpen ? "text-white" : "text-text-light-muted group-hover:text-white"}`}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 shrink-0"
                  >
                    <ChevronDown className="h-5 w-5 text-text-muted" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <p className="pb-5 leading-relaxed text-text-muted">{item.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
