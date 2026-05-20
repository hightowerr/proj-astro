import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PaymentsTable } from "@/components/billing/payments-table";
import type { BillingStats } from "@/lib/queries/billing";
import { getBillingData } from "@/lib/queries/billing";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function BillingSummaryCards({ stats, currency }: { stats: BillingStats; currency: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <article className="relative overflow-hidden rounded-2xl bg-al-surface-lowest p-6 group hover:bg-al-surface-container transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-al-primary">
            account_balance_wallet
          </span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-al-on-surface-variant mb-2">
          Collected (this month)
        </h3>
        <p className="text-4xl font-extrabold tabular-nums text-al-primary">
          {formatCurrency(stats.collectedCents, currency)}
        </p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-amber-50 p-6 group hover:bg-amber-50/80 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-amber-700">
            hourglass_top
          </span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-amber-700 mb-2">
          Pending Deposits
        </h3>
        <p className="text-4xl font-extrabold tabular-nums text-amber-800">
          {formatCurrency(stats.pendingCents, currency)}
        </p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-red-50 p-6 border border-red-100 group hover:bg-red-50/80 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-red-600">
            undo
          </span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-red-600 mb-2">
          Refunds Issued (this month)
        </h3>
        <p className="text-4xl font-extrabold tabular-nums text-red-700">
          {formatCurrency(stats.refundedCents, currency)}
        </p>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-al-surface-lowest p-6 group hover:bg-al-surface-container transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-6xl text-al-primary">
            error_outline
          </span>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-al-on-surface-variant mb-2">
          Failed Payments (this month)
        </h3>
        <p className="text-4xl font-extrabold tabular-nums text-al-primary">
          {stats.failedCount}
        </p>
      </article>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div className="rounded-2xl bg-al-surface-lowest p-8 animate-pulse">
      <div className="h-4 bg-al-surface-container rounded w-1/4 mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 py-4 border-b border-al-surface-container-low last:border-0"
        >
          <div className="w-10 h-10 rounded-full bg-al-surface-container shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-al-surface-container rounded w-1/3" />
            <div className="h-3 bg-al-surface-container rounded w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BillingPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    redirect("/app");
  }

  const { stats, payments } = await getBillingData(shop.id);
  const currency = payments[0]?.currency ?? "USD";

  return (
    <div className="min-h-screen bg-al-surface-low">
      <div className="px-12 pb-24 max-w-7xl mx-auto space-y-16 py-10">
        <section className="space-y-4">
          <h2 className="text-[3.5rem] font-bold text-al-primary tracking-tighter leading-tight font-manrope">
            Billing & Payments
          </h2>
          <p className="text-al-on-surface-variant text-lg max-w-2xl leading-relaxed">
            Payment history, refund management, and deposit reconciliation for{" "}
            {shop.name}.
          </p>
        </section>

        <BillingSummaryCards stats={stats} currency={currency} />

        <Suspense fallback={<LedgerSkeleton />}>
          <PaymentsTable payments={payments} />
        </Suspense>
      </div>
    </div>
  );
}
