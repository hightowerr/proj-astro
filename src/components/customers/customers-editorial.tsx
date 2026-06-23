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

/**
 * Tier visual mapping using AL design-system tokens.
 * Colors reference CSS custom properties so they stay in sync with the theme.
 * `avBg` uses gradients for top/risk tiers — these remain as inline styles
 * because Tailwind cannot generate gradient utility classes from arbitrary
 * multi-stop values at runtime.
 */
const TIERS = {
  top: {
    label: "Top",
    bg: "var(--al-status-positive-bg)",
    fg: "var(--al-status-positive)",
    dot: "var(--al-status-positive)",
    avBg: "linear-gradient(135deg,#d3ead7,#a9d4b3)",
    avFg: "#0e4a31",
  },
  neutral: {
    label: "Neutral",
    bg: "var(--al-surface-container)",
    fg: "var(--al-on-surface-variant)",
    dot: "var(--al-outline)",
    avBg: "var(--al-surface-container)",
    avFg: "var(--al-on-surface-variant)",
  },
  risk: {
    label: "Risk",
    bg: "var(--al-status-negative-bg)",
    fg: "var(--al-status-negative)",
    dot: "var(--al-status-negative)",
    avBg: "linear-gradient(135deg, var(--al-secondary-container), var(--al-secondary-fixed-dim))",
    avFg: "var(--al-tertiary-container)",
  },
} as const;

type TierKey = keyof typeof TIERS;
type TierFilter = "all" | TierKey;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Material Symbols icon wrapper.
 * The base `.material-symbols-outlined` class (defined in globals.css)
 * already sets font-variation-settings, display, and alignment.
 * We only override `FILL` when requested and size via Tailwind text-size.
 */
