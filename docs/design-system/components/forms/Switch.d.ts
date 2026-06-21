import * as React from "react";

export interface SwitchProps {
  /** Controlled on/off state. @default false */
  checked?: boolean;
  /** Fired with the next boolean state on toggle. */
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atelier toggle switch. Track is a hairline when off, navy when on; the
 * white thumb slides 20px in .15s. Use for binary settings (open/closed,
 * enabled/disabled).
 */
export function Switch(props: SwitchProps): React.JSX.Element;
