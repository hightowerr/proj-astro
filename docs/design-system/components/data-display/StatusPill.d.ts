import * as React from "react";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * positive — settled / paid / top. negative — voided / failed / risk.
   * caution — unresolved / pending. neutral — refunded / unpaid.
   * @default "neutral"
   */
  variant?: "positive" | "negative" | "caution" | "neutral";
  /**
   * true (default) renders a tinted uppercase pill; false renders a bare
   * dot + sentence-case label (the "outcome" treatment).
   * @default true
   */
  tinted?: boolean;
  children?: React.ReactNode;
}

/**
 * The Astro status vocabulary — a colored dot + label for appointment
 * outcomes, payment states, and reliability. Status is shown ONLY as small
 * pills/dots, never as fills or full-width banners.
 */
export function StatusPill(props: StatusPillProps): React.JSX.Element;
