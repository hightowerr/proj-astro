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

  // BOUNDARY: R2.4 requires the currently selected row to remain visually distinct.
  const rowClasses = cn(
    "group relative rounded-[1.5rem] p-6 flex items-center justify-between gap-4 transition cursor-pointer text-left w-full",
    isSelected && "bg-white dark:bg-slate-900 shadow-[0px_20px_40px_rgba(26,28,27,0.06)] ring-1 ring-primary/5",
    !isSelected && !isDimmed && "bg-al-surface-low/50 dark:bg-slate-800/30 hover:bg-al-surface-low dark:hover:bg-slate-800/50",
    isDimmed && "bg-stone-100/40 dark:bg-slate-800/20 opacity-50",
  );

  return (
    <article className="flex flex-col gap-2">
      <motion.button
        type="button"
        onClick={() => onSelect(service.id)}
        className={rowClasses}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3
              className={cn(
                "font-bold truncate text-base tracking-tight",
                isSelected ? "text-primary" : "text-foreground",
                isDimmed && "text-foreground",
              )}
            >
              {service.name}
            </h3>
            {service.isDefault ? (
              <span
                className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[9px] font-extrabold uppercase tracking-widest shadow-sm"
              >
                Default
              </span>
            ) : null}
            {service.isHidden ? (
              <span
                className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant/50"
              >
                Hidden
              </span>
            ) : null}
            {!service.isActive && !service.isHidden ? (
              <span
                className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant/50"
              >
                Inactive
              </span>
            ) : null}
          </div>

          {!isDimmed && (
            <div
              className="flex gap-4 text-xs font-medium text-on-surface-variant opacity-70"
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[16px] opacity-50"
                >
                  schedule
                </span>
                {service.durationMinutes}m
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[16px] opacity-50"
                >
                  payments
                </span>
                {depositLabel}
              </span>
            </div>
          )}
        </div>

        {!isDimmed ? (
          <span
            aria-hidden="true"
            className={cn(
              "material-symbols-outlined transition-transform duration-300",
              isSelected ? "text-primary scale-110" : "text-on-surface-variant opacity-20 group-hover:opacity-40",
            )}
          >
            arrow_forward
          </span>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRestore(service.id);
            }}
            disabled={restorePending || savePending}
            className={cn(
              "text-[11px] font-extrabold uppercase tracking-widest text-primary underline underline-offset-4 hover:opacity-70 transition-opacity",
              (restorePending || savePending) && "cursor-not-allowed opacity-40",
            )}
          >
            {restorePending ? "Restoring..." : "Restore"}
          </button>
        )}
      </motion.button>

      {showCopyLink && !isDimmed ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pl-6">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleCopyLink();
            }}
            className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60 hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            {copyState === "copied" ? "Copied to clipboard" : "Copy booking link"}
          </button>
          {copyState === "error" ? (
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-error">
              Copy failed
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
