import * as React from "react";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols Outlined ligature name, e.g. "calendar_month". */
  name: string;
  /** Pixel size (also drives the optical-size axis). Default 20. */
  size?: number;
  /** Render the filled variant — use for active/selected/emphasis. Default false. */
  fill?: boolean;
  /** Weight axis 100–700. Default 400 (500 when filled). */
  weight?: number;
  /** Glyph color. Default currentColor. */
  color?: string;
}

/**
 * Material Symbols Outlined icon — the only icon system in Astro.
 * No emoji, no bespoke SVG glyphs. Toggle `fill` to signal active state.
 */
export function Icon(props: IconProps): React.JSX.Element;
