export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: 0 | 5 | 10 | null;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
  isDefault: boolean;
};

export type ShopContext = {
  slotMinutes: number;
  defaultBufferMinutes: 0 | 5 | 10;
  defaultDepositCents: number | null;
  bookingBaseUrl: string;
};

export type ServiceEditorValues = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number | null;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
};

export type ServiceField = keyof ServiceEditorValues;

export type PendingTarget =
  | { kind: "select"; id: string }
  | { kind: "create" }
  | { kind: "restore"; id: string }
  | { kind: "empty" }
  | null;

export type ConfirmState = {
  open: boolean;
  pendingTarget: PendingTarget;
  variant: "discard" | "restore-current";
};
