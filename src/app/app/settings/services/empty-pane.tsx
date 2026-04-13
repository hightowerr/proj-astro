"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type EmptyPaneProps = {
  addNewDisabled?: boolean;
  hasServices: boolean;
  onAddNew: () => void;
  orientationHint?: string;
  summary?: {
    active: number;
    hidden: number;
    inactive: number;
    total: number;
  };
};

type SummaryStatProps = {
  label: string;
  value: number;
};

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <div className="rounded-[1.5rem] border border-on-surface-variant/10 bg-al-surface-low px-5 py-4 text-left">
      <p
        className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-50"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 font-[family-name:var(--al-font-headline)] text-3xl font-extrabold tracking-tight"
        style={{ color: "var(--al-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function EmptyPane({
  addNewDisabled = false,
  hasServices,
  onAddNew,
  orientationHint,
  summary,
}: EmptyPaneProps) {
  const title = hasServices ? "Your catalog at a glance" : "Get started with services";
  const message = hasServices
    ? "Review your current mix of active, hidden, and inactive services before you jump into an edit."
    : "Services tell customers what they can book, how long it takes, and whether a deposit is required.";

  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center p-6 sm:p-10">
      <motion.div
        className="w-full max-w-xl space-y-8 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined mx-auto block animate-float"
          style={{ fontSize: "2.5rem", color: "var(--al-outline-variant)" }}
        >
          inventory_2
        </span>
        <p
          className="font-[family-name:var(--al-font-headline)] text-2xl font-extrabold text-balance"
          style={{ color: "var(--al-primary)" }}
        >
          {title}
        </p>
        <p
          className="text-sm text-pretty sm:text-base"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          {message}
        </p>

        {hasServices && summary ? (
          <div className="grid gap-4 text-left sm:grid-cols-2">
            <SummaryStat label="Services" value={summary.total} />
            <SummaryStat label="Active" value={summary.active} />
            <SummaryStat label="Hidden" value={summary.hidden} />
            <SummaryStat label="Inactive" value={summary.inactive} />
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={onAddNew}
            disabled={addNewDisabled}
            variant="al-primary"
            className="min-w-44 rounded-2xl px-8 py-6 text-[11px] font-extrabold uppercase tracking-[0.2em]"
          >
            Add New Service
          </Button>
          {hasServices && orientationHint ? (
            <p
              className="text-sm"
              style={{ color: "var(--al-on-surface-variant)" }}
            >
              {orientationHint}
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
