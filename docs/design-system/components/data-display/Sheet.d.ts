import * as React from "react";

/**
 * The one card elevation in Astro.
 * @startingPoint section="Surfaces" subtitle="The one card elevation, with optional header" viewport="700x360"
 */
export interface SheetProps extends React.HTMLAttributes<HTMLElement> {
  /** Optional header eyebrow. */
  eyebrow?: string;
  /** Optional header title. */
  title?: React.ReactNode;
  /** Optional header lede. */
  lede?: React.ReactNode;
  /** Trailing header slot — e.g. a Button or sort control. */
  action?: React.ReactNode;
  /** Pad the body. Set false for full-bleed content like tables. @default true */
  padded?: boolean;
  children?: React.ReactNode;
}

/**
 * The one elevation in Astro — a white sheet on the single soft float shadow
 * (radius 24). No hover lift; separation elsewhere is done with hairlines.
 * Use `padded={false}` when the body is a full-bleed table.
 */
export function Sheet(props: SheetProps): React.JSX.Element;
