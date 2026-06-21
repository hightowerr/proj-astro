import React from "react";

/**
 * FilterPills — segmented filter row. Active pill fills navy; an optional
 * count appends as "Label · N". Rounded, borderless, transparent at rest.
 */
export function FilterPills({ options, value, onChange, counts, className = "", style = {}, ...rest }) {
  return (
    <div
      className={className}
      style={{ display: "flex", gap: 4, flexWrap: "wrap", ...style }}
      {...rest}
    >
      {options.map((opt) => {
        const key = typeof opt === "string" ? opt : opt.key;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = value === key;
        const count = counts && counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange && onChange(key)}
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              border: 0,
              background: active ? "var(--al-primary)" : "transparent",
              fontFamily: "var(--al-font)",
              fontSize: 12,
              fontWeight: 700,
              color: active ? "#fff" : "var(--al-on-surface-variant)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              transition: "background var(--al-dur-fast) var(--al-ease), color var(--al-dur-fast) var(--al-ease)",
            }}
          >
            {label}
            {active && count != null ? (
              <span style={{ marginLeft: 6, opacity: 0.6 }}>{"\u00B7"} {count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
