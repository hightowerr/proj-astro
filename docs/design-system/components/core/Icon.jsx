import React from "react";

/**
 * Icon — Material Symbols Outlined glyph, the entire Astro icon vocabulary.
 * FILL 0 by default; set `fill` to render the active/emphasis variant.
 */
export function Icon({
  name,
  size = 20,
  fill = false,
  weight = 400,
  color = "currentColor",
  className = "",
  style = {},
  ...rest
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        color,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${fill ? 500 : weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
