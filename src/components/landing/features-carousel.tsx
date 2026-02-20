"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Check, Megaphone, ShieldAlert } from "lucide-react";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import type { PanInfo } from "framer-motion";

type SlideScreen = "NoShowScreen" | "MarketingScreen" | "CalendarScreen";

type Slide = {
  label: string;
  title: string;
  description: string;
  bullets: string[];
  phoneScreen: SlideScreen;
};

const SLIDES: Slide[] = [
  {
    label: "No-Show Protection",
    title: "Stop no-shows before they cost you",
    description:
      "Astro flags high-risk clients automatically based on their booking history. Deposits are collected upfront so a no-show never means lost revenue.",
    bullets: [
      "Risk tier assigned based on 90-day history",
      "Deposit held on cancellation after cutoff",
      "Score updates automatically after each appointment",
    ],
    phoneScreen: "NoShowScreen",
  },
  {
    label: "Marketing Tools",
    title: "Win back clients on autopilot",
    description:
      "Send targeted re-engagement SMS to clients who haven't booked in 60+ days. Personalised messages go out from your number, not a generic shortcode.",
    bullets: [
      "Segment by last booking date automatically",
      "One-click SMS campaign to lapsed clients",
      "Replies routed back to your inbox",
    ],
    phoneScreen: "MarketingScreen",
  },
  {
    label: "Calendar",
    title: "Your schedule, always full",
    description:
      "See today's appointments at a glance. Colour-coded slots show booked, available, and blocked times. Sync with Google Calendar in one click.",
    bullets: [
      "Week view with colour-coded availability",
      "Google Calendar sync",
      "Block time off without affecting your booking link",
    ],
    phoneScreen: "CalendarScreen",
  },
];

const NO_SHOW_SIGNALS = [
  { label: "Late cancellations", value: "2 in 90 days" },
  { label: "No-shows", value: "1 in 90 days" },
  { label: "Avg. arrival delay", value: "14 minutes" },
] as const;

const RISK_TREND = [
  { label: "W1", height: 35 },
  { label: "W2", height: 55 },
  { label: "W3", height: 42 },
  { label: "W4", height: 72 },
] as const;

const CAMPAIGN_AUDIENCES = ["Lapsed 60+ days", "VIP clients", "Last-minute fillers"] as const;

const CAMPAIGN_METRICS = [
  { label: "Recipients", value: "28" },
  { label: "Replies", value: "11" },
  { label: "Rebook rate", value: "39%" },
] as const;

type CalendarSlotState = "booked" | "open" | "held";

type CalendarSlot = {
  time: string;
  label: string;
  state: CalendarSlotState;
};

const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

const CALENDAR_SLOTS: CalendarSlot[] = [
  { time: "9:00", label: "Patricia · Cut + Finish", state: "booked" },
  { time: "10:30", label: "Open slot", state: "open" },
  { time: "12:00", label: "Nancy · Colour retouch", state: "booked" },
  { time: "2:30", label: "Held for waitlist", state: "held" },
  { time: "4:00", label: "Daniel · Beard + fade", state: "booked" },
];

const CALENDAR_OPENINGS = [
  "1:00 PM · Colour cancellation",
  "5:30 PM · Nail refill cancellation",
] as const;

function getSlotStyles(state: CalendarSlotState) {
  if (state === "booked") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }

  if (state === "held") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-gray-200 bg-white text-gray-600";
}

