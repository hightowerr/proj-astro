"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import type { Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
  },
};

type HeroAppointmentStatus = "top" | "neutral" | "risk";

type HeroAppointment = {
  time: string;
  name: string;
  service: string;
  status: HeroAppointmentStatus;
};

const HERO_DAYS = [
  { label: "M", date: 17 },
  { label: "T", date: 18 },
  { label: "W", date: 19 },
  { label: "T", date: 20 },
  { label: "F", date: 21 },
  { label: "S", date: 22 },
  { label: "S", date: 23 },
] as const;

const HERO_APPOINTMENTS: HeroAppointment[] = [
  { time: "9:00 AM", name: "Sarah M.", service: "Balayage refresh", status: "top" },
  { time: "10:30 AM", name: "Jordan K.", service: "Fade + beard sculpt", status: "neutral" },
  { time: "12:15 PM", name: "Priya N.", service: "Gel infill + art", status: "top" },
  { time: "2:00 PM", name: "Taylor R.", service: "Colour correction", status: "risk" },
  { time: "3:30 PM", name: "Emma L.", service: "Blowout + toner", status: "neutral" },
  { time: "5:00 PM", name: "Maya P.", service: "Lash lift", status: "top" },
];

const HERO_METRICS = [
  { label: "Booked", value: "6/8" },
  { label: "Revenue", value: "£462" },
  { label: "Risk", value: "1 client" },
] as const;

function getStatusConfig(status: HeroAppointmentStatus) {
  if (status === "top") {
    return { label: "Top", classes: "bg-amber-100 text-amber-700" };
  }

  if (status === "risk") {
    return { label: "Risk", classes: "bg-rose-100 text-rose-700" };
  }

  return { label: "Neutral", classes: "bg-gray-100 text-gray-600" };
}

export default function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative -mt-16 min-h-screen overflow-hidden bg-bg-dark">
      <Image
        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80"
        alt=""
        aria-hidden="true"
        fill
        priority={true}
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-bg-dark/80 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-32 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? "visible" : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
              For salons, stylists & barbers
            </span>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h1 className="text-5xl leading-tight font-bold text-white lg:text-7xl">
              Stop losing money
              <br />
              to no-shows
            </h1>
          </motion.div>

          <motion.div variants={itemVariants}>
            <p className="max-w-lg text-lg leading-relaxed text-text-muted">
              Astro protects your income with smart client scoring, automated deposits, and
              instant slot recovery.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <motion.a
              href="/app"
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              transition={{ duration: 0.15 }}
              className="cursor-pointer rounded-xl bg-accent-coral px-8 py-3 font-semibold text-bg-dark transition-colors duration-200 hover:bg-[#F09070]"
            >
              Book a Demo
            </motion.a>
            <motion.a
              href="#how-it-works"
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              transition={{ duration: 0.15 }}
              className="cursor-pointer rounded-xl border border-white/30 px-8 py-3 text-white transition-colors duration-200 hover:bg-white/10"
            >
              See how it works
            </motion.a>
          </motion.div>

          <motion.div variants={itemVariants}>
            <p className="text-sm text-text-light-muted">Trusted by 500+ beauty professionals</p>
          </motion.div>
        </motion.div>

        <div className="flex justify-center lg:justify-end">
          <div className={reducedMotion ? "" : "animate-float"}>
            <PhoneMockup>
              <div className="flex h-full flex-col bg-gray-50 text-gray-900">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Today · Feb 19</p>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                      Synced
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Your day at a glance</p>
                </div>

                <div className="border-b border-gray-200 bg-white px-2 py-2">
                  <div className="grid grid-cols-7 gap-1">
                    {HERO_DAYS.map((day, index) => {
                      const isActiveDay = index === 2;
                      return (
                        <div
                          key={`${day.label}-${day.date}`}
                          className={`rounded-lg py-1 text-center ${isActiveDay ? "bg-teal-100" : "bg-gray-100"}`}
                        >
                          <p className="text-[10px] font-medium text-gray-500">{day.label}</p>
                          <p
                            className={`text-[11px] font-semibold ${isActiveDay ? "text-teal-700" : "text-gray-700"}`}
                          >
                            {day.date}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
                  {HERO_APPOINTMENTS.map((appointment) => {
                    const status = getStatusConfig(appointment.status);

                    return (
                      <div
                        key={`${appointment.time}-${appointment.name}`}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                              {appointment.time}
                            </p>
                            <p className="text-xs font-semibold text-gray-900">{appointment.name}</p>
                            <p className="text-[11px] text-gray-600">{appointment.service}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-gray-200 bg-white px-3 py-2">
                  {HERO_METRICS.map((metric) => (
                    <div key={metric.label} className="rounded-lg bg-gray-100 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-gray-500">{metric.label}</p>
                      <p className="text-xs font-semibold text-gray-900">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
}
