import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * primary — solid navy. secondary — soft terracotta. curator — the
   * signature category/filter chip (terracotta-fixed). muted — neutral count.
   * outline — quiet hairline metadata.
   * @default "muted"
   */
  variant?: "primary" | "secondary" | "curator" | "muted" | "outline";
  children?: React.ReactNode;
}

/**
 * Pill-shaped label for counts, categories, and metadata. Use `curator` for
 * filter/category chips — it is the brand's signature terracotta chip. Keep
 * terracotta variants rationed to ~one per viewport.
 */
export function Badge(props: BadgeProps): React.JSX.Element;
