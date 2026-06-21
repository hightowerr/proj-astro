import * as React from "react";

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** Bold navy field label. */
  label?: React.ReactNode;
  /** Append a rose required dot to the label. @default false */
  required?: boolean;
  /** Muted helper text below the input. */
  help?: React.ReactNode;
  /** Leading Material Symbols icon name. */
  icon?: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  type?: string;
}

/**
 * Labelled text field. White wrap with a hairline border that deepens to a
 * navy ghost border and a raised surface on focus — never a hard four-sided
 * box. Pair with the required dot for mandatory fields.
 */
export function Field(props: FieldProps): React.JSX.Element;
