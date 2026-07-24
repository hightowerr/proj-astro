import { CustomersEditorial } from "@/components/customers/customers-editorial";
import { listCustomersForShop } from "@/lib/queries/customers";
import { requireShopAuth } from "@/lib/session";

// --- types ------------------------------------------------------------------

export type SerializedCustomer = {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  tier: "top" | "neutral" | "risk" | null;
  score: number | null;
  // stats mapped from ScoringStats
  onTime: number;    // stats.settled
  late: number;      // stats.lateCancels + stats.refunded
  noShow: number;    // stats.voided
  voids90d: number;  // stats.voidedLast90Days
  total: number;     // onTime + late + noShow
  formattedUpdated: string | null; // "Apr 27"
};

// --- helpers ----------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("");
}

function fmtUpdated(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

// --- page -------------------------------------------------------------------

export default async function CustomersPage() {
  const { shop } = await requireShopAuth();

  const customers = await listCustomersForShop(shop.id);

  const serialized: SerializedCustomer[] = customers.map((c) => {
    const onTime = c.stats?.settled ?? 0;
    const late = (c.stats?.lateCancels ?? 0) + (c.stats?.refunded ?? 0);
    const noShow = c.stats?.voided ?? 0;
    const voids90d = c.stats?.voidedLast90Days ?? 0;
    return {
      id: c.id,
      fullName: c.fullName,
      initials: getInitials(c.fullName),
      email: c.email,
      phone: c.phone,
      tier: c.tier ?? null,
      score: c.score,
      onTime,
      late,
      noShow,
      voids90d,
      total: onTime + late + noShow,
      formattedUpdated: c.computedAt ? fmtUpdated(c.computedAt) : null,
    };
  });

  return (
    <div className="al-page">
      {/* Page header */}
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <div className="al-eyebrow opacity-55">
            Reliability registry
          </div>
          <div className="al-page-title">
            Customers
          </div>
          <div className="al-lede max-w-[62ch]">
            Reliability scores and tier assignments for every customer who has booked through
            your link. All data is computed from booking history.
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            className="border border-al-outline-variant/40 bg-transparent px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-al-on-surface-variant cursor-pointer inline-flex items-center gap-1.5 font-[inherit]"
          >
            <span className="material-symbols-outlined text-base leading-none inline-flex items-center">download</span>
            Export CSV
          </button>
          <button
            type="button"
            className="border-none bg-gradient-to-br from-[var(--al-primary)] to-[#003366] text-white px-5 py-[13px] rounded-xl text-[13px] font-bold cursor-pointer shadow-[0_14px_28px_rgba(0,30,64,.2)] inline-flex items-center gap-2 font-[inherit]"
          >
            <span className="material-symbols-outlined text-base leading-none inline-flex items-center">ios_share</span>
            Share booking link
          </button>
        </div>
      </div>

      {/* Editorial list */}
      <CustomersEditorial customers={serialized} />
    </div>
  );
}
