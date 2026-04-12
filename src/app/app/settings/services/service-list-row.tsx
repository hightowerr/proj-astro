"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ServiceRow, ShopContext } from "./types";

type ServiceListRowProps = {
  service: ServiceRow;
  shopContext: ShopContext;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  restorePending: boolean;
  savePending: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function ServiceListRow({
  service,
  shopContext,
  isSelected,
  onSelect,
  onRestore,
  restorePending,
  savePending,
}: ServiceListRowProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const depositLabel =
    service.depositAmountCents !== null
      ? formatCents(service.depositAmountCents)
      : shopContext.defaultDepositCents !== null
        ? `Policy default (${formatCents(shopContext.defaultDepositCents)})`
        : "Policy default";

  // Inactive / hidden services render with the dimmed treatment and expose the Restore control.
  const isDimmed = service.isHidden || !service.isActive;
  const showRestore = isDimmed;
  const showCopyLink = service.isActive;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shopContext.bookingBaseUrl}?service=${service.id}`);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState((current) => (current === "copied" ? "idle" : current));
      }, 1600);
    } catch {
      setCopyState("error");
    }
  };

  // BOUNDARY: R2.4 requires the currently selected row to remain visually distinct — selected rows
  // render with a 2px navy border while unselected active rows fall back to a soft warm outline.
  const rowClasses = cn(
    "group relative rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors shadow-sm cursor-pointer text-left w-full",
    isSelected && "bg-white border-2",
    !isSelected && !isDimmed && "bg-white border hover:border-[rgba(0,30,64,0.30)]",
    isDimmed && "border opacity-60",
  );

  const rowStyle = {
    borderColor: isSelected ? "var(--al-primary)" : "rgba(195, 198, 209, 0.35)",
    background: isDimmed ? "var(--al-surface-container-low)" : "#ffffff",
  } as const;

  return (
    <article className="flex flex-col gap-2">
      <motion.button
        type="button"
        onClick={() => onSelect(service.id)}
        className={rowClasses}
        style={rowStyle}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Animated selection accent */}
        <motion.span
          className="absolute left-1.5 top-4 bottom-4 w-0.5 rounded-full pointer-events-none"
          style={{ background: "var(--al-primary)" }}
          initial={false}
          animate={{ scaleY: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3
              className="font-bold truncate"
              style={{ color: "var(--al-primary)" }}
            >
              {service.name}
            </h3>
            {service.isDefault ? (
              <span
                className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(213, 227, 255, 0.35)",
                  color: "var(--al-on-primary-fixed-variant)",
                }}
              >
                Default
              </span>
            ) : null}
            {service.isHidden ? (
              <span
                className="text-[8px] font-bold uppercase tracking-wider opacity-60"
                style={{ color: "var(--al-on-surface-variant)" }}
              >
                Hidden
              </span>
            ) : null}
            {!service.isActive ? (
              <span
                className="text-[8px] font-bold uppercase tracking-wider opacity-60"
                style={{ color: "var(--al-on-surface-variant)" }}
              >
                Inactive
              </span>
            ) : null}
          </div>

          <div
            className="flex flex-wrap items-center gap-3 text-xs tabular-nums"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                schedule
              </span>
              {service.durationMinutes}m
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                payments
              </span>
              {depositLabel}
            </span>
          </div>

          {service.description ? (
            <p
              className="mt-1 line-clamp-2 text-xs text-pretty"
              style={{ color: "var(--al-on-surface-variant)" }}
            >
              {service.description}
            </p>
          ) : null}
        </div>

        <motion.span
          aria-hidden="true"
          className="material-symbols-outlined flex-shrink-0"
          style={{
            color: isSelected ? "var(--al-primary)" : "var(--al-on-surface-variant)",
          }}
          animate={{ opacity: isSelected ? 1 : 0.3 }}
          transition={{ duration: 0.18 }}
        >
          chevron_right
        </motion.span>
      </motion.button>

      {(showCopyLink || showRestore || copyState === "error") ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-5">
          {showCopyLink ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleCopyLink();
              }}
              className="text-xs font-bold underline underline-offset-2"
              style={{ color: "var(--al-primary)" }}
            >
              {copyState === "copied" ? "Copied" : "Copy link"}
            </button>
          ) : null}
          {showRestore ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRestore(service.id);
              }}
              disabled={restorePending || savePending}
              className={cn(
                "text-xs font-bold underline underline-offset-2",
                (restorePending || savePending) && "cursor-not-allowed opacity-60",
              )}
              style={{ color: "var(--al-primary)" }}
            >
              {/* BOUNDARY: R6.1 limits Restore to hidden or inactive services; R6.4 requires pending feedback inline. */}
              {restorePending ? "Restoring..." : "Restore"}
            </button>
          ) : null}
          {copyState === "error" ? (
            <span className="text-xs" style={{ color: "var(--al-error)" }}>
              Copy failed
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
