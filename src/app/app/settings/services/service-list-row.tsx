"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type ServiceBadgeProps = {
  icon: string;
  label: string;
  tone: "default" | "hidden" | "inactive";
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function ServiceBadge({ icon, label, tone }: ServiceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em]",
        tone === "default" && "bg-secondary/20 text-secondary-foreground shadow-sm",
        tone === "hidden" &&
          "border border-on-surface-variant/10 bg-al-surface-high text-on-surface-variant",
        tone === "inactive" && "bg-al-error-container text-al-on-error-container",
      )}
    >
      <span
        aria-hidden="true"
        className="material-symbols-outlined text-[11px]"
      >
        {icon}
      </span>
      {label}
    </span>
  );
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

  const hasAttentionState = service.isHidden || !service.isActive;
  const showCopyLink = service.isActive;

  const setCopyStateWithReset = (nextState: "copied" | "error", durationMs: number) => {
    setCopyState(nextState);
    window.setTimeout(() => {
      setCopyState((current) => (current === nextState ? "idle" : current));
    }, durationMs);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shopContext.bookingBaseUrl}?service=${service.id}`);
      setCopyStateWithReset("copied", 1600);
    } catch {
      setCopyStateWithReset("error", 2200);
    }
  };

  // BOUNDARY: R2.4 requires the currently selected row to remain visually distinct.
  const rowClasses = cn(
    "group relative rounded-[1.5rem] border p-5 transition",
    isSelected &&
      "border-primary/10 bg-white shadow-[0px_20px_40px_rgba(26,28,27,0.06)] ring-1 ring-primary/5 dark:bg-slate-900",
    !isSelected &&
      !hasAttentionState &&
      "border-transparent bg-al-surface-low/50 hover:bg-al-surface-low dark:bg-slate-800/30 dark:hover:bg-slate-800/50",
    !isSelected &&
      hasAttentionState &&
      "border-on-surface-variant/10 bg-al-surface-low/80 hover:border-on-surface-variant/20 dark:bg-slate-800/30",
  );

  return (
    <div className="flex flex-col gap-2">
      <article className={cn(rowClasses, "flex items-start gap-3")}>
        <motion.button
          type="button"
          onClick={() => onSelect(service.id)}
          className="min-w-0 flex flex-1 rounded-[1rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={cn(
                    "truncate text-base font-extrabold tracking-tight",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {service.name}
                </h3>
                {service.isDefault ? (
                  <ServiceBadge
                    icon="star"
                    label="Default"
                    tone="default"
                  />
                ) : null}
              </div>

              {hasAttentionState ? (
                <div className="flex flex-wrap gap-2">
                  {service.isHidden ? (
                    <ServiceBadge
                      icon="visibility_off"
                      label="Hidden"
                      tone="hidden"
                    />
                  ) : null}
                  {!service.isActive ? (
                    <ServiceBadge
                      icon="pause_circle"
                      label="Inactive"
                      tone="inactive"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-on-surface-variant/70",
                hasAttentionState && "text-on-surface-variant/80",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[15px] opacity-50"
                >
                  schedule
                </span>
                {service.durationMinutes}m
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[15px] opacity-50"
                >
                  payments
                </span>
                {depositLabel}
              </span>
            </div>
          </div>
        </motion.button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Open actions for ${service.name}`}
              className={cn(
                "mt-0.5 shrink-0 rounded-full border border-on-surface-variant/10 bg-white/80 p-2 text-on-surface-variant transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-slate-900/80",
                "opacity-100 xl:pointer-events-none xl:opacity-0 xl:group-hover:pointer-events-auto xl:group-hover:opacity-100 xl:group-focus-within:pointer-events-auto xl:group-focus-within:opacity-100",
                isSelected && "xl:pointer-events-auto xl:opacity-100",
                (copyState !== "idle" || restorePending) && "xl:pointer-events-auto xl:opacity-100",
              )}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px]"
              >
                more_horiz
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl border-on-surface-variant/10 bg-white/95 p-2 shadow-[0px_20px_40px_rgba(26,28,27,0.08)] dark:bg-slate-900/95"
          >
            {hasAttentionState ? (
              <>
                <DropdownMenuItem
                  disabled={restorePending || savePending}
                  onSelect={() => onRestore(service.id)}
                  className="rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px]"
                  >
                    settings_backup_restore
                  </span>
                  {restorePending ? "Restoring..." : "Restore service"}
                </DropdownMenuItem>
                {showCopyLink ? <DropdownMenuSeparator /> : null}
              </>
            ) : null}

            {showCopyLink ? (
              <DropdownMenuItem
                onSelect={() => {
                  void handleCopyLink();
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px]"
                >
                  link
                </span>
                {copyState === "copied" ? "Copied to clipboard" : "Copy booking link"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </article>

      {copyState !== "idle" ? (
        <div className="pl-2 text-[10px] font-extrabold uppercase tracking-widest">
          {copyState === "copied" ? (
            <span className="text-primary/70">Booking link copied</span>
          ) : (
            <span className="text-error">Copy failed</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
