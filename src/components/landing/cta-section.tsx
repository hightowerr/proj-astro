"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle } from "lucide-react";
import { PhoneMockup } from "@/components/landing/phone-mockup";

type ConfirmationLine = {
  label: string;
  value: string;
  isPrimary?: boolean;
};

const CONFIRMATION_LINES: ConfirmationLine[] = [
  { label: "Client", value: "Sarah M." },
  { label: "Service", value: "Balayage refresh" },
  { label: "Date", value: "Fri 14 Mar, 2:00 pm" },
  { label: "Deposit paid", value: "£15.00", isPrimary: true },
];

const AUTOMATION_STEPS = [
  "SMS confirmation delivered",
  "24-hour reminder scheduled",
  "Google Calendar synced",
] as const;

const NEXT_ACTIONS = ["Manage booking", "Add note", "Upsell prompt ready"] as const;

export default function CtaSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-bg-dark py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bg-dark via-primary-dark/20 to-bg-dark" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
          Get started today
        </span>

        <h2 className="mt-4 mb-4 text-4xl leading-tight font-bold text-white lg:text-5xl">
          Your calendar deserves
          <br />
          to stay full
        </h2>

        <p className="mx-auto mb-8 max-w-xl text-lg text-text-muted">
          Join 500+ beauty professionals who have eliminated no-shows and put their slot recovery
          on autopilot.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <motion.a
            href="/app"
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="cursor-pointer rounded-xl bg-accent-coral px-8 py-3 font-semibold text-bg-dark transition-colors duration-200 hover:bg-[#F09070]"
          >
            Book a Demo
          </motion.a>
          <motion.button
            type="button"
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            transition={{ duration: 0.15 }}
            onClick={() =>
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
            }
            className="cursor-pointer rounded-xl border border-white/30 px-8 py-3 text-white transition-colors duration-200 hover:bg-white/10"
          >
            See how it works
          </motion.button>
        </div>

        <div className="mt-16 flex justify-center animate-float motion-reduce:animate-none">
          <PhoneMockup className="scale-75">
            <div className="flex h-full flex-col bg-gray-50 p-4 text-gray-900">
              <div className="rounded-2xl border border-green-200 bg-white p-3 text-center shadow-sm">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Booking Confirmed!</p>
                <p className="mt-0.5 text-[11px] text-gray-500">Ref #AST-2194 · Sent at 9:42 AM</p>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                  Appointment details
                </p>
                <div className="space-y-2">
                  {CONFIRMATION_LINES.map((line) => (
                    <div key={line.label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{line.label}</span>
                      <span className={line.isPrimary ? "font-semibold text-primary" : "text-gray-900"}>
                        {line.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                  Autopilot actions
                </p>
                <div className="space-y-1.5">
                  {AUTOMATION_STEPS.map((step) => (
                    <div key={step} className="flex items-center gap-2 text-[11px] text-gray-700">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3 w-3 text-green-700" />
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {NEXT_ACTIONS.map((action) => (
                  <span
                    key={action}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600"
                  >
                    {action}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-medium text-green-700">
                  Zero manual follow-up needed
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>
      </div>
    </section>
  );
}
