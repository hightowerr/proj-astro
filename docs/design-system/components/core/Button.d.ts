import * as React from "react";

/**
 * Astro button — primary is always the navy gradient CTA.
 * @startingPoint section="Core" subtitle="Navy-gradient CTA + terracotta & ghost variants" viewport="700x300"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary — navy gradient CTA (the only sanctioned CTA treatment).
   * secondary — soft terracotta fill. ghost — white with a hairline border.
   * @default "primary"
   */
  variant?: "primary" | "secondary" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Material Symbols name rendered before the label. */
  icon?: string;
  /** Material Symbols name rendered after the label. */
  iconRight?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Astro button. Primary is always the navy gradient — never a flat or
 * alternate-color fill. Secondary uses rationed terracotta; ghost is a
 * hairline-bordered white control.
 */
export function Button(props: ButtonProps): React.JSX.Element;
