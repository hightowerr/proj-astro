import React from "react";
import { SectionHeader } from "./SectionHeader.jsx";

/**
 * Sheet — the one elevation. A white card on the soft float shadow, radius 24.
 * Optional header (eyebrow + title + lede) and trailing action slot.
 */
export function Sheet({
  children,
  eyebrow,
  title,
  lede,
  action,
  padded = true,
  className = "",
  style = {},
  ...rest
}) {
  const hasHeader = eyebrow || title || lede || action;
  return (
    <section
      className={className}
      style={{
        background: "var(--al-surface-container-lowest)",
        borderRadius: 24,
        boxShadow: "var(--al-shadow-float)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {hasHeader ? (
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "24px 28px 18px",
          }}
        >
          <SectionHeader eyebrow={eyebrow} title={title} lede={lede} />
          {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
        </header>
      ) : null}
      <div style={{ padding: padded ? (hasHeader ? "0 28px 28px" : "28px") : 0 }}>
        {children}
      </div>
    </section>
  );
}
