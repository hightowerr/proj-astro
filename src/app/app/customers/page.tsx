import { CustomersEditorial } from "@/components/customers/customers-editorial";
import { listCustomersForShop } from "@/lib/queries/customers";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

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

const Icon = ({ name }: { name: string }) => (
  <span
    className="material-symbols-outlined"
    style={{
      fontSize: 16,
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
    }}
  >
    {name}
  </span>
);

// --- page -------------------------------------------------------------------

export default async function CustomersPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div style={{ fontFamily: "'Manrope', system-ui, sans-serif", padding: "40px 48px" }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#001e40" }}>Customers</div>
        <p style={{ color: "#43474f", marginTop: 8 }}>
          Create your shop to start managing customers.
        </p>
      </div>
    );
  }

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
    <div
      style={{
        padding: "32px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "#43474f",
              opacity: 0.55,
            }}
          >
            Reliability registry
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-.025em",
              color: "#001e40",
              lineHeight: 1.0,
            }}
          >
            Customers
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#43474f",
              maxWidth: "62ch",
              lineHeight: 1.55,
            }}
          >
            Reliability scores and tier assignments for every customer who has booked through
            your link. All data is computed from booking history.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={{
              border: "1px solid rgba(195,198,209,.4)",
              background: "transparent",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "#43474f",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <Icon name="download" />
            Export CSV
          </button>
          <button
            type="button"
            style={{
              border: "none",
              background: "linear-gradient(135deg, #001e40, #003366)",
              color: "#fff",
              padding: "13px 20px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 14px 28px rgba(0,30,64,.2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Icon name="ios_share" />
            Share booking link
          </button>
        </div>
      </div>

      {/* Editorial list */}
      <CustomersEditorial customers={serialized} />
    </div>
  );
}
