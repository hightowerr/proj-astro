import React from "react";
import { Icon } from "../core/Icon.jsx";

/**
 * Field — label + bordered input wrap + optional help. Forgoes the four-sided
 * box feel with a soft white wrap and a hairline border that deepens on focus.
 */
export function Field({
  label,
  required = false,
  help,
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label className={className} style={{ display: "block", ...style }}>
      {label ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--al-font)",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--al-primary)",
            marginBottom: 8,
          }}
        >
          {label}
          {required ? <span style={{ color: "var(--al-status-negative)" }}>•</span> : null}
        </span>
      ) : null}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: focused ? "var(--al-surface-container-high)" : "#fff",
          border: `1px solid ${focused ? "rgba(0,30,64,.20)" : "var(--al-hairline-strong)"}`,
          transition: "background var(--al-dur-fast) var(--al-ease), border-color var(--al-dur-fast) var(--al-ease)",
        }}
      >
        {icon ? <Icon name={icon} size={18} color="var(--al-on-surface-variant)" /> : null}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: "none",
            background: "transparent",
            fontFamily: "var(--al-font)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--al-primary)",
          }}
          {...rest}
        />
      </span>
      {help ? (
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontFamily: "var(--al-font)",
            fontSize: 12,
            color: "var(--al-on-surface-variant)",
            opacity: 0.75,
          }}
        >
          {help}
        </span>
      ) : null}
    </label>
  );
}
