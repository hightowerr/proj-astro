import React from "react";

/**
 * Switch — the Atelier toggle. Track flips from hairline to navy when checked;
 * the white thumb slides 20px. Controlled via `checked` + `onChange`.
 */
export function Switch({ checked = false, onChange, disabled = false, className = "", style = {}, ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={className}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        flexShrink: 0,
        borderRadius: 9999,
        border: 0,
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--al-primary)" : "var(--al-outline-variant)",
        transition: "background var(--al-dur-fast) var(--al-ease)",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          borderRadius: 9999,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform var(--al-dur-fast) var(--al-ease)",
        }}
      />
    </button>
  );
}
