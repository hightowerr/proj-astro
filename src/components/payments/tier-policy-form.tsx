"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TierPolicyFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    riskDepositAmountCents: number | null;
    topDepositWaived: boolean;
    topDepositAmountCents: number | null;
    excludeRiskFromOffers: boolean;
    excludeHighNoShowFromOffers: boolean;
    baseDepositAmountCents: number | null;
    /** ISO-4217 currency code used for formatting. Defaults to "USD". */
    currency?: string;
    /** Base payment mode from the parent policy. Defaults to "deposit". */
    basePaymentMode?: "deposit" | "full_prepay" | "none";
  };
};

type Tier = "risk" | "top";

type TierState = {
  riskDepositCents: number | null;
  topDepositWaived: boolean;
  topDepositAmountCents: number | null;
  excludeRiskFromOffers: boolean;
  excludeHighNoShowFromOffers: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT = "var(--al-font)";
const MONO = "var(--al-font-mono)";

const TIER_COLORS = {
  risk: {
    bg: "rgba(168,41,74,0.10)",
    fg: "#a8294a",
    dot: "#a8294a",
  },
  top: {
    bg: "rgba(14,122,85,0.10)",
    fg: "#0e7a55",
    dot: "#0e7a55",
  },
  neutral: {
    bg: "#eeeeec",
    fg: "#43474f",
    dot: "#737780",
  },
} as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  CNY: "\u00A5",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] || code || "";
}

function formatMajor(cents: number | null, code: string): string {
  if (cents == null || isNaN(cents)) return "\u2014";
  const sym = currencySymbol(code);
  const n = (cents / 100).toFixed(2);
  return code === "JPY" ? `${sym}${Math.round(cents / 100)}` : `${sym}${n}`;
}

// ---------------------------------------------------------------------------
// Icon -- Material Symbols Outlined helper
// ---------------------------------------------------------------------------

function Icon({
  name,
  size = 16,
  color,
  style: extraStyle,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: size,
        color,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        ...extraStyle,
      }}
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TierBadge
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: Tier | "neutral" }) {
  const c = TIER_COLORS[tier];
  const label = tier === "risk" ? "RISK" : tier === "top" ? "TOP" : "NEUTRAL";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 11px",
        borderRadius: 9999,
        background: c.bg,
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: c.fg,
        lineHeight: 1.4,
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BeforeAfterCompare
// ---------------------------------------------------------------------------

function BeforeAfterCompare({
  label,
  baseCents,
  baseMode,
  currency,
  override,
  tier,
  waived = false,
}: {
  label: string;
  baseCents: number | null;
  baseMode: string;
  currency: string;
  override: number | null;
  tier: Tier;
  waived?: boolean;
}) {
  const tierFg = TIER_COLORS[tier].fg;
  const hasOverride = override !== null;
  const showStrikethrough = baseMode !== "none" && (hasOverride || waived);

  // Determine the effective amount display
  let effectiveText: string;
  let effectiveColor: string;

  if (waived) {
    effectiveText = "Waived";
    effectiveColor = "#0e7a55";
  } else if (baseMode === "none") {
    effectiveText = "\u2014";
    effectiveColor = "#43474f";
  } else if (hasOverride) {
    effectiveText = formatMajor(override, currency);
    effectiveColor = tierFg;
  } else {
    effectiveText = formatMajor(baseCents, currency);
    effectiveColor = tierFg;
  }

  // Build footer message
  let footer: string;
  if (baseMode === "none") {
    footer =
      "Base policy charges nothing. Tier overrides have no effect while the base mode is \u2018No payment\u2019.";
  } else if (waived) {
    footer = "No charge at booking. Customer pays at the appointment.";
  } else if (!hasOverride) {
    footer = "Same as base policy.";
  } else {
    // Show delta vs base
    const delta = override! - (baseCents ?? 0);
    const sign = delta >= 0 ? "+" : "\u2212";
    footer = `${sign}${formatMajor(Math.abs(delta), currency)} vs base`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 18,
        background: "#f9f9f7",
        borderRadius: 14,
        border: "1px solid rgba(195,198,209,.30)",
        minHeight: 132,
      }}
    >
      {/* Label row */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "rgba(67,71,79,0.65)",
          fontFamily: FONT,
        }}
      >
        {label}
      </span>

      {/* Amount row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Base amount (with or without strikethrough) */}
        {baseMode !== "none" && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: MONO,
              fontVariantNumeric: "tabular-nums",
              color: "rgba(67,71,79,0.55)",
              textDecoration: showStrikethrough ? "line-through" : "none",
              textDecorationColor: showStrikethrough
                ? "rgba(115,119,128,.6)"
                : undefined,
            }}
          >
            {formatMajor(baseCents, currency)}
          </span>
        )}

        {/* Effective amount */}
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: MONO,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            color: effectiveColor,
          }}
        >
          {effectiveText}
        </span>
      </div>

      {/* Footer */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(67,71,79,0.70)",
          lineHeight: 1.5,
          marginTop: "auto",
          fontFamily: FONT,
        }}
      >
        {footer}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CentsField
