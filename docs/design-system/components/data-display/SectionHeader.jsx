import React from "react";

/**
 * SectionHeader — the eyebrow + title + lede stack that opens every sheet
 * and page section. The eyebrow is the most repeated motif in the system.
 */
export function SectionHeader({ eyebrow, title, lede, as = "h3", className = "", style = {}, ...rest }) {
  const Title = as;
  return (
    <div className={className} style={style} {...rest}>
      {eyebrow ? (
        <div
          style={{
            fontFamily: "var(--al-font)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--al-on-surface-variant)",
            opacity: 0.55,
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <Title
        style={{
          margin: 0,
          fontFamily: "var(--al-font)",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--al-primary)",
        }}
      >
        {title}
      </Title>
      {lede ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--al-font)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--al-on-surface-variant)",
            lineHeight: 1.5,
          }}
        >
          {lede}
        </div>
      ) : null}
    </div>
  );
}
