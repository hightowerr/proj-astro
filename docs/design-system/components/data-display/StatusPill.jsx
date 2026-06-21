import React from "react";

const VARIANTS = {
  positive: { fg: "var(--al-status-positive)", bg: "var(--al-status-positive-bg)" },
  negative: { fg: "var(--al-status-negative)", bg: "var(--al-status-negative-bg)" },
  caution:  { fg: "var(--al-status-caution)",  bg: "var(--al-status-caution-bg)" },
  neutral:  { fg: "var(--al-status-neutral)",  bg: "var(--al-status-neutral-bg)" },
};

/**
 * StatusPill — the status vocabulary: a dot + uppercase label.
 * `tinted` (default) fills the pill bg; set `tinted={false}` for a bare
 * dot+label (the appointments "outcome" treatment).
 */
export function StatusPill({
  children,
  variant = "neutral",
  tinted = true,
  className = "",
  style = {},
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: tinted ? 5 : 8,
        padding: tinted ? "3px 10px" : 0,
        borderRadius: 9999,
        fontFamily: "var(--al-font)",
        fontSize: tinted ? 10 : 12,
        fontWeight: tinted ? 800 : 700,
        letterSpacing: tinted ? "0.16em" : "normal",
        textTransform: tinted ? "uppercase" : "none",
        background: tinted ? v.bg : "transparent",
        color: v.fg,
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: tinted ? 5 : 6, height: tinted ? 5 : 6, borderRadius: 9999, background: v.fg, flexShrink: 0 }} />
      {children}
    </span>
  );
}
