"use client";

import { motion } from "framer-motion";

type EmptyPaneProps = {
  hasServices: boolean;
};

export function EmptyPane({ hasServices }: EmptyPaneProps) {
  const message = hasServices
    ? "Select a service to edit, or click Add New to create one."
    : "You don't have any services yet. Click Add New to create your first.";

  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center p-6 sm:p-10">
      <motion.div
        className="max-w-md space-y-4 text-center"
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
          {hasServices ? "Select a service to edit" : "No services yet"}
        </p>
        <p
          className="text-sm text-pretty sm:text-base"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          {message}
        </p>
      </motion.div>
    </div>
  );
}
