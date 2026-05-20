"use client";

import { useState, useCallback, useRef, type CSSProperties } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PaymentPolicyFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    currency: string;
    paymentMode: "deposit" | "full_prepay" | "none";
    depositAmountCents: number;
  };
};

type PaymentMode = "deposit" | "full_prepay" | "none";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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

function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code.toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Mode metadata                                                      */
/* ------------------------------------------------------------------ */

type ModeMeta = {
  icon: string;
  title: string;
  sub: string;
  amountLabel: string;
  helper: string;
  noteIcon: string;
  noteText: string;
  previewUnit: string;
  amountHelper: (symbol: string, code: string) => string;
};

function modeMeta(mode: PaymentMode): ModeMeta {
  switch (mode) {
    case "deposit":
      return {
        icon: "payments",
        title: "Deposit required",
        sub: "Hold a partial amount when booking; charge the balance at the appointment.",
        amountLabel: "Deposit amount",
        helper: "A partial payment is held at the time of booking. The remaining balance is settled at the appointment.",
        previewUnit: "deposit",
        noteIcon: "lightbulb",
        noteText:
          "The deposit is **held** when the customer books and applied toward the final invoice. The balance is settled at the appointment.",
        amountHelper: (symbol, code) =>
          `Held when booking. Example: ${symbol}20.00 = 20 ${code}.`,
      };
    case "full_prepay":
      return {
        icon: "credit_score",
        title: "Full prepayment required",
        sub: "Charge the entire service price when the customer books.",
        amountLabel: "Full payment amount",
        helper: "The full service price is charged when the customer books. No further payment is required at the appointment.",
        previewUnit: "prepayment",
        noteIcon: "lightbulb",
        noteText:
          "The full service amount is **captured** when the customer books. No further charge at the appointment.",
        amountHelper: () => "Charged in full when the customer books.",
      };
    case "none":
      return {
        icon: "block",
        title: "No payment required",
        sub: "Confirm bookings without taking any payment.",
        amountLabel: "",
        helper: "No payment is collected. Bookings are confirmed instantly.",
        previewUnit: "",
        noteIcon: "",
        noteText: "",
        amountHelper: () => "",
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Render bold fragments in note text (markdown **text**)             */
/* ------------------------------------------------------------------ */

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 800, color: "var(--al-primary)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/* ------------------------------------------------------------------ */
/*  Material Symbol helper                                             */
/* ------------------------------------------------------------------ */

function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        lineHeight: 1,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared style fragments                                             */
/* ------------------------------------------------------------------ */

const FONT_MAIN = "var(--al-font)";
const FONT_MONO = "var(--font-mono)";
const COLOR_PRIMARY = "var(--al-primary)";
const COLOR_VARIANT = "var(--al-on-surface-variant)";
const BORDER_SOFT = "1px solid rgba(195,198,209,.5)";
const BORDER_GHOST = "1px solid rgba(195,198,209,.40)";
const BORDER_FAINT = "1px solid rgba(195,198,209,.25)";

const sheetStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 24,
  boxShadow: "0 20px 40px rgba(26,28,27,0.04)",
  fontFamily: FONT_MAIN,
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 14,
  padding: "22px 28px",
  borderBottom: BORDER_FAINT,
};

const bodyStyle: CSSProperties = {
  padding: "8px 28px 28px",
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: COLOR_PRIMARY,
  fontFamily: FONT_MAIN,
  display: "flex",
  alignItems: "center",
  gap: 4,
  margin: 0,
};

const inputWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fff",
  border: BORDER_SOFT,
};

const helperStyle: CSSProperties = {
  fontSize: 11,
  color: COLOR_VARIANT,
  opacity: 0.85,
  lineHeight: 1.55,
  marginTop: 6,
  fontFamily: FONT_MAIN,
};

const codeChipStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: FONT_MONO,
  background: "#f4f4f2",
  color: COLOR_PRIMARY,
  padding: "1px 6px",
  borderRadius: 5,
  display: "inline",
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: "rgba(195,198,209,.25)",
  margin: "28px 0",
  border: "none",
};

