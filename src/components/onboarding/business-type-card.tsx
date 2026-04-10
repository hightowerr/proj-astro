"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type BusinessTypeCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  selected: boolean;
  onClick: (value: string) => void;
};

export function BusinessTypeCard({
  icon: Icon,
  label,
  value,
  selected,
  onClick,
}: BusinessTypeCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClick(value)}
      className={`
        relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-[var(--al-radius-2xl)] border p-8
        transition-all duration-300
        focus:ring-4 focus:ring-primary/10 focus:outline-none
        ${
          selected
            ? "border-2 border-primary bg-primary/5 shadow-[var(--al-shadow-float)]"
            : "border-border/40 bg-al-surface-low hover:border-primary/30 hover:shadow-[var(--al-shadow-float)]"
        }
      `}
      aria-pressed={selected}
      type="button"
    >
      {selected ? (
        <span className="absolute top-4 right-4 rounded-full border border-primary/40 bg-background p-1.5 text-primary shadow-[var(--al-shadow-float)]">
          <Check className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <div className={`rounded-[var(--al-radius-xl)] p-4 transition-all duration-300 ${
          selected ? "bg-primary/10" : "bg-background/50"
        }`}>
        <Icon
          className={`h-12 w-12 transition-colors duration-300 ${
            selected ? "text-primary" : "text-muted-foreground/60"
          }`}
          aria-hidden
        />
      </div>
      <span className={`font-manrope text-base font-bold transition-colors duration-300 ${
        selected ? "text-primary" : "text-primary/70"
      }`}>{label}</span>
    </motion.button>
  );
}
