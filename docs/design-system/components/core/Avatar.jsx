import React from "react";

const TIER_BG = {
  top:     "var(--al-gradient-avatar-top)",
  risk:    "var(--al-gradient-avatar-std)",
  neutral: "var(--al-surface-container)",
};
const TIER_FG = {
  top:     "var(--al-primary)",
  risk:    "var(--al-tertiary-container)",
  neutral: "var(--al-on-surface-variant)",
};

/**
 * Avatar — initials on a tier-colored gradient. No photography by default;
 * pass `src` for a real image. Top tier = navy gradient, risk = terracotta.
 */
export function Avatar({
  initials,
  src,
  tier = "neutral",
  size = 40,
  className = "",
  style = {},
  ...rest
}) {
  const base = {
    width: size,
    height: size,
    borderRadius: 9999,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    fontFamily: "var(--al-font)",
    fontSize: Math.round(size * 0.34),
    fontWeight: 800,
    letterSpacing: "0.04em",
    background: TIER_BG[tier] || TIER_BG.neutral,
    color: TIER_FG[tier] || TIER_FG.neutral,
    ...style,
  };
  return (
    <span className={className} style={base} {...rest}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </span>
  );
}
