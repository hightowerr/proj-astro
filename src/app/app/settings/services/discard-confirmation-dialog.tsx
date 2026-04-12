"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DiscardConfirmationDialogProps = {
  open: boolean;
  variant: "discard" | "restore-current";
  onKeepEditing: () => void;
  onConfirm: () => void;
};

export function DiscardConfirmationDialog({
  open,
  variant,
  onKeepEditing,
  onConfirm,
}: DiscardConfirmationDialogProps) {
  const title =
    variant === "restore-current"
      ? "Restore service and discard edits?"
      : "Discard unsaved changes?";
  const description =
    variant === "restore-current"
      ? "Your unsaved edits will be replaced with the restored values."
      : "Your unsaved changes will be lost.";
  const confirmLabel =
    variant === "restore-current" ? "Restore service" : "Discard changes";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onKeepEditing()}>
      <DialogContent
        className="max-w-sm rounded-[24px] border-0 p-6"
        showCloseButton={false}
        style={{
          background: "color-mix(in srgb, var(--al-surface) 88%, white 12%)",
          boxShadow: "var(--al-shadow-float)",
        }}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle
            className="text-balance font-[family-name:var(--al-font-headline)] text-xl font-semibold"
            style={{ color: "var(--al-primary)" }}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            className="text-pretty text-sm"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button onClick={onKeepEditing} type="button" variant="al-secondary">
            Keep editing
          </Button>
          <Button onClick={onConfirm} type="button" variant="al-primary">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
