"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { issueRefundAction } from "@/app/app/settings/billing/actions";
import type { BillingPaymentRow } from "@/lib/queries/billing";
import { stripeDashboardLink } from "@/lib/stripe";
import { cn } from "@/lib/utils";

type StatusFilter =
  | "all"
  | "succeeded"
  | "failed"
  | "processing"
  | "requires_payment_method"
  | "requires_action"
  | "canceled";
type SortField = "date" | "amount";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: BillingPaymentRow["status"] }) {
  const config: Record<
    BillingPaymentRow["status"],
    { label: string; className: string }
  > = {
    succeeded: {
      label: "Succeeded",
      className: "bg-green-100 text-green-800",
    },
    failed: { label: "Failed", className: "bg-red-100 text-red-700" },
    canceled: {
      label: "Canceled",
      className: "bg-al-surface-container text-al-on-surface-variant",
    },
    processing: {
      label: "Processing",
      className: "bg-amber-100 text-amber-800",
    },
    requires_payment_method: {
      label: "Awaiting payment",
      className: "bg-amber-100 text-amber-800",
    },
    requires_action: {
      label: "Action needed",
      className: "bg-amber-100 text-amber-800",
    },
  };
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}

function OutcomeBadge({
  outcome,
}: {
  outcome: BillingPaymentRow["financialOutcome"];
}) {
  if (outcome === "unresolved") return null;
  const config: Partial<
    Record<
      BillingPaymentRow["financialOutcome"],
      { label: string; className: string }
    >
  > = {
    settled: { label: "Settled", className: "bg-green-50 text-green-700" },
    voided: {
      label: "Voided",
      className: "bg-al-surface-container text-al-on-surface-variant",
    },
    refunded: { label: "Refunded", className: "bg-blue-50 text-blue-700" },
    disputed: { label: "Disputed", className: "bg-red-50 text-red-700" },
  };
  const c = config[outcome];
  if (!c) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        c.className
      )}
    >
      {c.label}
    </span>
  );
}