const NoShowScreen = (
  <div className="flex h-full flex-col bg-gray-50 p-4 text-gray-900">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-primary">
        <ShieldAlert className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Risk monitor</span>
      </div>
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
        92% confidence
      </span>
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">Jordan K.</p>
          <p className="text-[11px] text-gray-500">Next booking · Thu 2:30 PM</p>
        </div>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
          High Risk
        </span>
      </div>
      <div className="space-y-1.5">
        {NO_SHOW_SIGNALS.map((signal) => (
          <div key={signal.label} className="flex justify-between text-xs">
            <span className="text-gray-500">{signal.label}</span>
            <span className="font-medium text-gray-700">{signal.value}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
        Recommended policy
      </p>
      <p className="mt-1 text-xs font-medium text-gray-800">Require 30% deposit + 24h cutoff</p>
      <p className="mt-0.5 text-[11px] text-gray-500">Auto-applies to future bookings</p>
    </div>

    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
        4-week risk trend
      </p>
      <div className="mt-2 flex h-10 items-end gap-1.5">
        {RISK_TREND.map((point) => (
          <div
            key={point.label}
            className="flex-1 rounded-t bg-rose-200"
            style={{ height: `${point.height}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-500">
        {RISK_TREND.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>

    <div className="mt-auto pt-3">
      <div className="rounded-full bg-rose-100 px-3 py-1.5 text-center text-xs font-medium text-rose-700">
        1 high-risk client today
      </div>
    </div>
  </div>
);

const MarketingScreen = (
  <div className="flex h-full flex-col bg-gray-50 p-4 text-gray-900">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-primary">
        <Megaphone className="h-4 w-4" />
        <p className="text-xs font-semibold tracking-wide uppercase">Campaign composer</p>
      </div>
      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
        Draft ready
      </span>
    </div>

    <div className="mb-3 flex flex-wrap gap-1.5">
      {CAMPAIGN_AUDIENCES.map((audience) => (
        <span
          key={audience}
          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600"
        >
          {audience}
        </span>
      ))}
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600">
      We miss you, [Name]! Book your next appointment -&gt;{" "}
      <span className="text-teal-600">astro.app/book</span>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2">
      {CAMPAIGN_METRICS.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500">{metric.label}</p>
          <p className="text-xs font-semibold text-gray-900">{metric.value}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            Scheduled send
          </p>
          <p className="text-xs font-medium text-gray-800">Thu, 6:30 PM</p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-medium text-primary">
          SMS
        </span>
      </div>
    </div>

    <div className="mt-auto pt-3">
      <button
        type="button"
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
      >
        Launch campaign
      </button>
      <p className="mt-1 text-center text-[11px] text-gray-500">Estimated 4 recovered bookings</p>
    </div>
  </div>
);

const CalendarScreen = (
  <div className="flex h-full flex-col bg-gray-50 p-4 text-gray-900">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-primary">
        <CalendarDays className="h-4 w-4" />
        <p className="text-xs font-semibold tracking-wide uppercase">Week calendar</p>
      </div>
      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
        83% utilised
      </span>
    </div>

    <div className="mb-3 grid grid-cols-5 gap-1">
      {CALENDAR_DAYS.map((day, index) => {
        const isActiveDay = day === "Wed";
        return (
          <div
            key={day}
            className={`rounded-lg py-1 text-center ${isActiveDay ? "bg-teal-100" : "bg-white border border-gray-200"}`}
          >
            <p className="text-[10px] font-medium text-gray-500">{day}</p>
            <p className={`text-[11px] font-semibold ${isActiveDay ? "text-teal-700" : "text-gray-700"}`}>
              {19 + index}
            </p>
          </div>
        );
      })}
    </div>

    <div className="space-y-1.5">
      {CALENDAR_SLOTS.map((slot) => (
        <div
          key={`${slot.time}-${slot.label}`}
          className={`rounded-lg border px-2.5 py-1.5 ${getSlotStyles(slot.state)}`}
        >
          <p className="text-[10px] font-semibold">{slot.time}</p>
          <p className="text-[11px]">{slot.label}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
        Openings to recover
      </p>
      <div className="mt-2 space-y-1.5">
        {CALENDAR_OPENINGS.map((opening) => (
          <div key={opening} className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
            {opening}
          </div>
        ))}
      </div>
    </div>

    <div className="mt-auto pt-3">
      <p className="rounded-full bg-gray-100 px-3 py-1.5 text-center text-xs font-medium text-gray-600">
        2 cancellation windows detected
      </p>
    </div>
  </div>
);

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

const reducedMotionVariants = {
  enter: {},
  center: {},
  exit: {},
};

function renderPhoneScreen(screen: SlideScreen) {
  if (screen === "NoShowScreen") {
    return NoShowScreen;
  }
  if (screen === "MarketingScreen") {
    return MarketingScreen;
  }
  return CalendarScreen;
}

export default function FeaturesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const reducedMotion = useReducedMotion();

  const setSlide = (index: number) => {
    if (index === activeIndex) {
      return;
    }
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -50 && activeIndex < SLIDES.length - 1) {
      setDirection(1);
      setActiveIndex((value) => value + 1);
    } else if (info.offset.x > 50 && activeIndex > 0) {
      setDirection(-1);
      setActiveIndex((value) => value - 1);
    }
  };

  const activeSlide = SLIDES[activeIndex] ?? SLIDES[0]!;

  return (
    <section id="features" className="bg-bg-dark-secondary py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            Product features
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white">Everything you need to run a full calendar</h2>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              onClick={() => setSlide(index)}
              className={
                index === activeIndex
                  ? "cursor-pointer rounded-full bg-primary px-5 py-2 text-sm text-white transition-colors duration-200"
                  : "bg-bg-dark-secondary text-text-muted hover:border-primary/40 cursor-pointer rounded-full border border-white/10 px-5 py-2 text-sm transition-colors duration-200"
              }
            >
              {slide.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mb-12 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / SLIDES.length) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={reducedMotion ? reducedMotionVariants : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="grid cursor-grab grid-cols-1 items-center gap-12 active:cursor-grabbing lg:grid-cols-2"
          >
            <div>
              <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
                {activeSlide.label}
              </p>
              <h3 className="mb-4 text-3xl font-bold text-white">{activeSlide.title}</h3>
              <p className="mb-6 text-base leading-relaxed text-text-muted">{activeSlide.description}</p>
              <ul className="space-y-3">
                {activeSlide.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-base text-text-muted">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <PhoneMockup>
                {renderPhoneScreen(activeSlide.phoneScreen)}
              </PhoneMockup>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
