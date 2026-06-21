import * as React from "react";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Uppercase eyebrow — 10px / 800 / .2em tracking / muted @ .55. */
  eyebrow?: string;
  /** Section title — 24px / 800 / navy. */
  title: React.ReactNode;
  /** Optional supporting lede in muted body. */
  lede?: React.ReactNode;
  /** Heading element for the title. @default "h3" */
  as?: "h1" | "h2" | "h3" | "h4";
}

/**
 * Eyebrow + title + lede stack that opens every sheet and section. The
 * eyebrow motif (10px/800/.2em/UPPER/muted) is a brand non-negotiable.
 */
export function SectionHeader(props: SectionHeaderProps): React.JSX.Element;