function Icon({
  name,
  size = 16,
  fill = false,
}: {
  name: string;
  size?: number;
  fill?: boolean;
}) {
  // Map common icon sizes to Tailwind text-size classes
  const sizeClass =
    size <= 14
      ? "text-[14px]"
      : size <= 16
        ? "text-[16px]"
        : size <= 20
          ? "text-xl"
          : size <= 24
            ? "text-2xl"
            : `text-[${size}px]`;

  return (
    <span
      className={`material-symbols-outlined ${sizeClass} ${fill ? "[font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]" : ""}`}
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
      className="grid shrink-0 place-items-center rounded-full font-extrabold tracking-[.04em]"
      style={{
        width: size,
        height: size,
        background: t.avBg,
        color: t.avFg,
        fontSize: Math.round(size * 0.32),
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
  const padClass = size === "sm" ? "px-[9px] py-[3px]" : "px-[10px] py-1";
  const fsClass = size === "sm" ? "text-[9px]" : "text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold uppercase tracking-[.18em] ${padClass} ${fsClass}`}
      style={{ background: t.bg, color: t.fg }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: t.dot }}
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
      <span className="al-num text-sm font-bold text-al-on-surface-variant opacity-50">
        —
      </span>
    );
  }
  const dot = tier ? TIERS[tier].dot : "var(--al-outline)";
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className="al-num text-[28px] font-extrabold leading-none tracking-[-0.03em]"
        style={{ color: tier ? TIERS[tier].fg : "var(--al-on-surface-variant)" }}
      >
        {score}
        <span className="ml-[3px] text-[13px] font-bold text-al-on-surface-variant opacity-55">
          /100
        </span>
      </div>
      <div className="h-1 w-[90px] overflow-hidden rounded-full bg-al-surface-container">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background: dot,
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
      className={`inline-flex items-center gap-[5px] ${dim ? "opacity-55" : ""}`}
    >
      <span
        className="inline-block size-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      {label}{" "}
      <strong
        className="al-num font-extrabold"
        style={{ color: valueColor ?? "var(--al-primary)" }}
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
    <div className="flex min-w-0 flex-col gap-2">
      {/* Segmented bar */}
      <div className="flex h-2 overflow-hidden rounded-full bg-al-surface-container">
        {onTime > 0 && (
          <div
            className="transition-[width] duration-[250ms]"
            style={{
              width: pct(onTime),
              background: "var(--al-status-positive)",
            }}
            title={`On time \u00b7 ${onTime}`}
          />
        )}
        {late > 0 && (
          <div
            className="transition-[width] duration-[250ms]"
            style={{
              width: pct(late),
              background: "var(--al-status-caution)",
            }}
            title={`Late \u00b7 ${late}`}
          />
        )}
        {noShow > 0 && (
          <div
            className="transition-[width] duration-[250ms]"
            style={{
              width: pct(noShow),
              background: "var(--al-status-negative)",
            }}
            title={`No-show \u00b7 ${noShow}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="al-num flex flex-wrap gap-3.5 text-[11px] font-semibold text-al-on-surface-variant">
        <LegendItem
          color="var(--al-status-positive)"
          label="On time"
          value={onTime}
        />
        <LegendItem
          color="var(--al-status-caution)"
          label="Late"
          value={late}
        />
        <LegendItem
          color="var(--al-status-negative)"
          label="No-show"
          value={noShow}
        />
        <LegendItem
          color="var(--al-outline)"
          label="Voids 90d"
          value={voids90d}
          valueColor={
            voids90d >= 2
              ? "var(--al-status-negative)"
              : "var(--al-primary)"
          }
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
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="al-eyebrow">{label}</div>
      <div
        className="al-num mt-1.5 text-[34px] font-extrabold leading-none tracking-[-0.03em]"
        style={{ color: color ?? "var(--al-primary)" }}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-al-on-surface-variant opacity-65">
        {foot}
      </div>
    </div>
  );
}

function SummaryDivider() {
  return (
    <div className="mx-6 w-px self-stretch bg-[var(--al-hairline-rest)]" />
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
    <div className="al-card flex items-stretch rounded-[20px] px-7 py-6">
      <SummaryCell label="Customers" value={total} foot="In registry" />
      <SummaryDivider />
      <SummaryCell
        label="Top tier"
        value={tops}
        foot={`${total ? Math.round((tops / total) * 100) : 0}% of base`}
        color="var(--al-status-positive)"
      />
      <SummaryDivider />
      <SummaryCell
        label="Neutral"
        value={neutral}
        foot="Moderate history"
        color="var(--al-on-surface-variant)"
      />
      <SummaryDivider />
      <SummaryCell
        label="Risk"
        value={risk}
        foot={risk ? "Need attention" : "None flagged"}
        color={
          risk
            ? "var(--al-status-negative)"
            : "var(--al-on-surface-variant)"
        }
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
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5">
      <div className="flex flex-wrap gap-1">
        {opts.map((o) => {
          const isActive = active === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className={`inline-flex cursor-pointer items-center rounded-full border-0 px-3.5 py-2 text-xs font-bold ${
                isActive
                  ? "bg-al-primary text-white"
                  : "bg-transparent text-al-on-surface-variant"
              }`}
            >
              {o.label}
              <span
                className={`ml-1.5 ${isActive ? "opacity-85" : "opacity-55"}`}
              >
                &middot; {counts[o.key]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-al-on-surface-variant opacity-70">
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
    <div className="al-card rounded-3xl px-7 pb-6 pt-7">
      {/* Head */}
      <div className="mb-5 flex items-end justify-between gap-3.5">
        <div>
          <div className="al-eyebrow">Reference</div>
          <div className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-al-primary">
            Understanding tiers
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-al-on-surface-variant opacity-70">
          <Icon name="schedule" size={14} />
          Recomputed nightly &middot; Last 180 days
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-[18px]">
        {rows.map((r) => {
          const t = TIERS[r.tier];
          return (
            <div
              key={r.tier}
              className="rounded-2xl border border-[var(--al-ghost-border)] bg-al-surface px-5 pb-4 pt-[18px]"
            >
              <div className="mb-2.5 flex items-center gap-3">
                <TierPill tier={r.tier} />
                <div className="text-sm font-extrabold tracking-[-0.015em] text-al-primary">
                  {r.title}
                </div>
              </div>
              <div
                className="border-b border-[var(--al-hairline-rest)] pb-2 text-xs font-bold leading-[1.4]"
                style={{ color: t.fg }}
              >
                {r.rule}
              </div>
              <div className="mt-2 text-xs leading-[1.55] text-al-on-surface-variant">
                {r.note}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-[18px] border-t border-[var(--al-hairline-rest)] pt-3.5 text-xs italic text-al-on-surface-variant opacity-75">
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
    <div className="al-card rounded-3xl px-8 pb-14 pt-[72px] text-center">
      {/* Stacked card illustration */}
      <div className="relative mx-auto mb-[22px] flex h-[140px] w-60 items-end justify-center">
        <div className="absolute h-[128px] w-[130px] -translate-x-[22px] translate-y-[6px] -rotate-[7deg] rounded-[14px] border border-[var(--al-hairline-rest)] bg-al-surface-container p-3.5 px-4" />
        <div className="absolute flex h-[128px] w-[130px] flex-col rounded-[14px] border border-[var(--al-hairline-rest)] bg-white p-3.5 px-4 shadow-[0_8px_18px_rgba(26,28,27,.06)]">
          <div className="size-[30px] rounded-full bg-[linear-gradient(135deg,var(--al-secondary-container),var(--al-secondary-fixed-dim))]" />
          <div className="mt-2.5 h-1.5 w-12 rounded-full bg-al-surface-highest" />
          <div className="mt-1.5 h-1.5 w-8 rounded-full bg-al-surface-container" />
        </div>
        <div className="absolute h-[128px] w-[130px] translate-x-[22px] translate-y-[6px] rotate-[7deg] rounded-[14px] border border-[var(--al-hairline-rest)] bg-al-surface-container p-3.5 px-4" />
      </div>

      <div className="text-2xl font-extrabold tracking-[-0.02em] text-al-primary">
        No customers yet
      </div>
      <div className="mx-auto mt-2.5 max-w-[480px] text-sm leading-[1.55] text-al-on-surface-variant">
        Customers appear here once they book through your link. Each entry is
        computed automatically from booking history &mdash; you don&apos;t add
        them manually.
      </div>

      <div className="mx-auto mt-6 flex max-w-[440px] items-center gap-3.5 rounded-[14px] bg-al-surface-low px-4 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="al-eyebrow">Booking link</div>
          <div className="truncate text-sm font-bold text-al-primary">
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
    <div className="flex flex-col gap-6">
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
          <div className="al-card overflow-hidden rounded-3xl">
            {/* Sheet head */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--al-ghost-border)] px-[22px] pb-1.5 pt-[18px]">
              <div className="flex items-baseline gap-3.5">
                <div className="al-eyebrow">Registry</div>
                <div className="al-num text-[13px] font-semibold text-al-on-surface-variant">
                  {filtered.length} of {customers.length} customer
                  {customers.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-[11px] font-bold tracking-[.04em] text-al-on-surface-variant opacity-60">
                Ordered by score &darr;
              </div>
            </div>

            {/* Column hint */}
            <div className="al-eyebrow flex items-center gap-[18px] border-b border-[var(--al-ghost-border)] bg-al-surface px-[22px] py-2.5">
              <div className="min-w-0 flex-[1.7_1_0]">Customer</div>
              <div className="min-w-0 flex-[1_1_0]">Score</div>
              <div className="min-w-0 flex-[2.4_1_0]">
                Reliability &middot; last 180 days
              </div>
              <div className="flex-[0_0_100px] text-right">Updated</div>
              <div className="flex-[0_0_84px] text-right">Details</div>
            </div>

            {/* Empty filter state */}
            {emptyFilterState ? (
              <div className="px-6 py-14 text-center">
                <Icon name="filter_alt_off" size={28} />
                <div className="mt-2.5 text-sm font-extrabold text-al-primary">
                  No customers in this tier
                </div>
                <div className="mt-1 text-xs text-al-on-surface-variant">
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
                    className={`flex items-center gap-[18px] px-[22px] py-[18px] transition-colors duration-[120ms] ${
                      i > 0 ? "border-t border-[var(--al-ghost-border)]" : ""
                    } ${isHovered ? "bg-al-surface" : "bg-transparent"}`}
                    onMouseEnter={() => setHoverRow(c.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    {/* Customer cell */}
                    <div className="flex min-w-0 flex-[1.7_1_0] items-center gap-3.5">
                      <Avatar initials={c.initials} tier={tier} size={42} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="text-[15px] font-extrabold tracking-[-0.015em] text-al-on-surface">
                            {c.fullName}
                          </div>
                          <TierPill tier={tier} size="sm" />
                        </div>
                        <div className="mt-[3px] inline-flex min-w-0 items-center gap-1.5">
                          <span className="inline-flex shrink-0 items-center text-al-on-surface-variant opacity-60">
                            <Icon
                              name={c.email ? "mail" : "phone"}
                              size={14}
                            />
                          </span>
                          <span className="al-num truncate text-[13px] font-medium text-al-on-surface-variant">
                            {c.email || c.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score cell */}
                    <div className="min-w-0 flex-[1_1_0]">
                      <ScoreCell
                        score={c.score}
                        tier={c.tier as TierKey | null}
                      />
                    </div>

                    {/* Reliability cell */}
                    <div className="min-w-0 flex-[2.4_1_0]">
                      <ReliabilitySegmented
                        onTime={c.onTime}
                        late={c.late}
                        noShow={c.noShow}
                        voids90d={c.voids90d}
                        total={c.total}
                      />
                    </div>

                    {/* Updated cell */}
                    <div className="flex-[0_0_100px] text-right">
                      {c.formattedUpdated ? (
                        <>
                          <div className="al-num text-[13px] font-bold text-al-on-surface">
                            {c.formattedUpdated}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-al-on-surface-variant opacity-65">
                            2026
                          </div>
                        </>
                      ) : (
                        <span className="text-[13px] text-al-on-surface-variant opacity-50">
                          —
                        </span>
                      )}
                    </div>

                    {/* Details cell */}
                    <div className="flex flex-[0_0_84px] justify-end">
                      <Link
                        href={`/app/customers/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--al-hairline-strong)] bg-white px-3 py-2 text-[13px] font-bold text-al-primary no-underline"
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
