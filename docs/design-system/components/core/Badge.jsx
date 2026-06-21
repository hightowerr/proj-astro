import React from "react";

const VARIANTS = {
  primary:   { background: "var(--al-primary)",              color: "var(--al-on-primary)" },
  secondary: { background: "var(--al-secondary-container)",  color: "var(--al-on-secondary-container)" },
  curator:   { background: "var(--al-secondary-fixed)",      color: "var(--al-on-secondary-fixed)" },
  muted:     { background: "var(--al-surface-container)",    color: "var(--al-on-surface-variant)" },
  outline:   { background: "transparent", color: "var(--al-on-surface-variant)", border: "1px solid var(--al-outline-variant)" },
};

/**
 * Badge — small pill label. `curator` is the signature filter/category chip
 * (terracotta-fixed); `muted` for counts; `outline` for quiet metadata.
 */
export function Badge({ children, variant = "muted", className = "", style = {}, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.muted;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        fontFamily: "var(--al-font)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.01em",
        border: v.border || "1px solid transparent",
        ...v,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
