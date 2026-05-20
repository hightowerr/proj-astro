"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SerializedCustomer = {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  tier: "top" | "neutral" | "risk" | null;
  score: number | null;
  onTime: number;
  late: number;
  noShow: number;
  voids90d: number;
  total: number;
  formattedUpdated: string | null;
};

type CustomersEditorialProps = {
  customers: SerializedCustomer[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT = "'Manrope', system-ui, sans-serif";

const TIERS = {
  top: {
    label: "Top",
    bg: "rgba(14,122,85,0.10)",
    fg: "#0e7a55",
    dot: "#0e7a55",
    avBg: "linear-gradient(135deg,#d3ead7,#a9d4b3)",
    avFg: "#0e4a31",
  },
  neutral: {
    label: "Neutral",
    bg: "#eeeeec",
    fg: "#43474f",
    dot: "#737780",
    avBg: "#eeeeec",
    avFg: "#43474f",
  },
  risk: {
    label: "Risk",
    bg: "rgba(168,41,74,0.10)",
    fg: "#a8294a",
    dot: "#a8294a",
    avBg: "linear-gradient(135deg,#fdd8cb,#e2bfb3)",
    avFg: "#572411",
  },
} as const;

type TierKey = keyof typeof TIERS;
type TierFilter = "all" | TierKey;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Icon({
  name,
  size = 16,
  fill = false,
}: {
  name: string;
  size?: number;
  fill?: boolean;
}) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {name}
    </span>
  );
}

function Avatar({
  initials,
  tier,
  size = 42,
}: {
  initials: string;
  tier: TierKey;
  size?: number;
}) {
  const t = TIERS[tier];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: t.avBg,
        color: t.avFg,
        display: "grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.32),
        fontWeight: 800,
        letterSpacing: ".04em",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function TierPill({
  tier,
  size = "md",
}: {
  tier: TierKey;
  size?: "sm" | "md";
}) {
  const t = TIERS[tier];
  const pad = size === "sm" ? "3px 9px" : "4px 10px";
  const fs = size === "sm" ? 9 : 10;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: 9999,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: ".18em",
        textTransform: "uppercase" as const,
        background: t.bg,
        color: t.fg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: t.dot,
          flexShrink: 0,
        }}
      />
      {t.label}
    </span>
  );
}

function ScoreCell({
  score,
  tier,
}: {
  score: number | null;
  tier: TierKey | null;
}) {
  if (score == null) {
    return (
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#43474f",
          opacity: 0.5,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        —
      </span>
    );
  }
  const dot = tier ? TIERS[tier].dot : "#737780";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-.03em",
          color: tier ? TIERS[tier].fg : "#43474f",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {score}
        <span
          style={{
            fontSize: 13,
            color: "#43474f",
            opacity: 0.55,
            fontWeight: 700,
            marginLeft: 3,
          }}
        >
          /100
        </span>
      </div>
      <div
        style={{
          width: 90,
          height: 4,
          background: "#eeeeec",
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: dot,
            borderRadius: 9999,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reliability bar + legend
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  value,
  valueColor,
  dim,
}: {
  color: string;
  label: string;
  value: number;
  valueColor?: string;
  dim?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        opacity: dim ? 0.55 : 1,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}{" "}
      <strong
        style={{
          color: valueColor ?? "#001e40",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </strong>
    </span>
  );
}

function ReliabilitySegmented({
  onTime,
  late,
  noShow,
  voids90d,
  total,
}: {
  onTime: number;
  late: number;
  noShow: number;
  voids90d: number;
  total: number;
}) {
  const t = Math.max(total, 1);
  const pct = (n: number) => `${(n / t) * 100}%`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        gap: 8,
        minWidth: 0,
      }}
    >
      {/* Segmented bar */}
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 9999,
          overflow: "hidden",
          background: "#eeeeec",
        }}
      >
        {onTime > 0 && (
          <div
            style={{
              width: pct(onTime),
              background: "#0e7a55",
              transition: "width .25s",
            }}
            title={`On time \u00b7 ${onTime}`}
          />
        )}
        {late > 0 && (
          <div
            style={{
              width: pct(late),
              background: "#c97a2a",
              transition: "width .25s",
            }}
            title={`Late \u00b7 ${late}`}
          />
        )}
        {noShow > 0 && (
          <div
            style={{
              width: pct(noShow),
              background: "#a8294a",
              transition: "width .25s",
            }}
            title={`No-show \u00b7 ${noShow}`}
          />
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: "#43474f",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          flexWrap: "wrap" as const,
        }}
      >
        <LegendItem color="#0e7a55" label="On time" value={onTime} />
        <LegendItem color="#c97a2a" label="Late" value={late} />
        <LegendItem color="#a8294a" label="No-show" value={noShow} />
        <LegendItem
          color="#737780"
          label="Voids 90d"
          value={voids90d}
          valueColor={voids90d >= 2 ? "#a8294a" : "#001e40"}
          dim={voids90d === 0}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary strip
