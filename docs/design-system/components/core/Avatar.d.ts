import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Initials shown when no image is provided, e.g. "SM". */
  initials?: string;
  /** Optional image URL. */
  src?: string;
  /**
   * Reliability tier — drives the gradient. top = navy, risk = terracotta,
   * neutral = flat muted.
   * @default "neutral"
   */
  tier?: "top" | "neutral" | "risk";
  /** Pixel diameter. @default 40 */
  size?: number;
}

/**
 * Circular avatar. Initials on a tier gradient by default (no photography) —
 * top-tier customers get the navy gradient, risk-tier the terracotta one.
 */
export function Avatar(props: AvatarProps): React.JSX.Element;
