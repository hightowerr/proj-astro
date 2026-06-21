import * as React from "react";

export interface FilterOption {
  key: string;
  label: string;
}

export interface FilterPillsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Options as strings or {key,label} objects. */
  options: Array<string | FilterOption>;
  /** Currently selected key. */
  value: string;
  /** Fired with the next key. */
  onChange?: (key: string) => void;
  /** Optional map of key → count, appended to the active pill as "· N". */
  counts?: Record<string, number>;
}

/**
 * Segmented filter row. The active pill fills navy; others are transparent
 * with muted text (no hover style by brand convention). Appends a count to
 * the active pill when `counts` is provided.
 */
export function FilterPills(props: FilterPillsProps): React.JSX.Element;