// ---------------------------------------------------------------------------

function SummaryCell({
  label,
  value,
  foot,
  color,
}: {
  label: string;
  value: number;
  foot: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: ".2em",
          textTransform: "uppercase" as const,
          color: "#43474f",
          opacity: 0.6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: "-.03em",
          color: color ?? "#001e40",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#43474f",
          opacity: 0.65,
          fontWeight: 600,
          marginTop: 8,
        }}
      >
        {foot}
      </div>
    </div>
  );
}

function SummaryDivider() {
  return (
    <div
      style={{
        width: 1,
        alignSelf: "stretch",
        background: "rgba(195,198,209,.30)",
        margin: "0 24px",
      }}
    />
  );
}

function SummaryStrip({
  customers,
}: {
  customers: SerializedCustomer[];
}) {
  const total = customers.length;
  const tops = customers.filter((c) => c.tier === "top").length;
  const neutral = customers.filter((c) => c.tier === "neutral").length;
  const risk = customers.filter((c) => c.tier === "risk").length;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "24px 28px",
        display: "flex",
        alignItems: "stretch",
        boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
      }}
    >
      <SummaryCell label="Customers" value={total} foot="In registry" />
      <SummaryDivider />
      <SummaryCell
        label="Top tier"
        value={tops}
        foot={`${total ? Math.round((tops / total) * 100) : 0}% of base`}
        color="#0e7a55"
      />
      <SummaryDivider />
      <SummaryCell
        label="Neutral"
        value={neutral}
        foot="Moderate history"
        color="#43474f"
      />
      <SummaryDivider />
      <SummaryCell
        label="Risk"
        value={risk}
        foot={risk ? "Need attention" : "None flagged"}
        color={risk ? "#a8294a" : "#43474f"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter strip
// ---------------------------------------------------------------------------

function FilterStrip({
  customers,
  active,
  onChange,
}: {
  customers: SerializedCustomer[];
  active: TierFilter;
  onChange: (f: TierFilter) => void;
}) {
  const counts: Record<TierFilter, number> = {
    all: customers.length,
    top: customers.filter((c) => c.tier === "top").length,
    neutral: customers.filter((c) => c.tier === "neutral").length,
    risk: customers.filter((c) => c.tier === "risk").length,
  };

  const opts: { key: TierFilter; label: string }[] = [
    { key: "all", label: "All customers" },
    { key: "top", label: "Top" },
    { key: "neutral", label: "Neutral" },
    { key: "risk", label: "Risk" },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap" as const,
        gap: 12,
        padding: "0 0 14px",
      }}
    >
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
        {opts.map((o) => {
          const isActive = active === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 9999,
                border: 0,
                background: isActive ? "#001e40" : "transparent",
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? "#fff" : "#43474f",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {o.label}
              <span
                style={{
                  marginLeft: 6,
                  opacity: isActive ? 0.85 : 0.55,
                }}
              >
                &middot; {counts[o.key]}
              </span>
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: "#43474f",
          opacity: 0.7,
        }}
      >
        <Icon name="autorenew" size={14} />
        Recomputed nightly
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiers explainer card
// ---------------------------------------------------------------------------

function TiersExplainer() {
  const rows = [
    {
      tier: "top" as TierKey,
      title: "Top tier",
      rule: "Score \u2265 80 and no voids in 90 days",
      note: "Reliable customers \u2014 bookings rarely require follow-up.",
    },
    {
      tier: "neutral" as TierKey,
      title: "Neutral tier",
      rule: "Default tier for customers with moderate history",
      note: "Mixed record; not enough signal to push to either edge.",
    },
    {
      tier: "risk" as TierKey,
      title: "Risk tier",
      rule: "Score < 40 or two or more voids in 90 days",
      note: "Consider requiring a deposit before confirming bookings.",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: "28px 28px 24px",
        boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
      }}
    >
      {/* Head */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".2em",
              textTransform: "uppercase" as const,
              color: "#43474f",
              opacity: 0.55,
            }}
          >
            Reference
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-.02em",
              color: "#001e40",
              marginTop: 4,
            }}
          >
            Understanding tiers
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "#43474f",
            opacity: 0.7,
          }}
        >
          <Icon name="schedule" size={14} />
          Recomputed nightly &middot; Last 180 days
        </div>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 18,
        }}
      >
        {rows.map((r) => {
          const t = TIERS[r.tier];
          return (
            <div
              key={r.tier}
              style={{
                background: "#f9f9f7",
                borderRadius: 16,
                padding: "18px 20px 16px",
                border: "1px solid rgba(195,198,209,.20)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <TierPill tier={r.tier} />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#001e40",
                    letterSpacing: "-.015em",
                  }}
                >
                  {r.title}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.fg,
                  lineHeight: 1.4,
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(195,198,209,.25)",
                }}
              >
                {r.rule}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#43474f",
                  lineHeight: 1.55,
                  marginTop: 8,
                }}
              >
                {r.note}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "#43474f",
          opacity: 0.75,
          paddingTop: 14,
          borderTop: "1px solid rgba(195,198,209,.25)",
          fontStyle: "italic",
        }}
      >
        Scores are recomputed nightly using booking outcomes from the last 180
        days.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyCustomers() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: "72px 32px 56px",
        textAlign: "center" as const,
        boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
      }}
    >
      {/* Stacked card illustration */}
      <div
        style={{
          width: 240,
          height: 140,
          margin: "0 auto 22px",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 130,
            height: 128,
            borderRadius: 14,
            padding: "14px 16px",
            border: "1px solid rgba(195,198,209,.30)",
            background: "#eeeeec",
            transform: "translate(-22px, 6px) rotate(-7deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 130,
            height: 128,
            borderRadius: 14,
            padding: "14px 16px",
            border: "1px solid rgba(195,198,209,.30)",
            background: "#fff",
            boxShadow: "0 8px 18px rgba(26,28,27,.06)",
            transform: "translate(0, 0) rotate(0deg)",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9999,
              background: "linear-gradient(135deg,#fdd8cb,#e2bfb3)",
            }}
          />
          <div
            style={{
              width: 48,
              height: 6,
              borderRadius: 9999,
              background: "#e2e3e1",
              marginTop: 10,
            }}
          />
          <div
            style={{
              width: 32,
              height: 6,
              borderRadius: 9999,
              background: "#eeeeec",
              marginTop: 6,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            width: 130,
            height: 128,
            borderRadius: 14,
            padding: "14px 16px",
            border: "1px solid rgba(195,198,209,.30)",
            background: "#eeeeec",
            transform: "translate(22px, 6px) rotate(7deg)",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#001e40",
          letterSpacing: "-.02em",
        }}
      >
        No customers yet
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#43474f",
          marginTop: 10,
          maxWidth: 480,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.55,
        }}
      >
        Customers appear here once they book through your link. Each entry is
        computed automatically from booking history &mdash; you don&apos;t add
        them manually.
      </div>

      <div
        style={{
          margin: "24px auto 0",
          maxWidth: 440,
          background: "#f4f4f2",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            gap: 4,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".2em",
              textTransform: "uppercase" as const,
              color: "#43474f",
              opacity: 0.6,
            }}
          >
            Booking link
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#001e40",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}
          >
            Share your booking link to get started
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function CustomersEditorial({ customers }: CustomersEditorialProps) {
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const filtered =
    tierFilter === "all"
      ? customers
      : customers.filter((c) => c.tier === tierFilter);

  const emptyFilterState = filtered.length === 0 && customers.length > 0;

  return (
    <div
      style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}
    >
      {/* Summary strip */}
      {customers.length > 0 && <SummaryStrip customers={customers} />}

      {/* Body content */}
      {customers.length === 0 ? (
        <EmptyCustomers />
      ) : (
        <>
          <FilterStrip
            customers={customers}
            active={tierFilter}
            onChange={setTierFilter}
          />

          {/* Editorial sheet */}
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0px 20px 40px rgba(26,28,27,0.04)",
            }}
          >
            {/* Sheet head */}
            <div
              style={{
                padding: "18px 22px 6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap" as const,
                gap: 10,
                borderBottom: "1px solid rgba(195,198,209,.20)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".2em",
                    textTransform: "uppercase" as const,
                    color: "#43474f",
                    opacity: 0.55,
                  }}
                >
                  Registry
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#43474f",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {filtered.length} of {customers.length} customer
                  {customers.length === 1 ? "" : "s"}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#43474f",
                  opacity: 0.6,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                }}
              >
                Ordered by score &darr;
              </div>
            </div>

            {/* Column hint */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "10px 22px",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".2em",
                textTransform: "uppercase" as const,
                color: "#43474f",
                opacity: 0.55,
                background: "#f9f9f7",
                borderBottom: "1px solid rgba(195,198,209,.20)",
              }}
            >
              <div style={{ flex: "1.7 1 0", minWidth: 0 }}>Customer</div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>Score</div>
              <div style={{ flex: "2.4 1 0", minWidth: 0 }}>
                Reliability &middot; last 180 days
              </div>
              <div
                style={{
                  flex: "0 0 100px",
                  textAlign: "right" as const,
                }}
              >
                Updated
              </div>
              <div
                style={{
                  flex: "0 0 84px",
                  textAlign: "right" as const,
                }}
              >
                Details
              </div>
            </div>

            {/* Empty filter state */}
            {emptyFilterState ? (
              <div
                style={{
                  padding: "56px 24px",
                  textAlign: "center" as const,
                }}
              >
                <Icon name="filter_alt_off" size={28} />
                <div
                  style={{
                    marginTop: 10,
                    color: "#001e40",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  No customers in this tier
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: "#43474f",
                    fontSize: 12,
                  }}
                >
                  Try &quot;All customers&quot; to see the full registry.
                </div>
              </div>
            ) : (
              filtered.map((c, i) => {
                const tier = (c.tier ?? "neutral") as TierKey;
                const isHovered = hoverRow === c.id;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "18px 22px",
                      borderTop:
                        i > 0
                          ? "1px solid rgba(195,198,209,.20)"
                          : undefined,
                      background: isHovered ? "#f9f9f7" : "transparent",
                      transition: "background .12s",
                    }}
                    onMouseEnter={() => setHoverRow(c.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    {/* Customer cell */}
                    <div
                      style={{
                        flex: "1.7 1 0",
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <Avatar initials={c.initials} tier={tier} size={42} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap" as const,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: "#1a1c1b",
                              letterSpacing: "-.015em",
                            }}
                          >
                            {c.fullName}
                          </div>
                          <TierPill tier={tier} size="sm" />
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              color: "#43474f",
                              opacity: 0.6,
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Icon
                              name={c.email ? "mail" : "phone"}
                              size={14}
                            />
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#43474f",
                              fontWeight: 500,
                              whiteSpace: "nowrap" as const,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {c.email || c.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score cell */}
                    <div style={{ flex: "1 1 0", minWidth: 0 }}>
                      <ScoreCell
                        score={c.score}
                        tier={c.tier as TierKey | null}
                      />
                    </div>

                    {/* Reliability cell */}
                    <div style={{ flex: "2.4 1 0", minWidth: 0 }}>
                      <ReliabilitySegmented
                        onTime={c.onTime}
                        late={c.late}
                        noShow={c.noShow}
                        voids90d={c.voids90d}
                        total={c.total}
                      />
                    </div>

                    {/* Updated cell */}
                    <div
                      style={{
                        flex: "0 0 100px",
                        textAlign: "right" as const,
                      }}
                    >
                      {c.formattedUpdated ? (
                        <>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#1a1c1b",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {c.formattedUpdated}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#43474f",
                              opacity: 0.65,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            2026
                          </div>
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: 13,
                            color: "#43474f",
                            opacity: 0.5,
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>

                    {/* Details cell */}
                    <div
                      style={{
                        flex: "0 0 84px",
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Link
                        href={`/app/customers/${c.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#001e40",
                          textDecoration: "none",
                          padding: "8px 12px",
                          borderRadius: 9999,
                          border: "1px solid rgba(195,198,209,.4)",
                          background: "#fff",
                        }}
                      >
                        View
                        <Icon name="arrow_forward" size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Tiers explainer — always shown */}
      <TiersExplainer />
    </div>
  );
}
