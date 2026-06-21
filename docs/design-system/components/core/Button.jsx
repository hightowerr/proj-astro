import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = {
  sm: { padding: "10px 14px", fontSize: 13, radius: 10 },
  md: { padding: "13px 20px", fontSize: 13, radius: 12 },
  lg: { padding: "15px 26px", fontSize: 14, radius: 12 },
};

function variantStyle(variant, disabled) {
  if (disabled) {
    return {
      background: "var(--al-surface-container-high)",
      color: "var(--al-outline)",
      boxShadow: "none",
      cursor: "not-allowed",
    };
  }
  switch (variant) {
    case "secondary":
      return {
        background: "var(--al-secondary-container)",
        color: "var(--al-on-secondary-container)",
        boxShadow: "none",
      };
    case "ghost":
      return {
        background: "#fff",
        color: "var(--al-on-surface-variant)",
        border: "1px solid var(--al-hairline-strong)",
        boxShadow: "none",
      };
    case "primary":
    default:
      return {
        background: "var(--al-gradient-cta)",
        color: "var(--al-on-primary)",
        boxShadow: "var(--al-shadow-cta)",
      };
  }
}

/**
 * Button — primary CTA (navy gradient), secondary (terracotta), or ghost.
 * Primary is the only sanctioned CTA treatment in Astro.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  className = "",
  style = {},
  ...rest
}) {
  const sz = SIZES[size] || SIZES.md;
  const v = variantStyle(variant, disabled);
  return (
    <button
      className={className}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: sz.padding,
        border: v.border || 0,
        borderRadius: sz.radius,
        fontFamily: "var(--al-font)",
        fontSize: sz.fontSize,
        fontWeight: 700,
        letterSpacing: "0.02em",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity var(--al-dur-fast) var(--al-ease)",
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={sz.fontSize + 5} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={sz.fontSize + 5} /> : null}
    </button>
  );
}
