"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = {
  number: string;
  Icon: LucideIcon;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: "01",
    Icon: BookOpen,
    title: "Clients book and pay a deposit",
    description:
      "Share your booking link. Clients pick a time, pay a deposit upfront, and get an instant SMS confirmation.",
  },
  {
    number: "02",
    Icon: ShieldCheck,
    title: "Astro protects your schedule",
    description:
      "Risk clients are flagged automatically. Late cancellations keep your deposit - your time is never wasted.",
  },
  {
    number: "03",
    Icon: RefreshCw,
    title: "Cancelled slots fill themselves",
    description:
      "When someone cancels, Astro offers the slot to your best available clients. Your calendar stays full without you lifting a finger.",
  },
];

export default function HowItWorks() {
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 };
  const getTransition = (index: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.15 };

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-bg-dark-secondary py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            How it works
          </span>
          <h2 className="mt-4 mb-4 text-4xl font-bold text-white">How Astro works</h2>
          <p className="mx-auto max-w-2xl text-lg text-text-muted">
            From booking to protected revenue - completely automated.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="from-primary/20 via-primary to-primary/20 absolute top-14 left-[20%] right-[20%] hidden h-0.5 bg-gradient-to-r md:block" />

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={initial}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={getTransition(index)}
                className="relative rounded-2xl border border-white/5 bg-bg-dark p-8"
              >
                <div className="mb-2 text-7xl leading-none font-black text-primary/20">
                  {step.number}
                </div>
                <div className="mb-4">
                  <step.Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-base leading-relaxed text-text-muted">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