const redDot = (
  <span
    style={{ color: "#ba1a1a", fontSize: 14, fontWeight: 800, lineHeight: 1 }}
    aria-hidden="true"
  >
    {"\u2022"}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Radio card sub-component                                           */
/* ------------------------------------------------------------------ */

function RadioCard({
  value,
  icon,
  title,
  sub,
  selected,
  onSelect,
}: {
  value: PaymentMode;
  icon: string;
  title: string;
  sub: string;
  selected: boolean;
  onSelect: (v: PaymentMode) => void;
}) {
  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 14,
    background: "#fff",
    border: selected
      ? "1px solid var(--al-primary)"
      : BORDER_GHOST,
    boxShadow: selected
      ? "0 0 0 4px rgba(0,30,64,.06), 0 14px 28px rgba(0,30,64,.08)"
      : "none",
    cursor: "pointer",
    transition: "border .2s ease, box-shadow .2s ease",
    fontFamily: FONT_MAIN,
  };

  const dotOuter: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: selected ? "5px solid var(--al-primary)" : "1.5px solid rgba(195,198,209,.60)",
    background: "#fff",
    marginTop: 2,
    flexShrink: 0,
    boxSizing: "border-box",
    transition: "border .2s ease",
  };

  return (
    <label style={cardStyle}>
      <input
        type="radio"
        name="paymentMode"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        aria-label={title}
      />
      <span style={dotOuter} aria-hidden="true" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon
            name={icon}
            size={16}
            style={{
              color: selected ? COLOR_PRIMARY : COLOR_VARIANT,
              opacity: selected ? 1 : 0.6,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: selected ? COLOR_PRIMARY : COLOR_VARIANT,
              fontFamily: FONT_MAIN,
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: COLOR_VARIANT,
            lineHeight: 1.5,
            opacity: selected ? 1 : 0.75,
            fontFamily: FONT_MAIN,
          }}
        >
          {sub}
        </span>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function PaymentPolicyForm({ action, initial }: PaymentPolicyFormProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initial.paymentMode);
  const [currency, setCurrency] = useState(initial.currency);
  const [amountCents, setAmountCents] = useState(initial.depositAmountCents);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Local text state for the amount input so the user can type "20." */
  const [amountText, setAmountText] = useState(
    initial.depositAmountCents > 0
      ? (initial.depositAmountCents / 100).toFixed(2)
      : ""
  );

  /* Track dirty / saved state for the save row indicator */
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isDirty =
    paymentMode !== initial.paymentMode ||
    currency !== initial.currency ||
    amountCents !== initial.depositAmountCents;

  const formRef = useRef<HTMLFormElement>(null);

  /* Commit the text value to cents on blur */
  const commitAmount = useCallback((raw: string) => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      const cents = Math.round(parsed * 100);
      setAmountCents(cents);
      setAmountText(parsed.toFixed(2));
    } else if (raw === "") {
      setAmountCents(0);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("currency", currency.toUpperCase());
      fd.append("paymentMode", paymentMode);
      fd.append(
        "depositAmount",
        paymentMode === "none" ? "0" : (amountCents / 100).toFixed(2)
      );
      await action(fd);
      setLastSaved(new Date());
    } finally {
      setIsSubmitting(false);
    }
  };

  const meta = modeMeta(paymentMode);
  const currencyUpper = currency.toUpperCase();
  const symbol = getCurrencySymbol(currencyUpper);
  const showAmount = paymentMode !== "none";

  /* Format preview amount */
  const previewAmount =
    amountCents > 0
      ? `${symbol}${(amountCents / 100).toFixed(2)}`
      : `${symbol}0.00`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={sheetStyle}>
      {/* ── Sheet header ──────────────────────────────────── */}
      <div style={headerStyle}>
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLOR_VARIANT,
              opacity: 0.55,
              margin: 0,
              fontFamily: FONT_MAIN,
            }}
          >
            Base policy
          </p>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: COLOR_PRIMARY,
              margin: "4px 0 0",
              fontFamily: FONT_MAIN,
            }}
          >
            What every customer pays
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <Icon
            name="policy"
            size={14}
            style={{ color: COLOR_VARIANT, opacity: 0.7 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLOR_VARIANT,
              opacity: 0.7,
              fontFamily: FONT_MAIN,
            }}
          >
            Applied to every booking unless a tier override matches.
          </span>
        </div>
      </div>

      {/* ── Sheet body ────────────────────────────────────── */}
      <div style={bodyStyle}>
        {/* Top row — Currency + Preview ─────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 32,
            paddingTop: 20,
          }}
        >
          {/* Left: Currency field */}
          <div>
            <label style={labelStyle}>
              Currency {redDot}
            </label>
            <div style={{ ...inputWrapStyle, marginTop: 8 }}>
              <Icon
                name="payments"
                size={16}
                style={{ color: COLOR_VARIANT, opacity: 0.6, flexShrink: 0 }}
              />
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                required
                aria-label="Currency code"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontFamily: FONT_MONO,
                  fontWeight: 600,
                  fontSize: 14,
                  color: COLOR_PRIMARY,
                  padding: 0,
                  minWidth: 0,
                }}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: FONT_MONO,
                  color: COLOR_PRIMARY,
                  flexShrink: 0,
                }}
              >
                {symbol}
              </span>
            </div>
            <p style={helperStyle}>
              3-letter currency code (ISO 4217), for example{" "}
              <code style={codeChipStyle}>USD</code>,{" "}
              <code style={codeChipStyle}>GBP</code>, or{" "}
              <code style={codeChipStyle}>EUR</code>.
            </p>
          </div>

          {/* Right: Customer-facing preview */}
          <div
            style={{
              background: "linear-gradient(160deg, #f9f9f7 0%, #f4f4f2 100%)",
              borderRadius: 16,
              padding: "18px 20px",
              border: "1px solid rgba(195,198,209,.30)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 10,
              }}
            >
              <Icon
                name="storefront"
                size={14}
                style={{ color: COLOR_VARIANT, opacity: 0.65 }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: COLOR_VARIANT,
                  opacity: 0.65,
                  fontFamily: FONT_MAIN,
                }}
              >
                Customer-facing preview
              </span>
            </div>

            {paymentMode === "none" ? (
              <>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    color: COLOR_PRIMARY,
                    fontFamily: FONT_MAIN,
                    lineHeight: 1.1,
                  }}
                >
                  No payment
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: COLOR_VARIANT,
                    opacity: 0.85,
                    lineHeight: 1.55,
                    marginTop: 6,
                    fontFamily: FONT_MAIN,
                  }}
                >
                  Booking confirmed instantly, nothing charged.
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    fontFamily: FONT_MONO,
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                    color: COLOR_PRIMARY,
                    lineHeight: 1.1,
                  }}
                >
                  {previewAmount}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: COLOR_VARIANT,
                    opacity: 0.6,
                    marginTop: 4,
                    fontFamily: FONT_MAIN,
                  }}
                >
                  {meta.previewUnit} &middot; {currencyUpper}
                </span>
              </>
            )}

            <span
              style={{
                fontSize: 12,
                color: COLOR_VARIANT,
                opacity: 0.85,
                lineHeight: 1.55,
                marginTop: 8,
                fontFamily: FONT_MAIN,
              }}
            >
              {meta.helper}
            </span>
          </div>
        </div>

        {/* Soft divider ─────────────────────────────────── */}
        <hr style={dividerStyle} />

        {/* Payment mode ─────────────────────────────────── */}
        <div>
          <p style={labelStyle}>
            Payment mode {redDot}
          </p>
          <p
            style={{
              fontSize: 12,
              color: COLOR_VARIANT,
              opacity: 0.75,
              margin: "4px 0 12px",
              fontFamily: FONT_MAIN,
            }}
          >
            How much you collect at the time of booking.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
            }}
          >
            <RadioCard
              value="deposit"
              icon="payments"
              title="Deposit required"
              sub="Hold a partial amount when booking; charge the balance at the appointment."
              selected={paymentMode === "deposit"}
              onSelect={setPaymentMode}
            />
            <RadioCard
              value="full_prepay"
              icon="credit_score"
              title="Full prepayment required"
              sub="Charge the entire service price when the customer books."
              selected={paymentMode === "full_prepay"}
              onSelect={setPaymentMode}
            />
            <RadioCard
              value="none"
              icon="block"
              title="No payment required"
              sub="Confirm bookings without taking any payment."
              selected={paymentMode === "none"}
              onSelect={setPaymentMode}
            />
          </div>
        </div>

        {/* Conditional amount block ─────────────────────── */}
        <div
          style={{
            maxHeight: showAmount ? 200 : 0,
            opacity: showAmount ? 1 : 0,
            overflow: "hidden",
            marginTop: showAmount ? 28 : 0,
            transition:
              "max-height .35s ease, opacity .25s ease, margin-top .25s ease",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr",
              gap: 32,
            }}
          >
            {/* Left — Amount input */}
            <div>
              <label style={labelStyle}>
                {meta.amountLabel} {redDot}
              </label>
              <div style={{ ...inputWrapStyle, marginTop: 8 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: FONT_MONO,
                    color: showAmount ? COLOR_PRIMARY : COLOR_VARIANT,
                    opacity: showAmount ? 1 : 0.4,
                    flexShrink: 0,
                  }}
                >
                  {symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountText}
                  onChange={(e) => {
                    /* Allow digits, one dot, and up to 2 decimals */
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(v) || v === "") {
                      setAmountText(v);
                      /* Live-update cents for the preview */
                      const parsed = parseFloat(v);
                      if (!isNaN(parsed)) setAmountCents(Math.round(parsed * 100));
                    }
                  }}
                  onBlur={() => commitAmount(amountText)}
                  disabled={!showAmount}
                  aria-label={meta.amountLabel}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: FONT_MONO,
                    fontSize: 16,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: COLOR_PRIMARY,
                    padding: 0,
                    minWidth: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: COLOR_VARIANT,
                    opacity: 0.55,
                    flexShrink: 0,
                    fontFamily: FONT_MAIN,
                  }}
                >
                  {currencyUpper}
                </span>
              </div>
              <p style={helperStyle}>
                {meta.amountHelper(symbol, currencyUpper)}
              </p>
            </div>

            {/* Right — Mode note card */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 10,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(0,30,64,0.04)",
                border: "1px solid rgba(0,30,64,0.10)",
                fontSize: 12,
                color: COLOR_VARIANT,
                lineHeight: 1.55,
                fontFamily: FONT_MAIN,
                alignItems: "flex-start",
              }}
            >
              <Icon
                name="lightbulb"
                size={14}
                style={{
                  color: COLOR_PRIMARY,
                  opacity: 0.7,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span>{renderBold(meta.noteText)}</span>
            </div>
          </div>
        </div>

        {/* Soft divider ─────────────────────────────────── */}
        <hr style={dividerStyle} />

        {/* Save row ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {/* Left: status indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isDirty
                  ? "var(--al-status-caution)"
                  : "var(--al-status-positive)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: COLOR_VARIANT,
                opacity: 0.85,
                fontFamily: FONT_MAIN,
              }}
            >
              {isDirty ? "Unsaved changes" : "Saved"}
            </span>
            {lastSaved && !isDirty && (
              <span
                style={{
                  fontSize: 11,
                  color: COLOR_VARIANT,
                  opacity: 0.55,
                  fontFamily: FONT_MAIN,
                }}
              >
                {lastSaved.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Right: primary save button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg,#001e40,#003366)",
              color: "#fff",
              padding: "13px 20px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT_MAIN,
              border: "none",
              cursor: isSubmitting ? "wait" : "pointer",
              boxShadow: "0 14px 28px rgba(0,30,64,.2)",
              opacity: isSubmitting ? 0.7 : 1,
              transition: "opacity .2s ease",
            }}
          >
            <Icon name="check" size={16} style={{ color: "#fff" }} />
            {isSubmitting ? "Saving\u2026" : "Save policy"}
          </button>
        </div>
      </div>
    </form>
  );
}
