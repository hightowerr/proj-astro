"use client";

import { motion, useReducedMotion } from "framer-motion";

type FloatCardProps = {
  value: string;
  label: string;
  className?: string;
  delay?: number;
};

export function FloatCard({ value, label, className, delay }: FloatCardProps) {
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.4, delay: delay ?? 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={transition}
      className={`absolute flex items-center gap-3 rounded-xl border border-white/10 bg-bg-dark-secondary/90 px-4 py-3 shadow-lg backdrop-blur-sm ${className ?? ""}`}
    >
      <div>
        <div className="text-2xl font-extrabold text-white">{value}</div>
        <div className="text-xs text-text-light-muted">{label}</div>
      </div>
    </motion.div>
  );
}