function RefundRowAction({ row }: { row: BillingPaymentRow }) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    row.status,
    (_: BillingPaymentRow["status"], next: BillingPaymentRow["status"]) => next
  );
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRefund =
    optimisticStatus === "succeeded" &&
    !row.stripeRefundId &&
    row.financialOutcome !== "disputed";

  const refundTooltip = row.stripeRefundId
    ? "Already refunded"
    : row.financialOutcome === "disputed"
      ? "Payment is under dispute"
      : optimisticStatus !== "succeeded"
        ? "Payment not succeeded"
        : null;

  async function handleRefund() {
    if (isPending || !canRefund) return;
    setError(null);
    setMenuOpen(false);
    startTransition(async () => {
      setOptimisticStatus("processing");
      try {
        await issueRefundAction(row.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refund failed");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-al-on-surface-variant hover:bg-al-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-primary"
        aria-label="Row actions"
      >
        <span className="material-symbols-outlined text-[18px]">
          more_vert
        </span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-9 z-20 min-w-[200px] rounded-xl border border-al-outline-variant/20 bg-white shadow-lg py-1">
            <Link
              href={`/app/appointments/${row.appointmentId}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-al-primary hover:bg-al-surface-container transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-[16px]">
                calendar_month
              </span>
              View Appointment
            </Link>

            {row.stripePaymentIntentId ? (
              <a
                href={stripeDashboardLink(row.stripePaymentIntentId)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-al-primary hover:bg-al-surface-container transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <span className="material-symbols-outlined text-[16px]">
                  open_in_new
                </span>
                View in Stripe
              </a>
            ) : (
              <span className="flex items-center gap-3 px-4 py-2.5 text-sm text-al-on-surface-variant/50 cursor-not-allowed">
                <span className="material-symbols-outlined text-[16px]">
                  open_in_new
                </span>
                View in Stripe
              </span>
            )}

            <div className="my-1 border-t border-al-surface-container-low" />

            <button
              type="button"
              disabled={!canRefund || isPending}
              onClick={handleRefund}
              title={refundTooltip ?? undefined}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                canRefund && !isPending
                  ? "text-red-600 hover:bg-red-50"
                  : "text-al-on-surface-variant/40 cursor-not-allowed"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">
                undo
              </span>
              {isPending ? "Processing..." : "Issue Refund"}
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(row.id).catch(() => null);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-al-primary hover:bg-al-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                content_copy
              </span>
              Copy Payment ID
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="absolute right-0 top-10 z-30 mt-1 max-w-xs rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 shadow">
          {error}
        </p>
      )}
    </div>
  );
}

interface PaymentsTableProps {
  payments: BillingPaymentRow[];
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [, startTransition] = useTransition();

  const handleFilter = (value: StatusFilter) => {
    startTransition(() => setStatusFilter(value));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const visible = [...payments]
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .toSorted((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") {
        return dir * (a.createdAt.getTime() - b.createdAt.getTime());
      }
      return dir * (a.amountCents - b.amountCents);
    });

  return (
    <section className="space-y-6">
      <div className="border-b border-al-surface-container-high pb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.75rem] font-bold text-al-primary font-manrope leading-snug">
            Payment Ledger
          </h2>
          <p className="text-al-on-surface-variant text-sm mt-1">
            All deposits and payment activity for your studio.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => handleFilter(chip.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-colors",
                statusFilter === chip.value
                  ? "bg-[#ffdbcf] text-[#2a170f]"
                  : "bg-al-surface-container text-al-on-surface-variant hover:bg-al-surface-container-high"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl bg-al-surface-lowest p-8 text-center border border-al-surface-container-low">
          <p className="text-sm text-al-on-surface-variant">
            No payments match this filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden shadow-[0px_10px_30px_rgba(26,28,27,0.03)]">
          <table className="w-full">
            <thead>
              <tr className="bg-al-surface-container-low text-al-on-surface-variant text-xs uppercase tracking-widest border-b border-al-outline-variant/20 text-left">
                <th className="p-6 font-semibold">Customer</th>
                <th className="p-6 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("date")}
                    className="flex items-center gap-1 uppercase tracking-widest hover:text-al-primary transition-colors"
                  >
                    Date
                    <span className="material-symbols-outlined text-[14px] normal-case">
                      {sortField === "date"
                        ? sortDir === "asc"
                          ? "arrow_upward"
                          : "arrow_downward"
                        : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th className="p-6 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("amount")}
                    className="flex items-center gap-1 uppercase tracking-widest hover:text-al-primary transition-colors"
                  >
                    Amount
                    <span className="material-symbols-outlined text-[14px] normal-case">
                      {sortField === "amount"
                        ? sortDir === "asc"
                          ? "arrow_upward"
                          : "arrow_downward"
                        : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th className="p-6 font-semibold">Status</th>
                <th className="p-6 font-semibold">Outcome</th>
                <th className="p-6 font-semibold sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-al-surface-container-low bg-white">
              {visible.map((row) => {
                const initials = getInitials(row.customerName);
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-al-surface-container/30 transition-colors"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-al-surface-container-highest text-al-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-al-primary">
                            {row.customerName}
                          </div>
                          <div className="text-xs text-al-on-surface-variant mt-0.5">
                            {row.customerEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-medium text-foreground">
                        {format(new Date(row.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-al-on-surface-variant mt-0.5">
                        Appt: {format(new Date(row.appointmentStartsAt), "MMM d")}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="font-semibold tabular-nums text-al-primary">
                        {formatCurrency(row.amountCents, row.currency)}
                      </div>
                      {row.refundedAmountCents > 0 && (
                        <div className="text-xs text-red-600 mt-0.5">
                          −{formatCurrency(row.refundedAmountCents, row.currency)}{" "}
                          refunded
                        </div>
                      )}
                    </td>
                    <td className="p-6">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="p-6">
                      <OutcomeBadge outcome={row.financialOutcome} />
                    </td>
                    <td className="p-6">
                      <RefundRowAction row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
