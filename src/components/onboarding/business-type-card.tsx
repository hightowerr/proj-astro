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
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(value)}
      className={`
        relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6
        transition-all duration-200
        focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-dark focus:outline-none
        ${
          selected
            ? "border-2 border-primary bg-primary/5 shadow-xl shadow-primary/10"
            : "border-white/10 bg-bg-dark-secondary hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5"
        }
      `}
      aria-pressed={selected}
      type="button"
    >
      {selected ? (
        <span className="absolute top-3 right-3 rounded-full border border-primary/40 bg-primary/20 p-1 text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
      <Icon
        className={`h-12 w-12 transition-colors duration-200 ${
          selected ? "text-primary" : "text-text-muted"
        }`}
        aria-hidden
      />
      <span className="text-base font-semibold text-white">{label}</span>
    </motion.button>
  );
}