// ---------------------------------------------------------------------------

function CentsField({
  id,
  label,
  valueCents,
  onChange,
  helper,
  disabled = false,
  currency,
}: {
  id: string;
  label: string;
  valueCents: number | null;
  onChange: (v: number | null) => void;
  helper?: ReactNode;
  disabled?: boolean;
  currency: string;
}) {
  // Keep a local string so the user can freely type without cursor jumps
  const [text, setText] = useState<string>(
    valueCents != null ? String(valueCents) : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only digits and empty
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    setText(raw);
    const parsed = parseInt(raw, 10);
    onChange(isNaN(parsed) ? null : parsed);
  };

  const approx =
    valueCents != null && !isNaN(valueCents)
      ? formatMajor(valueCents, currency)
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#001e40",
            fontFamily: FONT,
            marginBottom: 8,
          }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: disabled ? "#f4f4f2" : "#fff",
          border: disabled
            ? "1px solid rgba(195,198,209,.30)"
            : "1px solid rgba(195,198,209,.45)",
          transition: "border-color 0.15s",
        }}
      >
        <Icon
          name="paid"
          size={15}
          style={{
            color: disabled
              ? "rgba(67,71,79,0.30)"
              : "rgba(67,71,79,0.55)",
          }}
        />

        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={handleChange}
          disabled={disabled}
          placeholder="\u2014"
          style={{
            flex: 1,
            fontFamily: MONO,
            fontSize: 15,
            fontWeight: 700,
            color: disabled ? "rgba(67,71,79,0.40)" : "#001e40",
            background: "transparent",
            border: "none",
            outline: "none",
            minWidth: 0,
            padding: 0,
          }}
        />

        {/* Trailing unit tag */}
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              fontFamily: MONO,
              color: "#001e40",
            }}
          >
            cents
          </span>
          {approx && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(67,71,79,0.55)",
                fontFamily: MONO,
              }}
            >
              &asymp; {approx}
            </span>
          )}
        </span>
      </div>

      {helper && (
        <div
          style={{
            fontSize: 12,
            color: "rgba(67,71,79,0.75)",
            lineHeight: 1.5,
            marginTop: 8,
            fontFamily: FONT,
          }}
        >
          {helper}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckBox
// ---------------------------------------------------------------------------

function CheckBox({
  id,
  checked,
  onChange,
  label,
  sub,
  accent = "#001e40",
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        padding: "12px 14px",
        borderRadius: 12,
        background: checked ? "rgba(0,30,64,0.04)" : "transparent",
        border: checked
          ? "1px solid rgba(0,30,64,0.20)"
          : "1px solid rgba(195,198,209,.35)",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Hidden native + custom box */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          background: checked ? accent : "#fff",
          border: checked ? "none" : "1.5px solid rgba(195,198,209,.7)",
          transition: "background 0.15s",
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path
              d="M1 4.5L4 7.5L10 1"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <span style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: checked ? accent : "#1a1c1b",
            fontFamily: FONT,
            lineHeight: 1.4,
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 12,
              color: "#43474f",
              lineHeight: 1.5,
              marginTop: 3,
              opacity: 0.85,
              fontFamily: FONT,
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// TierPolicyForm (main export)
// ---------------------------------------------------------------------------

export function TierPolicyForm({ action, initial }: TierPolicyFormProps) {
  const currency = initial.currency ?? "USD";
  const baseMode = initial.basePaymentMode ?? "deposit";
  const baseDepositAmountCents = initial.baseDepositAmountCents;

  // Controlled state for all tier fields
  const [tiers, setTiers] = useState<TierState>({
    riskDepositCents: initial.riskDepositAmountCents,
    topDepositWaived: initial.topDepositWaived,
    topDepositAmountCents: initial.topDepositAmountCents,
    excludeRiskFromOffers: initial.excludeRiskFromOffers,
    excludeHighNoShowFromOffers: initial.excludeHighNoShowFromOffers,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track dirty state by comparing to initial values
  const isDirty = useMemo(() => {
    return (
      tiers.riskDepositCents !== initial.riskDepositAmountCents ||
      tiers.topDepositWaived !== initial.topDepositWaived ||
      tiers.topDepositAmountCents !== initial.topDepositAmountCents ||
      tiers.excludeRiskFromOffers !== initial.excludeRiskFromOffers ||
      tiers.excludeHighNoShowFromOffers !== initial.excludeHighNoShowFromOffers
    );
  }, [tiers, initial]);

  const updateTier = useCallback(
    <K extends keyof TierState>(key: K, value: TierState[K]) => {
      setTiers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();

      // riskDepositAmountCents: string number or empty
      if (tiers.riskDepositCents != null) {
        fd.set("riskDepositAmountCents", String(tiers.riskDepositCents));
      } else {
        fd.set("riskDepositAmountCents", "");
      }

      // topDepositAmountCents: string number or empty
      if (tiers.topDepositAmountCents != null) {
        fd.set("topDepositAmountCents", String(tiers.topDepositAmountCents));
      } else {
        fd.set("topDepositAmountCents", "");
      }

      // Checkboxes: "on" when true (server checks for "on")
      if (tiers.topDepositWaived) fd.set("topDepositWaived", "on");
      if (tiers.excludeRiskFromOffers) fd.set("excludeRiskFromOffers", "on");
      if (tiers.excludeHighNoShowFromOffers)
        fd.set("excludeHighNoShowFromOffers", "on");

      await action(fd);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#fff",
        borderRadius: 24,
        boxShadow: "0 20px 40px rgba(26,28,27,0.04)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* ---- Sheet header ------------------------------------------------ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "22px 28px",
          borderBottom: "1px solid rgba(195,198,209,.20)",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "rgba(67,71,79,0.55)",
            }}
          >
            Tier-based overrides
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#001e40",
              lineHeight: 1.3,
            }}
          >
            Adjust by reliability
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0",
          }}
        >
          <Icon name="tune" size={16} color="rgba(67,71,79,0.55)" />
          <span
            style={{
              fontSize: 12,
              color: "rgba(67,71,79,0.65)",
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            Optional. Skip any field to fall back to the base policy.
          </span>
        </div>
      </div>

      {/* ---- RISK TIER BLOCK --------------------------------------------- */}
      <div style={{ paddingTop: 8 }}>
        {/* Block header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "22px 28px 16px",
          }}
        >
          <TierBadge tier="risk" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#001e40",
                lineHeight: 1.3,
              }}
            >
              Charge more from high-risk customers
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#43474f",
                opacity: 0.85,
                lineHeight: 1.5,
              }}
            >
              Applies to customers with a low reliability score or multiple
              recent voids.
            </span>
          </div>
        </div>

        {/* Two-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 32,
            padding: "4px 28px 24px",
          }}
        >
          <CentsField
            id="risk-deposit"
            label="Risk tier deposit amount"
            valueCents={tiers.riskDepositCents}
            onChange={(v) => updateTier("riskDepositCents", v)}
            currency={currency}
            helper={
              <>
                Leave blank to use the base policy amount{" "}
                <strong>({formatMajor(baseDepositAmountCents, currency)})</strong>.
                Specified in cents to avoid floating-point rounding.
              </>
            }
          />
          <BeforeAfterCompare
            label="Risk customer pays"
            baseCents={baseDepositAmountCents}
            baseMode={baseMode}
            currency={currency}
            override={tiers.riskDepositCents}
            tier="risk"
          />
        </div>
      </div>

      {/* ---- Divider ------------------------------------------------------ */}
      <div style={{ height: 1, background: "rgba(195,198,209,.20)" }} />

      {/* ---- TOP TIER BLOCK ---------------------------------------------- */}
      <div>
        {/* Block header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "22px 28px 16px",
          }}
        >
          <TierBadge tier="top" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#001e40",
                lineHeight: 1.3,
              }}
            >
              Reward your most reliable customers
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#43474f",
                opacity: 0.85,
                lineHeight: 1.5,
              }}
            >
              Applies to top-tier customers (score &ge; 80, no recent voids).
            </span>
          </div>
        </div>

        {/* Two-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 32,
            padding: "4px 28px 24px",
          }}
        >
          {/* Left column: checkbox + cents field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <CheckBox
              id="top-waive"
              checked={tiers.topDepositWaived}
              onChange={(v) => updateTier("topDepositWaived", v)}
              label="Waive deposit for top tier customers"
              sub="When enabled, top-tier customers can book without any deposit. Disables the override amount below."
              accent="#0e7a55"
            />
            <CentsField
              id="top-deposit"
              label="Top tier deposit amount"
              valueCents={tiers.topDepositAmountCents}
              onChange={(v) => updateTier("topDepositAmountCents", v)}
              disabled={tiers.topDepositWaived}
              currency={currency}
              helper={
                tiers.topDepositWaived ? (
                  <span style={{ color: "#0e7a55" }}>
                    Disabled &mdash; top-tier deposit is waived. Uncheck above
                    to set a custom amount.
                  </span>
                ) : (
                  <>
                    Leave blank to use base{" "}
                    <strong>
                      ({formatMajor(baseDepositAmountCents, currency)})
                    </strong>
                    .
                  </>
                )
              }
            />
          </div>

          {/* Right column: compare */}
          <BeforeAfterCompare
            label="Top customer pays"
            baseCents={baseDepositAmountCents}
            baseMode={baseMode}
            currency={currency}
            override={
              tiers.topDepositWaived ? 0 : tiers.topDepositAmountCents
            }
            tier="top"
            waived={tiers.topDepositWaived}
          />
        </div>
      </div>

      {/* ---- Divider ------------------------------------------------------ */}
      <div style={{ height: 1, background: "rgba(195,198,209,.20)" }} />

      {/* ---- SLOT RECOVERY OFFERS BLOCK ---------------------------------- */}
      <div>
        {/* Block header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "22px 28px 16px",
          }}
        >
          <Icon name="campaign" size={20} color="#001e40" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#001e40",
                lineHeight: 1.3,
              }}
            >
              Slot recovery offer exclusions
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#43474f",
                opacity: 0.85,
                lineHeight: 1.5,
              }}
            >
              When a customer cancels, Astro can text the open slot to nearby
              customers. Choose who is left out.
            </span>
          </div>
        </div>

        {/* Two-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            padding: "4px 28px 24px",
          }}
        >
          <CheckBox
            id="excl-risk"
            checked={tiers.excludeRiskFromOffers}
            onChange={(v) => updateTier("excludeRiskFromOffers", v)}
            label="Exclude risk tier from offers"
            sub="When enabled, risk-tier customers will not receive last-minute slot offers."
            accent="#a8294a"
          />
          <CheckBox
            id="excl-noshow"
            checked={tiers.excludeHighNoShowFromOffers}
            onChange={(v) => updateTier("excludeHighNoShowFromOffers", v)}
            label="Exclude high no-show customers from offers"
            sub="When enabled, customers with 3 or more no-shows in 90 days are skipped."
            accent="#a8294a"
          />
        </div>
      </div>

      {/* ---- Save row ---------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 28px 24px",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isDirty ? "#c97a2a" : "#0e7a55",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(67,71,79,0.55)",
              fontFamily: FONT,
            }}
          >
            {isDirty ? "SAVE TIER SETTINGS" : "ALL SAVED"}
          </span>
        </div>

        {/* Primary save button */}
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 22px",
            borderRadius: 12,
            border: "none",
            background:
              isSubmitting || !isDirty
                ? "#dadad8"
                : "linear-gradient(135deg, #001e40, #003366)",
            color: isSubmitting || !isDirty ? "rgba(67,71,79,0.50)" : "#fff",
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor: isSubmitting || !isDirty ? "not-allowed" : "pointer",
            transition: "opacity 0.15s",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Saving\u2026" : "Save tier settings"}
          {!isSubmitting && (
            <Icon
              name="check"
              size={16}
              color={!isDirty ? "rgba(67,71,79,0.50)" : "#fff"}
            />
          )}
        </button>
      </div>
    </form>
  );
}
